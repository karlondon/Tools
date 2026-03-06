# VibeList Payment & Subscription Setup Guide

## Overview

VibeList supports **3 payment methods** for the £25/month subscription:

| Method | Setup Difficulty | Requirements | Recurring? |
|--------|-----------------|-------------|------------|
| **PayPal** | Easy | Personal PayPal account | ✅ Automatic |
| **Crypto (BTC/ETH)** | Manual | Crypto wallet | ❌ Manual activation |
| **Bank Transfer** | Manual | Bank account | ❌ Manual activation |

---

## Option 1: PayPal Subscriptions (Recommended)

### What You Need
- A **PayPal Business account** (free to create, no company registration needed)
- You can use a personal PayPal and upgrade to Business for free

### Step 1: Create PayPal Business Account

1. Go to https://www.paypal.com/uk/business
2. Click **"Sign Up"**
3. Choose **"Individual/Sole Proprietor"** (no company needed)
4. Enter your details:
   - **Your name** (legal name)
   - **Email address**
   - **Business name**: `VibeList` (or your trading name)
   - **Business type**: `Individual/Sole Proprietor`
   - **Product/Service**: `Digital Services` → `Online Advertising`
5. Verify your email and link a bank account

### Step 2: Create a Subscription Plan in PayPal

1. Log in to https://developer.paypal.com
2. Go to **Dashboard** → **Apps & Credentials**
3. Click **"Create App"**:
   - **App Name**: `VibeList`
   - **Type**: `Merchant`
4. Note down the **Client ID** and **Secret**

5. Go to **Dashboard** → **Subscriptions** (or use REST API)
6. Create a **Product**:
   - **Name**: `VibeList Pro Subscription`
   - **Type**: `SERVICE`
   - **Category**: `ADVERTISING`

7. Create a **Plan**:
   - **Product**: Select the one you just created
   - **Name**: `VibeList Monthly Pro`
   - **Billing Cycle**: Monthly
   - **Price**: £25.00 GBP
   - **Auto-renew**: Yes

8. Note down the **Plan ID** (starts with `P-`)

### Step 3: Configure on Server

SSH into your server and update the `.env` file:

```bash
ssh -i LightsailDefaultKey-eu-west-2.pem ubuntu@13.43.41.233
cd ~/vibelist
nano .env
```

Add these lines:
```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_secret_here
PAYPAL_PLAN_ID=P-your_plan_id_here
PAYPAL_API=https://api-m.sandbox.paypal.com

# Security
JWT_SECRET=generate-a-random-string-here
ADMIN_KEY=your-secret-admin-key-here
```

> **Important**: Start with `sandbox` API for testing. When ready to go live, change to:
> ```
> PAYPAL_API=https://api-m.paypal.com
> ```
> And use your **Live** credentials (not Sandbox).

### Step 4: Set Up PayPal Webhook (for automatic renewals)

1. In PayPal Developer Dashboard → **Webhooks**
2. Add webhook URL: `https://vibelist.uk/api/subscription/paypal/webhook`
3. Select events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`

---

## Option 2: Crypto Payments (BTC/ETH)

### How It Works
1. User contacts you (via email/form) requesting crypto payment
2. You provide your wallet address
3. User sends £25 equivalent in BTC or ETH
4. You verify the transaction and manually activate their subscription

### Your Wallet Addresses
Set up wallets and share addresses:
- **Bitcoin (BTC)**: Use any wallet (Coinbase, Exodus, Trust Wallet)
- **Ethereum (ETH)**: Use any ERC-20 compatible wallet

### Manual Activation
Once payment is confirmed, activate the user via API:

```bash
curl -X POST https://vibelist.uk/api/subscription/manual/activate \
  -H "Content-Type: application/json" \
  -d '{
    "admin_key": "your-secret-admin-key",
    "user_id": 123,
    "months": 1,
    "provider": "crypto-btc"
  }'
```

### Future: Automated Crypto
For automated crypto subscriptions in the future, consider:
- **BTCPay Server** (self-hosted, no fees)
- **CoinGate** (hosted, 1% fee)
- **NOWPayments** (hosted, 0.5% fee)

---

## Option 3: Bank Transfer

### How It Works
1. User sends £25 to your bank account
2. They include their VibeList email as reference
3. You manually activate their subscription

### Manual Activation
Same as crypto — use the admin API endpoint.

---

## Testing the Flow

### 1. Test Registration (age verification)
```bash
# Should succeed (over 18)
curl -X POST https://vibelist.uk/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","date_of_birth":"1990-01-15"}'

# Should fail (under 18)
curl -X POST https://vibelist.uk/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"young@example.com","password":"testpass123","date_of_birth":"2015-01-15"}'
```

### 2. Test Login
```bash
curl -X POST https://vibelist.uk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 3. Test Posting (should fail without subscription)
```bash
TOKEN="your-jwt-token-here"
curl -X POST https://vibelist.uk/api/vibes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Vibe","description":"Testing"}'
# Returns: {"error":"Active subscription required","code":"NO_SUBSCRIPTION"}
```

### 4. Manually Activate Subscription (for testing)
```bash
curl -X POST https://vibelist.uk/api/subscription/manual/activate \
  -H "Content-Type: application/json" \
  -d '{"admin_key":"your-admin-key","user_id":1,"months":1,"provider":"manual"}'
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|------------|---------|
| `PAYPAL_CLIENT_ID` | PayPal app client ID | `AaBbCc123...` |
| `PAYPAL_CLIENT_SECRET` | PayPal app secret | `EeFfGg456...` |
| `PAYPAL_PLAN_ID` | PayPal subscription plan ID | `P-1AB23456CD789012E` |
| `PAYPAL_API` | PayPal API base URL | `https://api-m.sandbox.paypal.com` |
| `JWT_SECRET` | Secret for signing auth tokens | `my-super-secret-key-123` |
| `ADMIN_KEY` | Secret key for admin operations | `admin-secret-xyz` |

---

## User Flow Summary

```
1. User visits vibelist.uk
2. Browses vibes (free, no login needed)
3. Clicks "Register" → enters email, password, DOB
4. Server checks DOB → must be 18+
5. User is logged in but has "none" subscription
6. Clicks "+ Add a Vibe" → redirected to subscription page
7. Clicks "Subscribe with PayPal" → redirected to PayPal
8. Completes PayPal payment → redirected back
9. Subscription activated → can now post vibes
10. PayPal handles monthly renewals automatically