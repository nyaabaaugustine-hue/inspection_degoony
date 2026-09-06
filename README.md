# Evergreen Logistics — Vehicle Inspection Evidence

A simple Next.js app for capturing **Pre-Trip** and **Post-Trip** vehicle inspection evidence for a fleet. Submissions are sent to an email inbox via **Formspree** (no database).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

Production build:

```bash
npm run build
npm start
```

## Pages

- `/` — landing: choose Pre-Trip or Post-Trip
- `/pre` — Pre-Trip inspection (21 items) + existing damage + driver cert + supervisor release, with camera photo capture
- `/post` — Post-Trip inspection (13 items) + mandatory variance + driver cert + supervisor disposition, with camera photo capture

## Configuration

Set your Formspree endpoint in `lib/config.ts`:

```ts
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
```

## How submission works

- Each inspection submits as **multipart** FormData to Formspree (supports file/photo attachments).
- A `_subject` line identifies the form (Pre/Post) plus vehicle and driver.
- Inspection items are sent as a readable text block (`pre_items` / `post_items`) and photos are attached individually.
- Formspree emails the submission to the address configured for the form.

## Setup in Formspree

1. Create a form (or use your existing one) and copy its ID (e.g. `xjyvelvv`).
2. Paste it into `lib/config.ts`.
3. In the Formspree dashboard, confirm the **notification email** where submissions arrive.

## Note on photo capture

The photo input uses `capture="environment"`, so on a phone it opens the camera directly. Images are read as base64 and attached to the submission.

## Photos / storage

Because this version uses Formspree only (no database), there is **no stored record list or dashboard** — evidence goes straight to email. A future version can add a database if you want searchable history and pre/post comparison views.
