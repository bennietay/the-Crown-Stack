# Bennie Business OS

Bennie Business OS is Bennie Studio's focused revenue workspace. The production surface supports:

- a public, conversion-focused project enquiry form;
- invitation-only Firebase Authentication;
- Firestore-backed leads, pipeline, products, proposals, customers, tickets and follow-up tasks;
- secure public proposal links with durable acceptance records;
- advanced business, pricing, lead-form and provider-readiness settings.

Prototype AI, automated messaging, hosting, customer-portal, reconciliation and simulated payment features are not exposed in the production app.

## Local verification

```bash
npm install
npm run lint
npm test
npm run build
```

For local UI development, use `APP_MODE=demo`. Production requires `APP_MODE=live` and refuses to start without Firebase Admin credentials.

## Production environment

Copy `.env.example` into your deployment environment. Required server-side values:

```env
NODE_ENV=production
APP_MODE=live
FIREBASE_SERVICE_ACCOUNT_KEY={...service account JSON...}
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Recommended free-first public configuration:

```env
PUBLIC_WHATSAPP_URL=https://wa.me/<international-number>
PUBLIC_BOOKING_URL=
PUBLIC_PRIVACY_URL=
PUBLIC_TERMS_URL=
```

Do not enter service secrets in the browser or commit them to Git. Online payments, email automation and WhatsApp API automation are not part of this release.

## First administrator

Set `BOOTSTRAP_ADMIN_EMAIL` to the exact email address of the first administrator. After that account is created in Firebase Authentication, its first successful sign-in atomically creates the user, `ws-bennie` workspace and workspace membership. All other unprovisioned accounts remain denied.

Use Firebase's default Firestore database to keep the architecture aligned with the free-first plan. Deploy `firestore.rules` before inviting additional users, and add the final Vercel domain to Firebase Authentication's authorized domains.

## Release gates

1. All lint, tests and production builds pass.
2. `/healthz` and `/readyz` return 200 in the deployed environment.
3. A real `/capture` submission appears in the `leads` Firestore collection.
4. An invited administrator can sign in and access only `ws-bennie`.
5. A draft proposal can be marked ready, opened through its public link and accepted.
6. Preview is reviewed before production promotion.
