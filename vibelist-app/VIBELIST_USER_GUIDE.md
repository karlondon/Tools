# VibeList — Creating & Managing Listings (User Guide)

> **Important:** The backend API has been upgraded from "vibes" to a full classifieds "listings" model. The frontend UI still references the old `/api/vibes` endpoints and needs updating. This guide documents the current working API and how to use it.

---

## 🚨 Known Issue: Frontend Not Yet Updated

The frontend (`page.tsx`) still calls these **old endpoints** that no longer exist:
- `GET /api/vibes` → **Should be** `GET /api/listings`
- `GET /api/vibes/category/:cat` → **Should be** `GET /api/listings?category=:cat`
- `POST /api/vibes` → **Should be** `POST /api/listings`
- `POST /api/vibes/:id/upvote` → **Removed** (listings don't have upvotes)

**This is why posting a vibe fails.** The fix requires updating the frontend to use the new API. See [Frontend Update Required](#frontend-update-required) below.

---

## How a Listing (Vibe) Is Created — Step by Step

### Prerequisites

1. **User must be registered** (18+ age verification on registration)
2. **User must be logged in** (JWT token)
3. **User must have an active subscription** (£25/month via PayPal, crypto, or manual activation)

### Step 1: Register an Account

```
POST /api/auth/register

Body:
{
  "email": "you@example.com",
  "password": "your-secure-password",
  "display_name": "Your Name",
  "date_of_birth": "1990-01-15"
}

Response:
{
  "user": { "id": 1, "email": "you@example.com", "display_name": "Your Name", "subscription_status": "none" },
  "token": "eyJ..."
}
```

Save the `token` — you'll need it for all authenticated requests.

### Step 2: Subscribe (or Get Admin Activation)

**Option A — PayPal:**
1. Call `POST /api/subscription/paypal/create` with your token
2. You'll receive an `approve_url` — open it in a browser to complete payment
3. After PayPal redirects back, call `POST /api/subscription/paypal/activate` with the `subscription_id`

**Option B — Admin Manual Activation:**
An admin can activate your subscription directly in the database or via the API.

**Option C — Already an Admin:**
The "Vibe Admin" account (`ksanks007@gmail.com`) already has admin + active subscription.

### Step 3: Create a Listing

```
POST /api/listings
Authorization: Bearer <your-token>

Body:
{
  "title": "Professional Photography Services in London",
  "description": "Experienced photographer offering portrait, event, and commercial photography across London. 10+ years experience.",
  "category": "services",
  "city": "london",
  "price": 150.00,
  "contact_info": "photo@example.com"
}

Response (201 Created):
{
  "id": 1,
  "user_id": 2,
  "title": "Professional Photography Services in London",
  "description": "Experienced photographer offering...",
  "category": "services",
  "city": "london",
  "price": "150.00",
  "contact_info": "photo@example.com",
  "status": "pending",
  "views": 0,
  "featured": false,
  "created_at": "2026-03-06T15:00:00.000Z",
  "updated_at": "2026-03-06T15:00:00.000Z"
}
```

> **Note:** New listings start with `status: "pending"` and must be approved by an admin before they appear in public search results.

### Step 4: Upload Images (Optional, up to 5)

```
POST /api/listings/:id/images
Authorization: Bearer <your-token>

Body:
{
  "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

- Maximum 5 images per listing
- Supported formats: JPEG, PNG, WebP
- Maximum file size: 5MB per image

### Step 5: Admin Approves the Listing

An admin reviews the listing and approves it:

```
POST /api/admin/listings/:id/approve
Authorization: Bearer <admin-token>
```

Once approved, the listing appears in public search results.

---

## Available Categories

| Category | Description |
|---|---|
| `services` | Professional services, freelancing |
| `events` | Events, parties, meetups |
| `jobs` | Job postings |
| `property` | Property for rent/sale |
| `vehicles` | Cars, bikes, etc. |
| `electronics` | Tech, gadgets, computers |
| `fashion` | Clothing, shoes, accessories |
| `beauty` | Beauty products & services |
| `health` | Health & fitness |
| `community` | Community posts, neighbourhood |
| `other` | Everything else |

## Available Cities

`london`, `manchester`, `birmingham`, `leeds`, `glasgow`, `liverpool`, `bristol`, `edinburgh`, `cardiff`, `belfast`, `sheffield`, `nottingham`, `other`

---

## Validation Rules

| Field | Rule |
|---|---|
| `title` | Required, minimum 5 characters |
| `description` | Required, minimum 10 characters |
| `category` | Must be from the list above (defaults to `other`) |
| `city` | Must be from the list above (defaults to `london`) |
| `price` | Optional, decimal number |
| `contact_info` | Optional, string |

## Rate Limits

- **Registration:** 5 per hour per IP
- **Login:** 10 per 15 minutes per IP
- **Posting listings:** 10 per hour per user
- **Sending messages:** 30 per hour per user

---

## Quick Test via curl (as Vibe Admin)

### 1. Login
```bash
curl -s -X POST http://13.43.41.233/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ksanks007@gmail.com","password":"YOUR_PASSWORD"}' | jq .
```

Save the token from the response.

### 2. Create a Listing
```bash
TOKEN="your-token-here"

curl -s -X POST http://13.43.41.233/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Listing - Photography Services",
    "description": "Professional photography services available across London. Portraits, events, commercial.",
    "category": "services",
    "city": "london",
    "price": 100
  }' | jq .
```

### 3. Approve It (as Admin)
```bash
curl -s -X POST http://13.43.41.233/api/admin/listings/1/approve \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 4. View All Listings
```bash
curl -s http://13.43.41.233/api/listings | jq .
```

---

## All API Endpoints Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user profile |

### Listings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/listings` | No | Browse listings (params: `category`, `city`, `page`, `limit`) |
| GET | `/api/listings/:id` | No | View single listing with images |
| GET | `/api/listings/user/mine` | Yes | View your own listings |
| POST | `/api/listings` | Sub | Create a listing (requires subscription) |
| PUT | `/api/listings/:id` | Yes | Edit your listing |
| DELETE | `/api/listings/:id` | Yes | Delete your listing |

### Images
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/listings/:id/images` | Yes | Upload image (base64) |
| DELETE | `/api/listings/:lid/images/:iid` | Yes | Delete an image |

### Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/messages` | Yes | Send a message |
| GET | `/api/messages` | Yes | Get inbox |
| GET | `/api/messages/conversation/:userId` | Yes | Get conversation with user |

### Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/listings/:id/report` | Yes | Report a listing (reasons: scam, inappropriate, duplicate, spam, other) |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/listings?status=pending` | Admin | View pending listings |
| POST | `/api/admin/listings/:id/approve` | Admin | Approve a listing |
| POST | `/api/admin/listings/:id/reject` | Admin | Reject a listing |
| GET | `/api/admin/reports` | Admin | View pending reports |
| GET | `/api/admin/stats` | Admin | Platform statistics |

### Subscription
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/subscription/config` | No | Get PayPal config & pricing |
| POST | `/api/subscription/paypal/create` | Yes | Start PayPal subscription |
| POST | `/api/subscription/paypal/activate` | Yes | Activate after PayPal approval |
| POST | `/api/subscription/manual/activate` | Admin Key | Manually activate a user |

### Meta
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | API health check |
| GET | `/api/meta/categories` | No | List all categories |
| GET | `/api/meta/cities` | No | List all cities |

---

## Frontend Update Required

The frontend (`vibelist-app/frontend/app/page.tsx`) needs these changes to work with the new backend:

1. **Replace** `GET /api/vibes` → `GET /api/listings` (response is `{listings:[], page, limit}` not a flat array)
2. **Replace** `GET /api/vibes/category/:cat` → `GET /api/listings?category=:cat`
3. **Replace** `POST /api/vibes` → `POST /api/listings` (body needs `title`, `description`, `category`, `city`, `price`, `contact_info`)
4. **Remove** upvote functionality (replaced by views)
5. **Update** categories from `['food','outdoors','music','wellness','culture','nightlife','general']` to the new 11 categories
6. **Add** city filter
7. **Add** listing detail view, image upload, messaging, and admin panel UI

These frontend changes are the next step to make the UI fully functional with the new backend.