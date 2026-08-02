# Production release checklist

## Verified locally

- TypeScript passes with `npm run lint`.
- 33/33 focused production tests pass with `npm test`.
- The optimized production build completes with `npm run build`.
- `npm audit --omit=dev` reports zero known vulnerabilities.
- Public lead-form desktop, mobile, validation and success states were verified in-browser.
- Production login contains no demo credentials, role picker or public registration.

## Required deployment secrets

- `NODE_ENV=production`
- `APP_MODE=live`
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- Firebase web-app environment values listed in `.env.example`

Online checkout is intentionally unavailable in this release. Proposal acceptance clearly explains that payment instructions follow separately.

## Free-first policy

- Firebase Authentication and the default Firestore database are the only required Google services.
- Paid AI calls and AI automation are not required for the revenue core.
- Start with free WhatsApp click-to-chat through `PUBLIC_WHATSAPP_URL`.
- Add paid WhatsApp API only after lead volume justifies automated delivery and consent handling.

## Before promotion

1. Configure Firebase and the first workspace administrator.
2. Set preview environment variables in Vercel.
3. Deploy a preview, not production.
4. Verify auth, durable lead capture and proposal acceptance against the real Firebase project.
5. Promote the exact verified preview only after approval.

GitHub and Vercel production remain unchanged until these gates are complete.
