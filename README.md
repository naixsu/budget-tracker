# budget-tracker

Personal budget tracker. Runs as a PWA on iPhone.

## Development

```sh
npm install
npm run dev
```

## Install on iPhone

Open the deployed site in Safari, tap Share, then Add to Home Screen.
Always open it from the home screen icon, not a Safari tab.

## Google Sheet sync

Keeps a copy of all data in a Google Sheet you own.

1. Create a new Google Sheet.
2. Open Extensions -> Apps Script. Replace everything in `Code.gs` with
   [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. Pick `setup` in the function dropdown and click Run. Approve the
   permissions; Google warns the app is unverified because you wrote it
   yourself, so choose Advanced -> Go to project.
   The execution log prints the token.
4. Click Deploy -> New deployment, pick type Web app, set Execute as: Me and
   Who has access: Anyone, then Deploy. Copy the web app URL (it ends in `/exec`).
5. In the app, tap ••• and paste the URL and token under Google Sheet sync.

"Anyone" lets the app reach the script without signing in. Requests without
the token are refused, so keep the token private.

To update the script later, paste the new code, then Deploy -> Manage
deployments -> Edit -> Version: New version. The URL stays the same.
