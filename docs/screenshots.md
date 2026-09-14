# App Screenshots (`pnpm shot`)

One command turns a code change into a picture of that change in the running app:

```bash
pnpm shot dashboard
# .shots/owner-dashboard.png
```

It exists because the slow part of "show me the change" was never the screenshot. It
was booting a server, signing in to Clerk, and clicking from the landing page to the
screen. All three are cached or named here, so a warm capture takes a few seconds.

## Let the subagent do it

`.claude/agents/screenshot.md` defines a `screenshot` subagent that runs on a fast
model. Taking a screenshot is one deterministic command, so it does not need the main
model. Ask it in plain words — "the dashboard as the owner, desktop and mobile" — and
it returns the file paths, what each shot shows, and the timings.

Drive `pnpm shot` yourself when the screenshot is one step inside a longer task, or when
a new screen has to be added to the `SCREENS` map first.

## Usage

```bash
pnpm shot <screen|path> [more ...] [options]
```

`screen` is a name from `pnpm shot --list`. Anything starting with `/` is treated as a
path, so a screen that has no name yet still works. Several targets share one browser
and one server.

```bash
pnpm shot landing dashboard                    # two screens, one run
pnpm shot /app/dashboard                       # any path
pnpm shot dashboard --mobile --dark            # phone, dark mode
pnpm shot dashboard --responsive               # desktop + mobile in one run
pnpm shot dashboard --upload                   # capture, then print a phone link
```

## Options

| Option | What it does |
|---|---|
| `--as <role>` | `owner` (default) or `anon` for the signed-out visitor |
| `--size <WxH>` | Viewport, default `1440x900` |
| `--mobile` | 390x844 with a touch profile |
| `--responsive` | Capture each screen twice: `-desktop.png` and `-mobile.png` |
| `--dark` | Dark mode |
| `--full` | Full page instead of the viewport |
| `--clip <selector>` | Screenshot one element, e.g. `--clip "[role=dialog]"` |
| `--do <action>` | Act before the shot; repeatable, runs in order |
| `--name <basename>` | Output file name |
| `--out <dir>` | Output directory, default `.shots` |
| `--upload` | Upload each PNG and print a public link (see `pnpm upload`) |
| `--port <n>` / `--base-url <url>` | Choose the port, or point at a server you already run |
| `--fresh` | Sign in again instead of reusing the cached session |
| `--list` / `--status` / `--stop` | Screens; server and session state; stop the server |

### `--do` actions

`click:<selector>` `text:<visible text>` `fill:<selector>=<value>` `press:<key>`
`type:<text>` `hover:<selector>` `wait:<selector>` `scroll:<selector>` `sleep:<ms>`

```bash
pnpm shot dashboard --do "click:button[aria-label='Export']" --clip "[role=dialog]"
pnpm shot dashboard --do "text:Last 30 days" --name range-menu
```

## What it costs

Every run prints its own timings, so read those rather than trusting a number here.
Roughly: a cold run pays for the dev server (~10-30s, more on a first-ever boot with an
empty `.nuxt` cache) plus one Clerk sign-in (~10s). Both then serve every later shot for
the rest of the session. A warm capture is one page load, so extra screens in the same
run cost a few seconds each.

## What it handles for you

- **Dev server.** Reuses this working copy's server if it is up, otherwise starts one on
  a free port from 4180 and leaves it running for the next shot. The lock file records
  the directory, because another checkout's server answers on its port exactly like ours.
- **Sessions.** Each role signs in to Clerk once; the session is stored in
  `.shots/auth/<role>.json` and replayed for 6 hours. A dead session is re-minted
  automatically.
- **A clean frame.** The Nuxt devtools badge is hidden, the color mode is fixed before
  first paint so a dark shot has no light flash, skeletons are waited out, and the locale
  and timezone are pinned (`LOCALE` / `TIMEZONE` at the top of `scripts/shot.mjs`).

Everything lands in `.shots/`, which is gitignored. A screenshot that ships (docs,
marketing) gets copied out and edited.

## Adding a screen or a role

Screens live in the `SCREENS` map at the top of `scripts/shot.mjs`. Add one whenever a
screenshot needs clicks to reach it — that click sequence is the part worth saving.
Roles live in the `ROLES` map just above it and must be Clerk test accounts (an address
containing `+clerk_test`); see [Test Accounts](test-accounts.md).
