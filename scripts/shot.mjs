#!/usr/bin/env node
// One command to screenshot the running app as any signed-in role.
//
//   pnpm shot dashboard                          # named screen, owner session
//   pnpm shot /app/dashboard --as owner          # any path
//   pnpm shot landing dashboard --dark           # several screens, one browser
//   pnpm shot dashboard --do "click:button"      # click through before the shot
//   pnpm shot dashboard --upload                 # public link for phone review
//   pnpm shot --list                             # every named screen
//   pnpm shot --stop                             # stop the background dev server
//
// Three things make "show me the change" slow, so each one is cached here instead
// of repeated: the dev server outlives the command, every role's Clerk session is
// stored on disk, and named screens carry the deep link that reaches them.
import 'dotenv/config'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { chromium } from '@playwright/test'

const ROOT = process.cwd()
const SHOT_DIR = path.join(ROOT, '.shots')
const AUTH_DIR = path.join(SHOT_DIR, 'auth')
const LOCK_FILE = path.join(SHOT_DIR, 'server.json')
const LOG_FILE = path.join(SHOT_DIR, 'dev-server.log')

// Ports 3000-3002 are usually taken by a dev server you started yourself, and that
// server answers on / just like ours would — so the range starts well clear of them.
const PORT_RANGE_START = 4180
const PORT_RANGE_END = 4199
const SERVER_BOOT_TIMEOUT_MS = 240_000
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000

const COLOR_MODE_KEY = 'nuxt-color-mode'
const DESKTOP_VIEWPORT = { width: 1440, height: 900 }
const MOBILE_VIEWPORT = { width: 390, height: 844 }

// Locale and timezone are pinned so a screenshot of a date or a currency looks the
// same on every machine and in CI. Change these to match the product's market.
const LOCALE = 'en-US'
const TIMEZONE = 'UTC'

// Clerk test accounts, matching the table in CLAUDE.md. `anon` is the signed-out
// visitor and needs no entry. Add a role here to make `--as <role>` work.
const ROLES = {
  owner: 'admin+clerk_test@avit.dev'
}

// A named screen is a deep link plus the role that can open it. Add one whenever a
// screenshot needs more than a path to reach — that click sequence is the slow part.
const SCREENS = {
  landing: { path: '/', role: 'anon' },
  dashboard: { path: '/app/dashboard' }
}

const USAGE = `pnpm shot <screen|path> [more ...] [options]

Options
  --as <role>        ${Object.keys(ROLES).join(' | ')} | anon   (default: owner, or the screen's own role)
  --size <WxH>       viewport (default: ${DESKTOP_VIEWPORT.width}x${DESKTOP_VIEWPORT.height})
  --mobile           capture at ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height} with a touch device profile
  --responsive       capture each screen twice: desktop and mobile
  --dark             dark mode
  --full             full-page instead of viewport
  --clip <selector>  screenshot one element only
  --do <action>      act before the shot; repeatable, in order:
                       click:<selector>   text:<visible text>   fill:<selector>=<value>
                       press:<key>        type:<text>           hover:<selector>
                       wait:<selector>    sleep:<ms>            scroll:<selector>
  --relabel <a=>b>   replace the text a with b just before the shot; repeatable
  --name <basename>  output file name
  --out <dir>        output directory (default: .shots)
  --upload           upload each PNG and print a public link
  --port <n>         dev server port
  --base-url <url>   use a server that is already running elsewhere
  --fresh            re-mint the Clerk session instead of reusing the cached one
  --list             print every named screen
  --status           print the managed dev server's state
  --stop             stop the managed dev server`

function fail(message) {
  console.error(message)
  process.exit(1)
}

function startClock() {
  const startedAt = process.hrtime.bigint()
  return () => Number(process.hrtime.bigint() - startedAt) / 1e9
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}s`
}

// Only the phases that cost something are worth reading, so a warm capture prints
// "open 3.9s · shot 0.4s" and a cold one shows where the extra time went.
function describePhases(phases) {
  const parts = Object.entries(phases)
    .filter(([, seconds]) => seconds >= 0.05)
    .map(([name, seconds]) => `${name} ${formatSeconds(seconds)}`)
  return parts.length ? `(${parts.join(' · ')})` : ''
}

function parseArgs(argv) {
  const options = {
    targets: [],
    actions: [],
    role: null,
    viewport: { ...DESKTOP_VIEWPORT },
    isMobile: false,
    isResponsive: false,
    isDark: false,
    isFull: false,
    isUpload: false,
    isFresh: false,
    clip: null,
    relabels: [],
    name: null,
    outDir: SHOT_DIR,
    port: null,
    baseURL: null,
    command: 'capture'
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = () => {
      const value = argv[index + 1]
      if (value === undefined) fail(`${arg} needs a value`)
      index += 1
      return value
    }

    switch (arg) {
      case '--as':
        options.role = next()
        break
      case '--size':
      {
        const [width, height] = next().split('x').map(Number)
        if (!width || !height) fail('--size wants WxH, e.g. 1440x900')
        options.viewport = { width, height }
        break
      }
      case '--mobile':
        options.isMobile = true
        break
      case '--responsive':
        options.isResponsive = true
        break
      case '--dark':
        options.isDark = true
        break
      case '--full':
        options.isFull = true
        break
      case '--clip':
        options.clip = next()
        break
      case '--do':
        options.actions.push(next())
        break
      case '--relabel':
      {
        const pair = next()
        const arrow = pair.indexOf('=>')
        if (arrow === -1) fail(`--relabel wants <from>=><to>, got "${pair}"`)
        options.relabels.push([pair.slice(0, arrow), pair.slice(arrow + 2)])
        break
      }
      case '--name':
        options.name = next()
        break
      case '--out':
        options.outDir = path.resolve(ROOT, next())
        break
      case '--upload':
        options.isUpload = true
        break
      case '--port':
        options.port = Number(next())
        break
      case '--base-url':
        options.baseURL = next().replace(/\/$/, '')
        break
      case '--fresh':
        options.isFresh = true
        break
      case '--list':
        options.command = 'list'
        break
      case '--status':
        options.command = 'status'
        break
      case '--stop':
        options.command = 'stop'
        break
      case '--help':
      case '-h':
        options.command = 'help'
        break
      default:
        if (arg.startsWith('-')) fail(`Unknown option ${arg}\n\n${USAGE}`)
        options.targets.push(arg)
    }
  }

  if (options.isMobile) {
    options.viewport = MOBILE_VIEWPORT
  }

  return options
}

function inferRole(routePath) {
  return routePath.startsWith('/app') ? 'owner' : 'anon'
}

function slugify(value) {
  return value.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'home'
}

function resolveTargets(options) {
  return options.targets.flatMap((target, index) => {
    const screen = SCREENS[target]
    if (!screen && !target.startsWith('/')) {
      fail(`Unknown screen "${target}". Run pnpm shot --list to see them all, or pass a path starting with /.`)
    }

    const routePath = screen ? screen.path : target
    const role = options.role ?? screen?.role ?? inferRole(routePath)
    if (role !== 'anon' && !ROLES[role]) {
      fail(`Unknown role "${role}". Pick one of: anon ${Object.keys(ROLES).join(' ')}`)
    }

    const base = options.name
      ? (options.targets.length > 1 ? `${options.name}-${index + 1}` : options.name)
      : `${role}-${slugify(screen ? target : routePath)}`

    function view(suffix, viewport, isMobile) {
      return {
        label: target,
        path: routePath,
        role,
        viewport,
        isMobile,
        file: path.join(options.outDir, `${base}${suffix}.png`)
      }
    }

    // --responsive answers "how does it look on both", which is one session and one
    // browser away — so it costs a page load, not a second run.
    if (options.isResponsive) {
      return [view('-desktop', options.viewport, false), view('-mobile', MOBILE_VIEWPORT, true)]
    }

    return [view('', options.viewport, options.isMobile)]
  })
}

function readLock() {
  if (!existsSync(LOCK_FILE)) return null
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function isServerResponding(port, timeoutMs = 3_000) {
  try {
    const response = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(timeoutMs) })
    return response.status < 500
  } catch {
    return false
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.listen(port, () => probe.close(() => resolve(true)))
  })
}

async function pickPort(preferred) {
  if (preferred) return preferred
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port += 1) {
    if (await isPortFree(port)) return port
  }
  fail(`No free port between ${PORT_RANGE_START} and ${PORT_RANGE_END}. Pass --port.`)
}

async function waitForServer(port) {
  const deadline = Date.now() + SERVER_BOOT_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await isServerResponding(port, 5_000)) return
    await new Promise(resolve => setTimeout(resolve, 2_000))
  }
  fail(`Dev server did not answer on port ${port} within ${SERVER_BOOT_TIMEOUT_MS / 1000}s. See ${LOG_FILE}.`)
}

// The lock records the working copy that started the server: another checkout's dev
// server answers "/" exactly like ours, so the port alone proves nothing.
async function findRunningServer() {
  const lock = readLock()
  if (!lock || lock.cwd !== ROOT || !isProcessAlive(lock.pid)) return null
  if (!(await isServerResponding(lock.port))) return null
  return lock
}

async function startServer(port) {
  mkdirSync(SHOT_DIR, { recursive: true })
  const log = openSync(LOG_FILE, 'a')
  // Detached so the server survives this command and the next shot reuses it —
  // a warm dev server is the difference between 3 seconds and 90.
  const child = spawn('pnpm', ['run', 'dev'], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, PORT: String(port), NUXT_PORT: String(port) }
  })
  child.unref()
  writeFileSync(LOCK_FILE, JSON.stringify({ port, pid: child.pid, cwd: ROOT }, null, 2))
  console.log(`Starting the dev server on port ${port} (first boot takes ~30s; it stays up for the next shot).`)
  await waitForServer(port)
  return { port, pid: child.pid, cwd: ROOT }
}

async function resolveBaseURL(options) {
  if (options.baseURL) {
    return { baseURL: options.baseURL, serverSeconds: 0, isServerReused: true }
  }

  const elapsed = startClock()
  const running = await findRunningServer()
  if (running && (!options.port || running.port === options.port)) {
    return { baseURL: `http://localhost:${running.port}`, serverSeconds: elapsed(), isServerReused: true }
  }

  const port = await pickPort(options.port)
  const started = await startServer(port)
  return { baseURL: `http://localhost:${started.port}`, serverSeconds: elapsed(), isServerReused: false }
}

function stopServer() {
  const lock = readLock()
  if (!lock || !isProcessAlive(lock.pid)) {
    rmSync(LOCK_FILE, { force: true })
    console.log('No dev server of ours is running.')
    return
  }
  try {
    process.kill(-lock.pid, 'SIGTERM')
  } catch {
    process.kill(lock.pid, 'SIGTERM')
  }
  rmSync(LOCK_FILE, { force: true })
  console.log(`Stopped the dev server on port ${lock.port}.`)
}

let isClerkReady = false

async function setupClerk() {
  if (isClerkReady) return
  // Clerk's helpers read their own variable names; the app stores the same keys
  // under NUXT_ names.
  process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || process.env.NUXT_CLERK_SECRET_KEY
  if (!process.env.CLERK_SECRET_KEY) {
    fail('No Clerk key in the environment. Run pnpm setup:env to decode .env first.')
  }
  await clerkSetup()
  isClerkReady = true
}

function sessionPath(role) {
  return path.join(AUTH_DIR, `${role}.json`)
}

function isSessionFresh(role) {
  const file = sessionPath(role)
  return existsSync(file) && Date.now() - statSync(file).mtimeMs < SESSION_MAX_AGE_MS
}

// Signing in costs a live round trip to Clerk's development instance, so each role
// signs in once and every later shot replays the stored session.
async function ensureSession(browser, role, baseURL, isForced) {
  const file = sessionPath(role)
  if (!isForced && isSessionFresh(role)) return file

  await setupClerk()
  console.log(`Signing in as ${role} (${ROLES[role]}) — cached for the next 6 hours.`)
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  // 'commit' avoids net::ERR_ABORTED when Clerk answers the first request with a
  // __clerk_handshake redirect; clerk.loaded() still gates on Clerk itself.
  await page.goto('/', { waitUntil: 'commit' })
  await clerk.loaded({ page })
  await clerk.signIn({ page, emailAddress: ROLES[role] })
  await page.goto('/', { waitUntil: 'commit' })
  await clerk.loaded({ page })
  mkdirSync(AUTH_DIR, { recursive: true })
  await context.storageState({ path: file })
  await context.close()
  return file
}

async function openContext(browser, target, options, baseURL, statePath) {
  const context = await browser.newContext({
    baseURL,
    storageState: statePath ?? undefined,
    viewport: target.viewport,
    deviceScaleFactor: 2,
    isMobile: target.isMobile,
    hasTouch: target.isMobile,
    colorScheme: options.isDark ? 'dark' : 'light',
    locale: LOCALE,
    timezoneId: TIMEZONE
  })

  // Fix the theme up front so the first paint is already in the right mode — letting
  // the color-mode script decide produces a light flash in a dark screenshot.
  await context.addInitScript(([colorKey, colorValue]) => {
    try {
      window.localStorage.setItem(colorKey, colorValue)
    } catch {
      // Some origins reject storage; the shot is still worth taking.
    }
  }, [COLOR_MODE_KEY, options.isDark ? 'dark' : 'light'])

  // The Nuxt devtools badge floats over the bottom of every dev-server page and
  // lands in the middle of the shot.
  await context.addInitScript(() => {
    function hideDevtools() {
      if (document.getElementById('__shot_hide_devtools')) return
      const style = document.createElement('style')
      style.id = '__shot_hide_devtools'
      style.textContent = '#nuxt-devtools-anchor,#nuxt-devtools-container{display:none!important}'
      document.head?.appendChild(style)
    }
    document.addEventListener('DOMContentLoaded', hideDevtools)
    hideDevtools()
  })

  return { context, page: await context.newPage() }
}

async function settle(page, timeout = 15_000) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {})
  // Skeletons are the project's loading state, so an empty skeleton count is the
  // signal that the data landed.
  await page.waitForFunction(() => document.querySelectorAll('.animate-pulse').length === 0, null, { timeout }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(300)
}

async function isSessionActive(page) {
  try {
    await page.waitForFunction(() => Boolean(window.Clerk?.loaded), null, { timeout: 8_000 })
    return await page.evaluate(() => Boolean(window.Clerk?.user))
  } catch {
    // Clerk never announced itself — do not guess the session is dead and re-sign in.
    return true
  }
}

async function openPath(page, target) {
  await page.goto(target.path, { waitUntil: 'commit' })
  await settle(page)
}

async function runAction(page, action) {
  const separator = action.indexOf(':')
  if (separator === -1) fail(`--do "${action}" needs a verb, e.g. click:<selector>`)
  const verb = action.slice(0, separator)
  const value = action.slice(separator + 1)

  switch (verb) {
    case 'click':
      await page.locator(value).first().click()
      break
    case 'text':
      await page.getByText(value).first().click()
      break
    case 'hover':
      await page.locator(value).first().hover()
      break
    case 'wait':
      await page.locator(value).first().waitFor({ state: 'visible' })
      break
    case 'scroll':
      await page.locator(value).first().scrollIntoViewIfNeeded()
      break
    case 'press':
      await page.keyboard.press(value)
      break
    case 'type':
      await page.keyboard.type(value, { delay: 40 })
      break
    case 'sleep':
      await page.waitForTimeout(Number(value))
      return
    case 'fill':
    {
      const equals = value.indexOf('=')
      if (equals === -1) fail(`--do "${action}" wants fill:<selector>=<value>`)
      await page.locator(value.slice(0, equals)).first().fill(value.slice(equals + 1))
      break
    }
    default: fail(`Unknown action "${verb}" in --do "${action}"`)
  }

  await settle(page, 8_000)
}

function upload(file) {
  const result = spawn('node', [path.join(ROOT, 'scripts', 'upload.mjs'), file], { stdio: 'inherit' })
  return new Promise(resolve => result.on('exit', resolve))
}

// Swaps one string for another in every text node, for a capture that has to carry a
// chosen identity rather than the seed's — a hand-out or a mockup where the seeded name
// and its +clerk_test address would be wrong. It runs after the actions and just before
// the shot, so text a click revealed is covered too.
async function applyRelabels(page, relabels) {
  if (relabels.length === 0) return
  await page.evaluate((pairs) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      for (const [from, to] of pairs) {
        if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to)
      }
    }

    // A pre-filled field holds its text in a property rather than a text node, so the
    // walk above never sees it.
    for (const field of document.querySelectorAll('input, textarea')) {
      for (const [from, to] of pairs) {
        if (field.value?.includes(from)) field.value = field.value.replaceAll(from, to)
      }
    }
  }, relabels)
}

async function captureTarget(browser, target, options, baseURL) {
  const total = startClock()
  const phases = { 'sign-in': 0, 'open': 0, 'actions': 0, 'shot': 0 }

  const signInClock = startClock()
  let statePath = target.role === 'anon' ? null : await ensureSession(browser, target.role, baseURL, options.isFresh)
  phases['sign-in'] = signInClock()

  let openClock = startClock()
  let { context, page } = await openContext(browser, target, options, baseURL, statePath)
  await openPath(page, target)
  phases.open = openClock()

  if (target.role !== 'anon' && !(await isSessionActive(page))) {
    await context.close()
    const retryClock = startClock()
    statePath = await ensureSession(browser, target.role, baseURL, true)
    phases['sign-in'] += retryClock()
    openClock = startClock()
    ;({ context, page } = await openContext(browser, target, options, baseURL, statePath))
    await openPath(page, target)
    phases.open += openClock()
  }

  const actionsClock = startClock()
  for (const action of options.actions) {
    await runAction(page, action)
  }
  phases.actions = actionsClock()

  await applyRelabels(page, options.relabels)

  const shotClock = startClock()
  mkdirSync(path.dirname(target.file), { recursive: true })
  const subject = options.clip ? page.locator(options.clip).first() : page
  await subject.screenshot({
    path: target.file,
    animations: 'disabled',
    ...(options.clip ? {} : { fullPage: options.isFull })
  })
  phases.shot = shotClock()

  await context.close()
  return { file: target.file, phases, seconds: total(), isSignIn: phases['sign-in'] >= 0.05 }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.command === 'help') {
    console.log(USAGE)
    return
  }

  if (options.command === 'list') {
    console.log('Named screens:\n')
    for (const [name, screen] of Object.entries(SCREENS)) {
      console.log(`  ${name.padEnd(22)} ${screen.path}${screen.role ? `   [${screen.role}]` : ''}`)
    }
    console.log(`\nRoles: anon ${Object.keys(ROLES).join(' ')}`)
    return
  }

  if (options.command === 'stop') {
    stopServer()
    return
  }

  if (options.command === 'status') {
    const running = await findRunningServer()
    console.log(running ? `Dev server up on port ${running.port} (pid ${running.pid}).` : 'No dev server of ours is running.')
    const cached = Object.keys(ROLES).filter(isSessionFresh)
    console.log(cached.length ? `Cached sessions: ${cached.join(' ')}` : 'No cached sessions.')
    return
  }

  if (options.targets.length === 0) {
    console.log(USAGE)
    return
  }

  const runClock = startClock()
  const targets = resolveTargets(options)
  const { baseURL, serverSeconds, isServerReused } = await resolveBaseURL(options)

  const browserClock = startClock()
  const browser = await chromium.launch()
  const browserSeconds = browserClock()
  const results = []

  try {
    for (const target of targets) {
      const result = await captureTarget(browser, target, options, baseURL)
      results.push(result)
      const name = path.relative(ROOT, result.file)
      console.log(`${name.padEnd(40)} ${formatSeconds(result.seconds).padStart(6)}  ${describePhases(result.phases)}`)
    }
  } finally {
    await browser.close()
  }

  const signIns = results.filter(result => result.isSignIn).length
  const server = isServerReused ? `server reused ${formatSeconds(serverSeconds)}` : `server started ${formatSeconds(serverSeconds)}`
  const label = results.length === 1 ? 'capture' : 'captures'
  console.log(`\n${results.length} ${label} in ${formatSeconds(runClock())}  ·  ${server}  ·  browser ${formatSeconds(browserSeconds)}  ·  sign-ins ${signIns}`)

  if (options.isUpload) {
    for (const result of results) {
      await upload(result.file)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
