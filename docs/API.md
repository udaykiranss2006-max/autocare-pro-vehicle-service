# AutoCare Pro REST API (base: http://localhost:5000/api)
Response: `{ "success": true, "data": ..., "meta"?: {page,limit,total,totalPages} }` · Error: `{ "success": false, "error": { "code", "message", "details"? } }`
Auth: `Authorization: Bearer <accessToken>` (15 min). Refresh token = httpOnly cookie `acp_rt` (rotated). Cookie endpoints need header `X-Requested-With: AutoCarePro`.
Status codes: 200/201 ok · 400 bad request · 401 unauthenticated · 403 forbidden / PASSWORD_CHANGE_REQUIRED · 404 not found (also used for other users' records) · 409 conflict (DUPLICATE_ACCOUNT, SLOT_UNAVAILABLE, …) · 422 VALIDATION_ERROR / INVALID_TRANSITION · 423 locked · 429 rate limited · 500 STORAGE_ERROR.

| Method & path | Role | Notes |
|---|---|---|
| POST /auth/register | public | fullName,email,phone,password,confirmPassword,address?,acceptTerms. Always creates a customer |
| POST /auth/login | public | email,password,rememberMe → accessToken + cookie |
| POST /auth/refresh · /auth/logout | cookie | rotate / revoke refresh token |
| GET /auth/me | any | current user |
| POST /auth/forgot-password · /auth/reset-password | public | token emailed (dev: printed in console) |
| POST /auth/change-password | any | currentPassword,newPassword,confirmPassword |
| GET /services · /services/categories · /services/:idOrSlug | public | filters: category, vehicleType, bookingMode, search, sort, popular; admin `all=true` |
| POST/PUT/PATCH/DELETE /services/:id | admin | catalog management |
| GET/POST /vehicles · GET/PUT/DELETE /vehicles/:id · GET /vehicles/:id/history | customer (own) / staff | registration number validated vs settings |
| GET /workshops · /workshops/:id/availability?date= | public | slots with remaining capacity |
| POST/PUT/DELETE /workshops/:id | admin | hours, capacity, closed dates |
| POST /appointments/estimate | customer | server-side price |
| POST /appointments | customer | re-checks availability inside a write lock |
| GET /appointments · /appointments/:id · /appointments/:id/actions | scoped | filters: status, scope, from, to, workshopId, technicianId, search, page, limit, sort |
| PUT /appointments/:id | customer notes / manager assign, ETA, internal notes, pickup status | |
| PATCH /appointments/:id/status | admin, advisor, assigned technician | validated transitions, history records who/when |
| PATCH /appointments/:id/reschedule · /cancel | customer (rules) / admin / advisor | |
| GET/PUT /appointments/:id/service-record | staff | labour, parts, checklist, discount (managers) |
| GET /service-records (= /invoices) · /:id · /:id/invoice | scoped | |
| POST /service-records/:id/payments | admin, advisor | cash/card/UPI at counter or labelled demo |
| GET /reviews/public · GET /reviews/mine · POST /reviews · PUT /reviews/:id | public / customer | completed appointments only, one per appointment |
| GET /reviews · PATCH /reviews/:id/moderate · DELETE /reviews/:id | admin | |
| GET /notifications · /unread-count · PATCH /:id/read · /read-all · DELETE /:id | any | |
| POST /notifications/broadcast · /run-reminders | admin | |
| GET /dashboard/customer · /admin · /staff | role | live statistics |
| GET /reports/summary?period=daily\|weekly\|monthly&from&to · /reports/export?type=appointments\|revenue\|customers | admin | CSV export |
| GET /settings/public · GET/PUT /settings | public / admin | |
| GET/POST/PUT/DELETE /offers · /technicians | admin (offers list public) | |
| GET /users · /users/:id · POST /users/staff · PATCH /users/:id/status · /role | admin | users cannot change their own role |
| GET/PUT /profile | any | name, phone, address |
| POST /contact · GET/PATCH /contact | public / admin, advisor | |
