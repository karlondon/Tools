# VibeList 3-Tier Setup

## .env additions
```
PAYPAL_PLAN_ID_SILVER=P-XXXXXXXX
PAYPAL_PLAN_ID_PRO=P-XXXXXXXX
```

## Create Silver PayPal Plan
Use PayPal API to create a £5/mo GBP plan. Copy the plan ID to PAYPAL_PLAN_ID_SILVER. Your existing plan becomes PAYPAL_PLAN_ID_PRO.

## Rebuild
```
docker compose build && docker compose up -d
```

## Tiers
- Free: 3 listings, 2 images, no private gallery
- Silver £5/mo: 10 listings, 5 images, 2 private
- Pro £15/mo: unlimited listings/images, 10 private
- Founding members: permanent Pro