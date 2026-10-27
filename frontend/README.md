# AutoCare Pro – Vehicle Service Management System
Angular 19 (standalone, Reactive Forms, RxJS) · Node.js + Express 4 · JWT + bcrypt · **local JSON files as the database**.

```
autocare-pro/
  backend/   Express API (src/config, controllers, middleware, routes, services, repositories, validators, utils), data/*.json, scripts/seed.js, tests/
  frontend/  Angular app (core/, shared/, layouts/, features/), assets/images
  docs/      API.md, Postman collection, manual test checklist
```

## 1. Requirements (Windows + VS Code)
- Node.js **20.19+ or 22.x LTS** (`node -v`), npm 10+
- Angular CLI 19: `npm install -g @angular/cli@19` (optional – `npx ng` also works)
- Chrome (for frontend unit tests)

## 2. Backend (terminal 1, folder `autocare-pro\backend`)
```powershell
cd autocare-pro\backend
npm install
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Edit `.env`: paste the generated value into `JWT_ACCESS_SECRET`, set `SEED_ADMIN_EMAIL` and a strong `SEED_ADMIN_PASSWORD` (8+ chars, upper, lower, digit, symbol). Optional: set `SEED_DEMO_PASSWORD` to create demo customer/advisor/technician + demo appointments and invoice.
```powershell
npm run seed          # creates missing JSON files + admin; never overwrites existing data
npm run dev           # or: npm start  → http://localhost:5000/api/health
npm test              # backend unit + API integration tests (node:test)
```
`npm run seed:reset -- --yes` wipes and recreates all data (explicit confirmation required).

## 3. Frontend (terminal 2, folder `autocare-pro\frontend`)
```powershell
cd autocare-pro\frontend
npm install
npm start             # ng serve → http://localhost:4200
npm test              # Karma/Jasmine (Chrome)
npm run build         # production build in dist/
```
Backend URL: `src/environments/environment.development.ts` (`apiUrl`). Ports: backend `PORT` in `.env`; frontend `angular.json → serve.options.port` (or `ng serve --port 4300`). If you change the frontend port, also update `CORS_ORIGIN` and `FRONTEND_URL` in `.env`.

## 4. Signing in
- **Admin:** `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → forced to change password → `/admin`.
- **Customer:** register at `/register` (or demo `customer@autocarepro.local`).
- **Staff:** admin → Technicians & Staff → *Create staff account* (temporary password, must change at first login), or demo `advisor@…` / `technician@autocarepro.local` with `SEED_DEMO_PASSWORD`. Technicians only see jobs assigned to their linked technician profile.

## 5. Security design
bcrypt hashes (12 rounds) · 15‑min JWT access token kept in memory · rotating httpOnly SameSite=Strict refresh cookie with reuse detection · role read from storage on every request · backend role checks on every protected route · ownership checks return 404 (no IDOR) · unknown fields stripped (no role/price injection) · server-side prices, totals and availability · helmet headers, CORS allow-list, 100 kb body limit, rate limits on auth/contact · account lockout after 5 failed logins · CSV formula-injection protection · no file uploads (images are static assets). Production: `NODE_ENV=production`, HTTPS, `COOKIE_SECURE=true`, `DEV_SHOW_RESET_LINK=false`, real email provider for reset links.

## 6. JSON storage – limitations
`repositories/jsonStore.js` serializes writes per file, writes to a temp file then atomically renames, keeps a `.bak`, recovers from malformed JSON and never crashes the server. This is safe for **one Node process** (college project / small local deployment). Multiple server instances or heavy concurrent writes need a real database or transactional storage. Extra files beyond the required nine: `sessions.json` (refresh tokens), `contactMessages.json`. Workshops and offers live in `settings.json`; invoices are part of `serviceRecords.json`.

## 7. Integrations not configured (clearly labelled in the UI)
Email/SMS (notifications are in-app; reset links print to the backend console in dev) · payment gateway (staff record counter payments or labelled DEMO payments) · Google Maps (paste an embed URL in Business Settings). All business contact details are sample placeholders.

## 8. Troubleshooting
- `JWT_ACCESS_SECRET must be set` → create `.env` from `.env.example`.
- `EADDRINUSE` → change `PORT` or close the other process (`netstat -ano | findstr :5000`).
- UI says "Cannot reach the server" → backend not running or `apiUrl` wrong.
- CORS error → `CORS_ORIGIN` must exactly match the browser origin. Use `localhost` everywhere (not 127.0.0.1) so the refresh cookie is sent.
- Logged out after refresh → cookies blocked, or origin mismatch as above.
- PowerShell blocks `ng` → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` or use `npx ng serve`.
- `STORAGE_CORRUPT` → fix/restore the named JSON file (a `.corrupt-*` copy is kept) or run the seed.

See `docs/API.md`, `docs/AutoCarePro.postman_collection.json`, `docs/MANUAL_TEST_CHECKLIST.md`.
