# Ledger Mini PWA

A free, offline-first customer and order manager designed for iPhone Safari. Pure HTML, CSS and JavaScript; no framework, paid API, server or cloud database.

## Features
- Dashboard with total order value, customer count and open orders
- Customer CRUD: name, contact, phone, email, notes
- Order CRUD: title, customer, AUD amount, status, order/due dates, notes
- Search and status filters
- Local browser storage
- JSON export/import backup
- PWA manifest and service worker for offline app shell
- Responsive iPhone-first interface

## Run locally
For PWA/service worker testing, serve over localhost (opening index.html directly does not enable service workers).

If Python 3 is installed:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in a browser.

## Free deployment using GitHub Pages
1. Sign in or create a free GitHub account.
2. Create a new **public** repository, for example `ledger-mini-pwa`.
3. Upload all files and the `icons` folder from this project to the repository root.
4. Open repository **Settings → Pages**.
5. Under Build and deployment, choose **Deploy from a branch**.
6. Select branch `main`, folder `/(root)`, and save.
7. Wait for the published URL, typically `https://YOUR-USERNAME.github.io/ledger-mini-pwa/`.
8. Open that HTTPS URL in Safari on iPhone.
9. Tap Share → Add to Home Screen → Add.
10. Open the new home-screen icon. Add one test customer and order, close/reopen the app, then export a JSON backup.

GitHub Pages is static hosting. The repository's app code is public if the repository is public, but customer/order records are not uploaded by this app; they remain in browser storage. Do not put customer records or backup files into the repository.

## Important local-data behaviour
- Data is stored in localStorage for the current origin/browser profile.
- It does not sync between devices or automatically share records with friends.
- Clearing Safari website data can erase records. Export JSON backups regularly.
- A JSON backup contains customer personal information; protect it like a business document.
- This MVP does not encrypt local records, provide login/access control, audit logs, or multi-user collaboration. Do not use it as the only system of record for sensitive or regulated business data.
- If the deployed URL/path changes, the browser may treat it as a different origin and old data may not appear.

## Update the app
1. Edit files and upload the new version to the same repository.
2. Update `CACHE_NAME` in `service-worker.js` (e.g. `ledger-mini-v2`) so the new app shell is cached.
3. Wait for GitHub Pages to deploy; close and reopen the installed PWA, and refresh if needed.

## Customization
- App name and metadata: `index.html`, `manifest.webmanifest`
- UI: `styles.css`
- Features/data model: `app.js`
- Offline cache: `service-worker.js`
