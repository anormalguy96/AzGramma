# AzGramma

A production-ready starter for an Azerbaijani Grammarly-like web app:

- **Frontend:** React + Vite + Tailwind + Framer Motion
- **AI:** Netlify Functions → OpenAI (Responses API) with Structured Outputs
- **Auth + DB:** Supabase (profiles + monthly usage)
- **Billing:** Stripe subscriptions (Free / Plus / Pro) via Checkout + Webhooks + Customer Portal

## 1) Prerequisites

- Node.js (LTS) and npm
- Netlify CLI (for local dev): `npm i -g netlify-cli`
- A Supabase project
- A Stripe account (test mode is fine for MVP)
- (Optional) OpenAI API key

## 2) Supabase setup

1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase.sql` (in repo root).
3. In Supabase Auth settings, enable Email/Password.
4. Get these values:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (server only, NEVER expose in frontend)

## 3) Stripe setup

Create 2 recurring prices (monthly suggested) in Stripe:

- `AzGramma Plus` → copy price id → `STRIPE_PRICE_PLUS`
- `AzGramma Pro` → copy price id → `STRIPE_PRICE_PRO`

Create a webhook endpoint (for local dev, use Stripe CLI):

```bash
stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 4) OpenAI setup

Set `OPENAI_API_KEY`.

## 5) Local dev

```bash
cp .env.example .env
# fill values
npm install
npm run dev
```

This runs:
- Vite frontend
- Netlify Functions
- `/api/*` automatically routes to functions.

## 6) Deploy to Netlify

- Push to GitHub
- Create a new Netlify site from the repo
- Set environment variables in Netlify UI (same as `.env`)
- Deploy

## Notes

- Usage limits are defined in `netlify/functions/_shared/plans.ts`.
- The app enforces monthly request limits server-side.
- Logo is in `apps/web/src/assets/azgramma_logo.png` and used on all pages.
