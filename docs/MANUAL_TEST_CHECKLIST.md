# Manual end-to-end checklist
1. Home loads with live popular services, offers, workshops; "Book" while logged out redirects to sign-in.
2. Register: empty form errors; weak password; mismatched confirm; duplicate email → message + sign-in link.
3. Login: wrong password → "Invalid email or password"; 5 wrong tries → temporary lock; correct → customer dashboard.
4. Admin first login is forced to Change Password; every other page is blocked until changed.
5. Add vehicle with invalid plate (rejected), valid plate (TS09EA1234 / 22BH1234AA), duplicate plate (409).
6. Book: 7 steps → confirmation page shows reference only after the API saved it. Past dates/closed days are not bookable.
7. Fill a slot to capacity (set capacity 1 in Workshops), try booking the same slot from a second customer → "slot was just booked".
8. Customer B opens customer A's appointment URL → "Appointment not found".
9. Admin confirms, assigns technician; technician signs in and only sees assigned jobs; starts work, adds labour/parts, completes → invoice generated, customer notified.
10. Customer cancels within cutoff (blocked) and outside cutoff (allowed, reason required); reschedule limit enforced.
11. Record cash payment (status Paid) and demo payment (Paid - DEMO only).
12. Customer reviews completed service once; second review blocked; admin approves → appears on home page.
13. Notifications: unread badge, mark read, mark all read; run reminder job.
14. Reports: daily/weekly/monthly; CSV export opens in Excel.
15. Stop the backend → UI shows "Cannot reach the AutoCare Pro server".
16. Corrupt a data file (e.g. type `{x` into reviews.json) → server keeps running, recovers from .bak or returns a clear STORAGE_CORRUPT error.
17. Resize to mobile: navbar burger, dashboard sidebar drawer, tables scroll; keyboard Tab shows focus rings.
