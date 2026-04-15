# Gilded Companions (gild3d.com)

> A premium escort/companion listing and booking platform. Clients browse profile listings, message companions directly, and book InCall/OutCall appointments paid via Bitcoin.

---

## Platform Overview

### Two User Types

| Role | Description |
|------|-------------|
| **Profile (Companion)** | Creates a listing with public gallery, private gallery (photos + videos), hourly rates, InCall/OutCall availability |
| **Member (Client)** | Browses listings, sends messages, books appointments via wizard |

---

## Core Features

### 1. Profile Listings
- **Public gallery** — standard photos visible to all
- **Private gallery** — photos & videos unlocked by premium membership or one-time unlock payment
- List view **or** tile/grid view toggle
- Rich filters (location, availability, rates, services, age)
- Sortable by: newest, price low/high, rating

### 2. Messaging
- Logged-in members can message any profile directly
- Ask for details, negotiate, etc.
- Messages tied to member account

### 3. Booking Wizard (InCall / OutCall)

**Step 1 — Choose appointment type:**
- **InCall** — client travels to companion's location
- **OutCall** — companion travels to client's location

**Step 2 — Select date:**
- Calendar picker (future dates only)

**Step 3 — Select time & duration:**
- 24-hour time picker (hourly blocks)
- Minimum 1 hour booking
- "How many hours?" input
- Shows calculated total price (hourly rate × hours)

**Step 4 — Location details (OutCall only):**
- Client provides: city/address or hotel name
- Room number: confirmed on day of appointment

**Step 5 — Bitcoin payment:**
- Invoice generated via BTCPay Server
- Total = hourly rate × duration
- Payment confirms booking

**Confirmation:**
- Email sent to member's registered email with full booking details
- Booking reference number generated

### 4. Booking Management
- Members can view upcoming/past bookings
- Companions can see their bookings dashboard
- Booking statuses: Pending → Confirmed → Completed / Cancelled

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 |
| Auth | JWT |
| Payments | BTCPay Server (Bitcoin) |
| Email | Nodemailer (SMTP) |
| Media | Multer → AWS S3 (photos + videos) |
| Infra | Docker Compose, Nginx, AWS Lightsail (US-East) |

---

## Project Structure

```
gild3d-app/
├── docker-compose.yml
├── .env.example
├── nginx/nginx.conf
├── backend/
│   ├── prisma/schema.prisma     # DB schema incl. Booking, PrivateMedia
│   └── src/
│       ├── controllers/
│       │   ├── authController.ts
│       │   ├── profileController.ts
│       │   ├── messageController.ts
│       │   ├── bookingController.ts   ← booking wizard logic
│       │   └── paymentController.ts
│       └── routes/
└── frontend/
    └── app/
        ├── page.tsx              # Landing
        ├── browse/               # Listing (tile + list view, filters)
        ├── profile/[id]/         # Profile + public/private gallery
        ├── book/[profileId]/     # Booking wizard (5 steps)
        ├── bookings/             # My bookings
        ├── messages/             # Inbox
        └── upgrade/              # Membership plans
```

---

## Database Models

| Model | Key Fields |
|-------|-----------|
| `User` | email, passwordHash, role (MEMBER/COMPANION), membershipTier |
| `Profile` | displayName, location, hourlyRate, inCall, outCall, bio |
| `Photo` | url, isPrivate, isPrimary, order |
| `PrivateMedia` | url, type (PHOTO/VIDEO), isPrivate |
| `Message` | senderId, receiverId, content |
| `Booking` | memberId, profileId, type (INCALL/OUTCALL), date, startTime, hours, totalAmount, status, hotelName, address |
| `Payment` | bookingId, btcpayInvoiceId, status, amountUsd |

---

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Profiles (Listings)
- `GET /api/profiles` — Browse with filters (paginated)
- `GET /api/profiles/:id` — Profile + public gallery
- `GET /api/profiles/:id/private` — Private gallery (auth + premium check)
- `PUT /api/profiles/me` — Update own listing
- `POST /api/profiles/me/photos` — Upload photos
- `POST /api/profiles/me/private-media` — Upload private photos/videos

### Messages
- `GET /api/messages`
- `GET /api/messages/:userId`
- `POST /api/messages/:userId`

### Bookings
- `POST /api/bookings` — Create booking (step 1-4 data)
- `GET /api/bookings` — My bookings (member or companion)
- `GET /api/bookings/:id` — Booking detail
- `PATCH /api/bookings/:id/cancel` — Cancel booking
- `POST /api/bookings/:id/payment` — Create BTCPay invoice for booking

### Payments
- `GET /api/payments/plans`
- `POST /api/payments/invoice`
- `POST /api/payments/webhook` — BTCPay webhook

---

## Booking Flow

```
Browse Listings
    ↓
View Profile (public gallery)
    ↓  [unlock private gallery - optional]
Message Companion (ask details)
    ↓
Click "Book Now"
    ↓
Step 1: InCall or OutCall?
    ↓
Step 2: Pick a date (calendar)
    ↓
Step 3: Pick start time + duration (hours)
    ↓
Step 4: OutCall → hotel name + address
    ↓
Step 5: Pay with Bitcoin (BTCPay invoice)
    ↓
Booking Confirmed → Email sent to member
```

---

## Quick Start (Local)

```bash
cd gild3d-app
cp .env.example .env          # fill in all values
docker compose up -d --build
docker compose exec backend npx prisma migrate dev --name init
```

---

## Deployment

See **[LIGHTSAIL_DEPLOY.md](./LIGHTSAIL_DEPLOY.md)** — full AWS Lightsail guide.

**Estimated monthly cost**: ~$30–40/mo (Lightsail 4GB + optional BTCPay instance).

---

## Roadmap (pending client requirements)

- [ ] Companion availability calendar (block out dates)
- [ ] Review & rating system (post-appointment)
- [ ] Admin moderation dashboard
- [ ] Profile verification badges
- [ ] SMS notifications (Twilio)
- [ ] Mobile-optimised PWA
- [ ] Multi-currency display (show BTC + USD equivalent)
- [ ] Referral / affiliate system

---

## Legal

- 18+ platform — age confirmation required at registration
- Operators are responsible for compliance with local laws
- This software facilitates bookings only; operators must ensure legal compliance in their jurisdiction