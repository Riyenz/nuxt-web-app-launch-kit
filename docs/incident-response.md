# Incident Response Plan

What we do when personal data leaks, is changed by the wrong person, or is lost. Many data
protection laws require every business that handles personal data to have this plan. The Privacy
Policy (`app/pages/privacy.vue`, section 4) promises it, so keep the two in step.

Bracketed text is a placeholder to fill in before launch. This is a template, not legal advice.

## Who acts

[Name and role of the responsible person] leads every incident. Reports arrive at the contact
email in `shared/site.ts` (`site.contactEmail`), which must reach an inbox that is read every day.

## What counts

A personal data breach is any event where personal data is seen by the wrong person, changed by
the wrong person, or lost. A hacker is not required. These count:

- A code bug shows one customer's data to another customer.
- An email (invite, notice, receipt) goes to the wrong person.
- A key or password leaks: a `.env` value, a database URL, or a Clerk key in a commit,
  screenshot or pasted log.
- A vendor (Clerk, Neon, Vercel, or any other you add) reports a breach that touches our data.
- A laptop or phone with access to production is lost or stolen while signed in.

## How we find out

Most breaches are reported by someone else. Watch for:

1. A customer says they see another customer's data.
2. A person says they got an email that is not theirs.
3. A security email from a vendor. Every vendor account must send mail to one inbox that is read.
4. A GitHub, Vercel or vendor alert about a leaked secret.
5. Odd traffic: a jump in database reads, or many failed sign-ins in the Clerk dashboard.

Add a free domain alert for your production domain on haveibeenpwned.com.

## Steps

### 1. Stop it (first hour)

- Rotate any leaked key in Vercel and wherever the project keeps its env values, then redeploy.
- Sign out the affected people in Clerk.
- Turn off the feature behind the bug, or roll back the deploy in Vercel.
- Keep evidence: logs, the Neon database rows, the Vercel deploy log. Do not delete anything yet.

### 2. Measure it (first 24 hours)

Write down what data, how many people, which customers, and when it started. Mark it sensitive if
it includes health, financial or government identifier data, or anything else that can enable
fraud.

### 3. Tell the right people

- **Customer data** (we are the processor): email each affected customer within
  [breach notice window for customers, e.g. 24 hours] of confirming the breach. The customer is
  the controller and must tell [regulator] within [regulator notice window, e.g. 72 hours].
- **Our own data** (customer accounts, website visitors; we are the controller): tell
  [regulator] and the affected people within [regulator notice window, e.g. 72 hours] of
  knowing, when [conditions that trigger a notice under your data protection law]. File through
  [regulator filing channel].

Each notice says: what happened, what data, what we did, what the reader must do, and how to reach
the responsible person.

### 4. Record it

Open a private GitHub issue with the label `security-incident` for every incident, including the
ones that turn out not to be breaches. Record when it was found, what happened, what was done, and
who was told and when.

### 5. Fix the cause

Ship the fix with a test that fails without it. Add the lesson to the matching doc.

## Open questions for a lawyer

- Which data protection law applies, and who is the regulator.
- The exact notice window and trigger for telling the regulator and affected people.
- Whether you must name a data protection officer or file an annual incident report.
- Whether your customer contracts set a shorter notice window than the law does.
