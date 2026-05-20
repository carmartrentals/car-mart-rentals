# Car Mart Rentals

A full-stack **luxury car rental website + rental management system** for Car Mart
Rentals — a complete platform to manage vehicles, reservations, customers,
payments, check-in/out, documents and reporting, plus a customer-facing booking
website and a REST API for a future mobile app.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Supabase**
(Postgres + Auth + Storage) and **Stripe**.

---

## ✨ What's included (Phase 1 MVP)

**Customer website**
- Premium luxury home page with hero booking search
- Vehicle listing with real-time filters (category, fuel, seats, price)
- Vehicle detail pages — gallery, specs, pricing, policies, add-ons
- Booking checkout flow (creates a pending reservation)
- Static pages: About, Contact, Insurance Rentals, Luxury Rentals, FAQ, Terms,
  Privacy

**Admin management system** (`/admin`)
- Secure staff login with 5 roles (Super Admin, Manager, Staff, Accountant, Viewer)
- Dark-sidebar SaaS dashboard with live operational stats
- **Vehicle management** — full CRUD, specs, pricing, images, status
- **Reservation management** — full CRUD, pricing engine, status workflow,
  double-booking prevention
- **Customer CRM** — full CRUD, driver license, insurance/claim data, rental history
- **Availability calendar** — fleet timeline (Gantt) + monthly grid views

**REST API** (`/api/v1`) — versioned endpoints for the future mobile app.

> Modules scheduled for later phases (check-in/out, damage, maintenance,
> invoices/PDF, payments/Stripe, reports, settings editor, notifications) have
> their **database schema, types and API foundations already in place** — the
> admin panel shows them as "scheduled" placeholders.

---

## 🧱 Tech stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Framework   | Next.js 15 (App Router), React 19           |
| Language    | TypeScript                                  |
| Styling     | Tailwind CSS                                |
| Database    | Supabase PostgreSQL                         |
| Auth        | Supabase Auth (role-based)                  |
| Storage     | Supabase Storage                            |
| Payments    | Stripe (Phase 2)                            |
| PDF         | @react-pdf/renderer (Phase 2)               |
| Deployment  | Vercel                                      |

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) project

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy the example env file and fill in your values:
```bash
cp .env.example .env.local
```
Get the Supabase keys from **Supabase Dashboard → Project Settings → API**.
At minimum you need:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Set up the database
In the **Supabase Dashboard → SQL Editor**, run the migration files in
`supabase/migrations/` **in order**:

1. `0001_init.sql` — tables, enums, indexes, triggers, helper functions
2. `0002_rls.sql` — Row Level Security policies
3. `0003_seed.sql` — auth hook, roles, settings, add-ons, fees, agreement
   template, and all 7 fleet vehicles
4. `0004_storage.sql` — storage buckets and policies

### 5. Create your first admin user
1. **Supabase Dashboard → Authentication → Users → Add User** — create a user
   with your email and a password (enable "Auto Confirm").
2. A profile row is auto-created in `public.users`. Promote it to Super Admin in
   the SQL Editor:
   ```sql
   update public.users set role = 'super_admin' where email = 'you@example.com';
   ```

### 6. Run the app
```bash
npm run dev
```
- Customer website → http://localhost:3000
- Admin panel → http://localhost:3000/admin

---

## 📁 Project structure

```
src/
  app/
    (site)/            Customer-facing website (home, vehicles, booking, static)
    admin/
      login/           Staff login
      (panel)/         Authenticated admin dashboard + modules
    api/
      booking/         Public website booking endpoint
      v1/              Versioned REST API (mobile-app ready)
  components/
    site/              Website components (navbar, vehicle card, booking widgets)
    admin/             Admin components (sidebar, forms, calendar, tables)
    ui/                Reusable UI primitives (button, card, table, modal...)
  lib/
    supabase/          Browser / server / service-role / token clients
    data/              Data-access helpers
    types/             Database TypeScript types
    pricing.ts         Reservation pricing engine
    validation.ts      Zod schemas
    auth.ts            Auth + role/permission helpers
supabase/
  migrations/          SQL migrations (run these in order)
```

---

## 🔌 REST API

Base path: `/api/v1` — see `GET /api/v1` for the discovery document.

| Method | Endpoint                     | Auth | Description                       |
|--------|------------------------------|------|-----------------------------------|
| GET    | `/api/v1/vehicles`           | —    | List fleet (filters, paging)      |
| GET    | `/api/v1/vehicles/:id`       | —    | Vehicle by id or slug             |
| GET    | `/api/v1/availability`       | —    | Availability check / booked ranges|
| GET    | `/api/v1/reservations`       | ✓    | List reservations                 |
| POST   | `/api/v1/reservations`       | ✓    | Create a reservation              |
| GET    | `/api/v1/customers`          | ✓    | List customers                    |
| POST   | `/api/v1/customers`          | ✓    | Create a customer                 |

Authenticated endpoints accept a Bearer token — either the
`API_BEARER_SECRET` (server-to-server) or a Supabase user access token.

---

## 🗺️ Roadmap

- **Phase 2** — Check-in/out workflow, inspection photos, PDF agreements &
  invoices, Stripe payments & deposits
- **Phase 3** — Customer portal, reports & CSV export, agreement/email template
  editors, email notifications
- **Phase 4** — Mobile app, staff mobile check-in/out, telematics/GPS

---

## 📦 Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy. Set `NEXT_PUBLIC_SITE_URL` to your production domain.

---

## Scripts

| Command           | Description                  |
|-------------------|------------------------------|
| `npm run dev`     | Start the dev server         |
| `npm run build`   | Production build             |
| `npm run start`   | Run the production build     |
| `npm run lint`    | Lint                         |
| `npm run typecheck` | TypeScript check           |
