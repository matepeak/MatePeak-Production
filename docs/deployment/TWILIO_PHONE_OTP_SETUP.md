# Twilio Phone OTP Setup (Supabase + Node.js-style Verify Flow)

This guide wires a test page and Supabase Edge Function for SMS OTP using Twilio Verify.

## What is added

- Edge Function: `supabase/functions/phone-otp/index.ts`
- Test Page: `src/pages/PhoneOtpTest.tsx`
- Test Route: `/test/phone-otp` (dev by default, production via feature flag)

## 1) Twilio prerequisites

1. Sign in to Twilio and create or open your project.
2. In Twilio Console, copy:
   - Account SID
   - Auth Token
3. Create a Verify Service:
   - Console -> Verify -> Services -> Create Service
   - Enable SMS channel
   - Copy Verify Service SID (`VA...`)
4. If your account is trial:
   - Verify destination phone numbers before sending OTP.

## 2) Set Supabase secrets

Run from repository root:

```bash
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg TWILIO_ACCOUNT_SID=your_account_sid
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg TWILIO_AUTH_TOKEN=your_auth_token
npx supabase secrets set --project-ref hnevrdlcqhmsfubakljg TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
```

## 3) Deploy function

```bash
npx supabase functions deploy phone-otp --project-ref hnevrdlcqhmsfubakljg
```

## 4) Enable and open test page

For local dev, route is already enabled.

For deployed frontend, set:

```dotenv
VITE_ENABLE_PHONE_OTP_TEST_PAGE=true
```

Open:

- `/test/phone-otp`

## 5) Test flow

1. Enter phone in E.164 format (example: `+919876543210`).
2. Click **Send OTP**.
3. Enter received OTP.
4. Click **Verify OTP**.

## 6) Common issues

- `Missing Twilio Verify secrets`:
  - Set all three secrets in Supabase and redeploy function.
- Twilio trial cannot send:
  - Verify the destination number in Twilio trial settings.
- `Phone must be in E.164 format`:
  - Include country code and leading `+`.
- Verify fails with invalid code:
  - OTP expired or incorrect; request a fresh OTP.

## Next step for production

- Save verified phone status in your user profile table after successful verify response.
- Add resend rate limiting and abuse protection (IP/device based).
- Move test route behind admin/auth checks before production release.
