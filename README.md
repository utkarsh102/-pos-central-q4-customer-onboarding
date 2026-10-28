# POS Central Q4 Customer Onboarding

A separate dashboard for Akshay and Rohit. It counts every Google Sheet row dated October 1–December 31, 2026, including repeat submissions. The form accepts any valid Sign Up Date; dates outside Q4 are saved but excluded from this dashboard.

## Files

- `public/`: responsive dashboard, POS Central logo, font, and interactive visuals.
- `api/customers.js`: Vercel API for live counts and validated form submissions.
- `lib/customers.js`: CSV parsing, validation, and Q4 counting.
- `google-apps-script/Code.gs`: one-time Google Sheet write connection.

## Local checks

Run `node --test` to check parsing, date rules, and counting. Run `node dev-server.js` and open `http://127.0.0.1:8010` for a full local preview. The public Google Sheet can supply read-only counts before the write connection is configured.

## Connect the Google Sheet

1. Open the [onboarding Google Sheet](https://docs.google.com/spreadsheets/d/1FesJ9Phs07BGwtwLA0GF_j-14XRx8urJ7mqBfg5zjyA/edit). Open **Extensions → Apps Script**.
2. Replace the editor content with `google-apps-script/Code.gs`. Save the script.
3. In Apps Script, open **Project Settings → Script properties**. Add `SHEET_WRITE_SECRET` with a long random value (at least 32 characters). Keep it private.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Authorize it and copy the `/exec` web app URL.
5. In the new Vercel project, add two Production environment variables: `APPS_SCRIPT_URL` (the `/exec` URL) and `SHEET_WRITE_SECRET` (the same secret). Redeploy the site.
6. Test one submission. Check that exactly one row appears in the Google Sheet and the displayed count updates when its Sign Up Date is in Q4 2026. Remove the test row afterward if it was only a test.

The browser does not receive the secret. The public page allows anyone with its link to submit records, so share the link with the intended team only. The Google Sheet itself is currently publicly readable; restrict its sharing settings if names should be private.

## Deploy

Create a separate GitHub repository containing this folder's contents. Import it into Vercel under your personal account. Use **Other** as the framework preset, leave the build command blank, and set `public` as the output directory. Vercel serves `api/customers.js` as a Function. Add the two environment variables above before testing registration.
