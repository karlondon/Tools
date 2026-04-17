# BTCPay Server — Multi-Currency Configuration Guide

> **Status:** Bitcoin (BTC) is fully configured and working.
> This guide covers adding Litecoin, Dash, USDC, and GBP Digital (GBPT).

---

## Prerequisites — SSH into Your Server

All BTCPay configuration starts with logging into your AWS Lightsail instance:

```bash
ssh -i gild3d-app/gild3d-production.pem ubuntu@3.93.100.110
```

Check your BTCPay deployment style:

```bash
ls /home/ubuntu/btcpayserver-docker 2>/dev/null && echo "Docker deployment found"
docker ps | grep btcpay
```

---

## Step 0 — Enable Altcoins in BTCPay Docker

LTC and DASH require BTCPay to be rebuilt with those chains enabled.
Run this on the server:

```bash
cd /home/ubuntu/btcpayserver-docker

export BTCPAYGEN_CRYPTO1=btc
export BTCPAYGEN_CRYPTO2=ltc
export BTCPAYGEN_CRYPTO3=dash
export BTCPAYGEN_ADDITIONAL_PLUGINS=""

. ./btcpay-setup.sh -i
```

> **Skip this step** if BTCPay is embedded inside `docker-compose.yml` rather than a
> separate deployment — in that case LTC and DASH are configured via the BTCPay admin
> UI directly after you supply the wallet xpubs below.

---

## 1. Litecoin (LTC)

Bitcoin.com wallet does **not** support LTC — you need a dedicated LTC wallet.

### Get an LTC xpub

1. Download **Electrum-LTC** from `electrum-ltc.org`
2. Create a new wallet: Standard wallet → Generate new seed
3. Once created: **Wallet → Information**
4. Copy the **Master Public Key** (starts with `Ltub` or `xpub`)

### Configure in BTCPay

1. BTCPay Admin → your Store → **Wallets → Litecoin → Setup**
2. Select: **"I already have a wallet"** → **"Enter xpub"**
3. Paste the xpub from Electrum-LTC
4. Set derivation scheme: `m/44'/2'/0'`
5. Save → Enable LTC as a payment method

---

## 2. Dash (DASH)

Bitcoin.com wallet does **not** support DASH — you need a dedicated DASH wallet.

### Get a DASH xpub

**Option A — Dash Core (full node):**
1. Download **Dash Core** from `dash.org`
2. Let it sync (this takes time)
3. `Tools → Debug Console` → type: `dumphdinfo`
4. Copy the `xpub` value shown

**Option B — Dash Electrum (lighter):**
1. Download from `github.com/akhavr/electrum-dash`
2. Create wallet → **Wallet → Information** → copy Master Public Key

### Configure in BTCPay

1. BTCPay Admin → your Store → **Wallets → Dash → Setup**
2. Select: **"I already have a wallet"** → **"Enter xpub"**
3. Paste the DASH xpub
4. Set derivation scheme: `m/44'/5'/0'`
5. Save → Enable DASH as a payment method

---

## 3. USDC (USD Coin — EVM/Ethereum)

USDC is an ERC-20 token and requires the BTCPay **Ethereum plugin**.

### Step A — Install the Ethereum Plugin

1. BTCPay Admin → **Manage Plugins** (left sidebar)
2. Search for **"Ethereum"** → click **Install**
3. Restart BTCPay when prompted

### Step B — Connect an Ethereum Wallet

You need an Ethereum address. The simplest approach is a single address (not xpub):

| Wallet | How to get address |
|---|---|
| **MetaMask** | Open extension → copy account address (0x...) |
| **Ledger** | Ledger Live → Ethereum account → copy address |
| **Trezor** | Trezor Suite → Ethereum account → copy address |

### Step C — Add USDC in BTCPay

1. BTCPay Admin → Store → **Wallets → Ethereum → Setup**
2. Enter your Ethereum address
3. Go to **Tokens → Add Token:**
   - Name: `USDC`
   - Contract address (Ethereum mainnet): `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
   - Decimals: `6`
4. Save → Enable USDC as a payment method

---

## 4. GBP Digital (GBPT — Tether GBP)

GBPT uses the same Ethereum plugin as USDC — install that first (Step A above).
Both tokens share the same Ethereum wallet address.

### Add GBPT Token in BTCPay

1. BTCPay Admin → Store → **Wallets → Ethereum** (same address as USDC)
2. **Tokens → Add Token:**
   - Name: `GBPT`
   - Contract address (Ethereum mainnet): `0x86B4dBE5D203e634a12364C0e428fa242A3fba98`
   - Decimals: `18`
3. Save → Enable GBPT as a payment method

> **Alternative GBP stablecoins** (same process, different contract address):
> - xGBP: `0x1AbAEA1f7C830bD89Acc67eC4af516284b1bC33c`

---

## 5. Bitcoin (BTC) — Bitcoin.com Wallet Reference

Already working. This is here for reference if you ever need to re-enter the xpub:

1. Open **Bitcoin.com Wallet** app on your phone
2. Tap the Bitcoin wallet → three-dot menu → **Wallet Details**
3. Find **Extended Public Key** — starts with `xpub...`
4. In BTCPay: Store → **Wallets → Bitcoin** → paste the xpub

---

## Summary

| Currency | Wallet Required | BTCPay Location | Status |
|---|---|---|---|
| **BTC** | Bitcoin.com (done) | Wallets → Bitcoin | ✅ Working |
| **LTC** | Electrum-LTC | Wallets → Litecoin → xpub | ⬜ To configure |
| **DASH** | Dash Core or Dash Electrum | Wallets → Dash → xpub | ⬜ To configure |
| **USDC** | MetaMask / Ledger (ETH address) | Ethereum plugin → USDC token | ⬜ To configure |
| **GBPT** | Same ETH address as USDC | Ethereum plugin → GBPT token | ⬜ To configure |

---

## Verifying Everything Works

After configuring each currency:

1. BTCPay Admin → Store → **Settings → Payment Methods**
   - Each enabled currency should show a green tick
2. Create a test invoice: **Invoices → Create Invoice** → set a small amount
   - The checkout page should list all configured currencies
3. The Gild3D booking flow will automatically route to the correct BTCPay payment method
   when a user selects their preferred currency on the Pay Now screen

---

## Gild3D Currency Picker — How It Connects

The frontend currency picker (`bookings/page.tsx`) sends the selected currency to the backend,
which maps it to BTCPay's `defaultPaymentMethod` field:

| User Selection | BTCPay `defaultPaymentMethod` |
|---|---|
| Bitcoin | `BTC` |
| Litecoin | `LTC` |
| Dash | `DASH` |
| USD Coin | `ETH_USDC` |
| GBP Digital | `ETH_GBPT` |

If a currency is selected but not yet enabled in BTCPay, the invoice will still be created —
BTCPay will just show all available payment methods instead of pre-selecting the chosen one.
No errors will occur.

---

*Last updated: April 2026 — BTC payment confirmed working on gild3d.com*
