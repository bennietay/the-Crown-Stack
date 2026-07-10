# ProspectFlow MY Solo

ProspectFlow MY Solo is a small CRM and daily action dashboard for starting and growing an Amway Malaysia business without overcomplicating the workflow.

The core loop is intentionally simple:

1. Add a prospect.
2. Log opt-in and notes.
3. Send a compliant first message.
4. Follow up on the right day.
5. Move the person to customer, business prospect, not now, or do not contact.

## Production Setup

Prerequisites:

- Node.js 20+
- Supabase project with Email/Password auth enabled
- Supabase SQL migration in `supabase/migrations/001_workspace_records.sql` applied
- Vercel project for hosting
- OpenAI API key for ChatGPT outreach drafting

Install and run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Build and run production output:

```bash
npm run build
npm start
```

## Environment Variables

Set these in `.env.local` for development and in your hosting provider for production:

```bash
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.5"
PORT="3000"
APP_URL="https://your-domain.example"
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""
```

The Supabase anon key is a public browser key. Data access is protected by Row Level Security in the migration file.

## Supabase Setup

This build is prepared for the existing `lead gen` Supabase project:

- Project ref: `jhclqpstcrngzwpyhhcj`
- Project URL: `https://jhclqpstcrngzwpyhhcj.supabase.co`
- Region: `ap-northeast-1`

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/migrations/001_workspace_records.sql`.
3. In Authentication > Providers, enable Email.
4. For the simplest first launch, disable email confirmation while testing. Re-enable it before inviting real users if you want verified email accounts.
5. Copy the project URL and anon key into `.env.local` and Vercel.

## Vercel Setup

Set these Vercel environment variables for Production and Preview:

```bash
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.5"
APP_URL="https://your-vercel-domain.vercel.app"
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""
```

Then deploy from the project root:

```bash
npm run build
vercel
vercel --prod
```

## Before Real Use

- Replace all sample resources, webinar links, product catalogue entries, and payment links with current official information.
- Review scripts against the latest Amway Malaysia Rules of Conduct and your own sponsor guidance.
- Do not claim guaranteed income, easy money, medical treatment, cure, prevention, or fixed results.
- Collect and log consent before sending marketing follow-ups.
- Export a backup regularly from Settings.

## Useful Next Additions

- A first-week guided checklist for new ABOs.
- Calendar reminders for follow-ups.
- CSV import/export for leads and orders.
- A simple content planner with 7-day post ideas.
- A one-page compliance review queue for scripts before use.
