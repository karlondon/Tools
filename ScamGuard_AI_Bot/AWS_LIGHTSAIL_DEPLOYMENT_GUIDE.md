# ScamGuard AI Bot - AWS Lightsail Deployment Guide

## Complete step-by-step guide to deploy, run, and connect your mobile phones

---

## 📊 Monthly Cost Breakdown

### Recommended Setup: Lightsail $5/month Instance

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| **AWS Lightsail Instance** ($5 plan) | **$5.00** | 1 GB RAM, 1 vCPU, 40 GB SSD, 2 TB transfer |
| **OpenAI API** (gpt-4o-mini) | **$1-5** | ~$0.15 per 1M input tokens; typical personal use = $1-5/mo |
| **Telegram Bot API** | **FREE** | Telegram bots are completely free |
| **Static IP** (Lightsail) | **FREE** | Free when attached to a running instance |
| **Domain name** (optional) | $0-12/yr | Not required for this bot |
| | | |
| **TOTAL (Budget Option)** | **~$6-10/month** | With OpenAI gpt-4o-mini |
| **TOTAL (Free AI Option)** | **~$7-10/month** | Using $7 Lightsail (2GB RAM) + Ollama (local AI, no API cost) |

### Plan Options

| Lightsail Plan | RAM | vCPU | Storage | Monthly | Best For |
|---------------|-----|------|---------|---------|----------|
| **$3.50** | 512 MB | 1 | 20 GB | $3.50 | ❌ Too small, not recommended |
| **$5.00** ⭐ | 1 GB | 1 | 40 GB | $5.00 | ✅ **Best for OpenAI mode** |
| **$10.00** | 2 GB | 1 | 60 GB | $10.00 | ✅ Good for Ollama (local AI) |
| **$20.00** | 4 GB | 2 | 80 GB | $20.00 | Best for Ollama with larger models |

> **💡 Recommendation**: Start with the **$5/month** plan using OpenAI API. The bot itself uses minimal resources — the AI processing happens on OpenAI's servers. Total cost: ~**$6-10/month**.

### Free Tier Note
AWS Lightsail offers **3 months free** on the $3.50 and $5.00 plans for new AWS accounts.

---

## 🔧 Prerequisites (Do These First on Your Phone/Computer)

### Step 1: Create a Telegram Bot

1. Open **Telegram** on your phone (Android or iPhone)
2. Search for **@BotFather** and start a chat
3. Send `/newbot`
4. Choose a name: e.g., `My ScamGuard Bot`
5. Choose a username: e.g., `my_scamguard_bot` (must end in `bot`)
6. **Save the bot token** - it looks like: `7123456789:AAH_your_token_here`

### Step 2: Get Your Telegram User ID

1. Open Telegram, search for **@userinfobot**
2. Start a chat and send any message
3. It will reply with your **User ID** (a number like `123456789`)
4. **Save this number** — this is your `OWNER_TELEGRAM_ID`

### Step 3: Get an OpenAI API Key (Recommended)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account and add billing ($5 minimum credit)
3. Go to **API Keys** → **Create new secret key**
4. **Save the key** — starts with `sk-`

### Step 4: Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Create a free account (requires credit card)
3. You get 3 months free on Lightsail

---

## 🚀 Server Setup on AWS Lightsail

### Step 1: Create a Lightsail Instance

1. Log into [AWS Lightsail Console](https://lightsail.aws.amazon.com)
2. Click **Create instance**
3. Choose settings:
   - **Region**: Pick the closest to you (e.g., `eu-west-2` for London)
   - **Platform**: **Linux/Unix**
   - **Blueprint**: **OS Only** → **Ubuntu 22.04 LTS**
   - **Instance plan**: **$5/month** (1 GB RAM, 1 vCPU)
   - **Instance name**: `scamguard-bot`
4. Click **Create instance**
5. Wait 2-3 minutes for it to launch

### Step 2: Set Up a Static IP (Recommended)

1. In Lightsail, go to **Networking** tab
2. Click **Create static IP**
3. Attach it to your `scamguard-bot` instance
4. This ensures your server keeps the same IP address

### Step 3: Connect to Your Server

**Option A: Browser-based SSH (easiest)**
1. In Lightsail, click on your instance
2. Click the **Connect using SSH** button (orange terminal icon)

**Option B: From your computer's terminal**
1. Download the SSH key from Lightsail → **Account** → **SSH Keys**
2. Connect:
```bash
ssh -i ~/Downloads/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP
```

### Step 4: Install Required Software

Once connected to your server via SSH, run these commands one by one:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+ and pip
sudo apt install -y python3 python3-pip python3-venv git

# Verify Python version (should be 3.10+)
python3 --version
```

### Step 5: Deploy the ScamGuard Bot

> **Note:** ScamGuard_AI_Bot is a subfolder inside the `karlondon/Tools` repository, not its own separate repo. Use one of the options below to get just the bot files onto your server.

**Option A: Clone the repo and copy the subfolder (Recommended)**

```bash
# Clone the full Tools repo to a temp location
cd /tmp
git clone https://github.com/karlondon/Tools.git

# Copy just the ScamGuard_AI_Bot folder to your home directory
cp -r /tmp/Tools/ScamGuard_AI_Bot ~/scamguard

# Clean up the temp clone
rm -rf /tmp/Tools

# Go to the bot directory
cd ~/scamguard
```

**Option B: Use git sparse checkout (advanced, clones only the bot folder)**

```bash
mkdir ~/scamguard && cd ~/scamguard
git init
git remote add origin https://github.com/karlondon/Tools.git
git config core.sparseCheckout true
echo "ScamGuard_AI_Bot/*" >> .git/info/sparse-checkout
git pull origin main
# Move files up from the subfolder
mv ScamGuard_AI_Bot/* . && mv ScamGuard_AI_Bot/.* . 2>/dev/null; rmdir ScamGuard_AI_Bot
```

**Option C: Upload files using SCP from your Mac**

Run this from **your Mac** (not the server):
```bash
cd "/Users/karthiksankaran/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/___REPOS/PS-Scripts"
scp -i ~/Downloads/LightsailDefaultKey.pem -r ScamGuard_AI_Bot/* ubuntu@YOUR_STATIC_IP:~/scamguard/
```

### Step 6: Set Up Python Environment

Back on the server:

```bash
cd ~/scamguard

# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 7: Configure the Bot

```bash
# Copy the example config
cp .env.example .env

# Edit the configuration
nano .env
```

**Fill in your real values in the `.env` file:**

```env
# === REQUIRED ===
TELEGRAM_BOT_TOKEN=7123456789:AAH_your_actual_token_here
OWNER_TELEGRAM_ID=123456789

# === AI PROVIDER ===
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_actual_openai_key_here
OPENAI_MODEL=gpt-4o-mini

# === THRESHOLDS ===
SCAM_THRESHOLD=0.7
LEGITIMATE_THRESHOLD=0.3

# === RESPONSE DELAYS (seconds) ===
MIN_RESPONSE_DELAY=5
MAX_RESPONSE_DELAY=120

# === LOGGING ===
LOG_LEVEL=INFO
LOG_FILE=logs/scamguard.log

# === DATABASE ===
DATABASE_PATH=data/scamguard.db
```

Save and exit: Press `Ctrl+X`, then `Y`, then `Enter`.

### Step 8: Test the Bot

```bash
# Make sure you're in the right directory with venv active
cd ~/scamguard
source venv/bin/activate

# Run the bot (test mode)
python -m src.main
```

You should see:
```
ScamGuard AI Bot Starting...
Starting Telegram bot...
Telegram bot started successfully
ScamGuard Bot is running. Press Ctrl+C to stop.
```

**Test from your phone:**
1. Open Telegram
2. Find your bot (search for the username you created)
3. Send `/start` — you should get a response with stats
4. Send `/help` — you should see all available commands

Press `Ctrl+C` to stop the test.

### Step 9: Set Up as a Background Service (Run Forever)

Create a systemd service so the bot runs automatically and starts on reboot:

```bash
sudo nano /etc/systemd/system/scamguard.service
```

Paste this content:

```ini
[Unit]
Description=ScamGuard AI Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/scamguard
Environment=PATH=/home/ubuntu/scamguard/venv/bin:/usr/bin
ExecStart=/home/ubuntu/scamguard/venv/bin/python -m src.main
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save and exit (`Ctrl+X`, `Y`, `Enter`), then:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable scamguard

# Start the service
sudo systemctl start scamguard

# Check it's running
sudo systemctl status scamguard
```

You should see `Active: active (running)` in green.

### Step 10: Useful Service Commands

```bash
# Check status
sudo systemctl status scamguard

# View live logs
sudo journalctl -u scamguard -f

# View recent logs
sudo journalctl -u scamguard --since "1 hour ago"

# Restart the bot
sudo systemctl restart scamguard

# Stop the bot
sudo systemctl stop scamguard

# View application logs
tail -f ~/scamguard/logs/scamguard.log
```

---

## 📱 Connecting Your Mobile Phones (Android & iPhone)

### How It Works

The ScamGuard bot works through **Telegram** — it doesn't install directly on your phone as a traditional app. Here's the architecture:

```
┌──────────────────────────────────────────────────┐
│                  AWS Lightsail                     │
│            ScamGuard AI Bot Server                 │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Scam        │  │ Time-Wasting │  │ Contact  │ │
│  │ Detector    │──│ Responder    │──│ Manager  │ │
│  └─────────────┘  └──────────────┘  └──────────┘ │
└────────────────────────┬─────────────────────────┘
                         │
                    Telegram API
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐
    │ Your    │    │ Scammer   │   │ Genuine   │
    │ Phone   │    │ Messages  │   │ Person    │
    │ (Owner) │    │ → Wasted  │   │ → Polite  │
    └─────────┘    └───────────┘   └───────────┘
```

### Setting Up on Android

1. **Install Telegram** from Google Play Store (if not already installed)
2. Open Telegram and **search for your bot** (the username you created with @BotFather)
3. Tap **Start** to begin interacting
4. Send `/start` to verify the bot responds
5. That's it — the bot is now running!

**To make the bot screen messages from unknown contacts:**
- Have people message your **bot's username** instead of your personal Telegram
- Share the bot username as your "contact" on public profiles
- The bot automatically screens all incoming messages

### Setting Up on iPhone

1. **Install Telegram** from the App Store (if not already installed)
2. Open Telegram and **search for your bot** username
3. Tap **Start**
4. Send `/start` to verify connection
5. You'll now receive notifications from the bot about incoming messages

### How to Use Day-to-Day

**Scenario 1: Scammer messages your bot**
1. Scammer sends a message to your bot
2. Bot detects it as a scam (you get a 🚨 notification)
3. Bot automatically engages the scammer with time-wasting responses
4. After 5+ messages, bot auto-reports and logs the scammer
5. You can type `/block <user_id>` to block them

**Scenario 2: Genuine person messages your bot**
1. Someone sends a genuine message to your bot
2. Bot detects it as legitimate (you get a 📩 notification)
3. Bot sends a polite auto-reply: "Thanks for reaching out, I'll get back to you"
4. You read the notification and decide what to do
5. Type `/whitelist <user_id>` to add them as a trusted contact

**Scenario 3: Uncertain message**
1. Bot can't decide if it's scam or legit (you get a ❓ notification)
2. You review the message
3. Type `/scam <user_id>` or `/legit <user_id>` to classify it

### Owner Commands (from your phone)

| Command | What it does |
|---------|-------------|
| `/start` | Show bot status and stats |
| `/help` | Show all commands |
| `/stats` | Show detection statistics |
| `/whitelist <user_id>` | Add user to trusted contacts |
| `/block <user_id>` | Block a user |
| `/scam <user_id>` | Mark user as scammer |
| `/legit <user_id>` | Mark user as legitimate |
| `/release <user_id>` | Reset a user's status |
| `/report <user_id>` | File a scam report |

### Sharing Your Bot as a Contact Point

To make the bot work as your front-line defence:

1. **On your public profiles** (LinkedIn, websites, forums): share your bot's Telegram link instead of your personal number
   - Link format: `https://t.me/your_bot_username`
2. **In Telegram groups**: use your bot as the first point of contact
3. **Friends/Family**: give them the bot username and tell them to message it — after you whitelist them, future messages pass through

---

## 🔄 Updating the Bot

When you make changes to the code:

```bash
# SSH into your server
ssh -i ~/Downloads/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP

# Option A: If you deployed using SCP (Option C above), re-upload from your Mac:
# (Run from your Mac, not the server)
# scp -i ~/Downloads/LightsailDefaultKey.pem -r ScamGuard_AI_Bot/* ubuntu@YOUR_STATIC_IP:~/scamguard/

# Option B: If you deployed using git clone (Option A above), re-clone and copy:
cd /tmp && rm -rf Tools
git clone https://github.com/karlondon/Tools.git
cp -r /tmp/Tools/ScamGuard_AI_Bot/* ~/scamguard/
rm -rf /tmp/Tools

# Then restart the bot
sudo systemctl restart scamguard

# Verify it's running
sudo systemctl status scamguard
```

---

## 🛡️ Security Hardening (Recommended)

```bash
# 1. Set up automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# 2. Set up a basic firewall
sudo ufw allow ssh
sudo ufw allow 443/tcp   # Only needed if adding webhooks later
sudo ufw enable

# 3. Change the SSH port (optional extra security)
# Edit /etc/ssh/sshd_config and change Port 22 to something else
# Then update Lightsail firewall rules to match
```

---

## 📋 Monitoring & Maintenance

### Daily (Automatic)
- Bot runs 24/7 via systemd
- Auto-restarts on crashes
- Logs all activity

### Weekly (Quick Check)
```bash
# Check the bot is running
sudo systemctl status scamguard

# Check disk usage
df -h

# View stats via Telegram
# Just send /stats to your bot
```

### Monthly
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Python packages
cd ~/scamguard && source venv/bin/activate
pip install --upgrade -r requirements.txt

# Restart bot
sudo systemctl restart scamguard

# Check log file size
du -sh ~/scamguard/logs/
```

---

## 🔧 Troubleshooting

### Bot not responding?

```bash
# Check if the service is running
sudo systemctl status scamguard

# Check the logs
sudo journalctl -u scamguard --since "30 minutes ago"
tail -50 ~/scamguard/logs/scamguard.log

# Restart
sudo systemctl restart scamguard
```

### "Configuration error" in logs?

```bash
# Check your .env file
cat ~/scamguard/.env

# Make sure TELEGRAM_BOT_TOKEN and OWNER_TELEGRAM_ID are set
# Make sure OPENAI_API_KEY is valid (if using OpenAI)
```

### Running out of disk space?

```bash
# Check disk usage
df -h

# Clear old logs
sudo journalctl --vacuum-time=7d
> ~/scamguard/logs/scamguard.log

# Restart
sudo systemctl restart scamguard
```

### Server not accessible?

1. Go to AWS Lightsail Console
2. Check instance is running (green dot)
3. Try the browser-based SSH connection
4. Check the Networking tab for firewall rules

---

## 💰 Cost Optimisation Tips

1. **Use gpt-4o-mini** instead of gpt-4o — it's 15x cheaper and works great for scam detection
2. **Start with the $5 plan** — you can always upgrade later from the Lightsail console with no downtime
3. **Set `SCAM_THRESHOLD=0.7`** — this reduces false AI calls by letting the pattern matcher handle obvious scams
4. **Monitor OpenAI usage** at [platform.openai.com/usage](https://platform.openai.com/usage)
5. **Free alternative**: Use Ollama on a $10 plan for zero API costs (but slower responses)

---

## 🆓 Free AI Alternative: Using Ollama (No API Cost)

If you want to avoid OpenAI costs entirely:

```bash
# On the server (need $10/month plan - 2GB RAM minimum)
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download a small model
ollama pull llama3.2:3b   # ~2GB, fits in 2GB RAM

# Update your .env
nano ~/scamguard/.env
```

Change AI settings to:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

Then restart: `sudo systemctl restart scamguard`

**Total cost with Ollama: $10/month** (server only, no API fees)

---

## 📱 WhatsApp Integration (Future)

WhatsApp integration requires the **WhatsApp Business API** from Meta, which needs:
- A Meta Business account
- Business verification
- A dedicated phone number
- Webhook endpoint (HTTPS)

This is more complex and costs additional money ($0.005-0.08 per conversation). The bot architecture already supports WhatsApp via the `whatsapp_connector.py` stub — it just needs the API credentials configured. Instructions for WhatsApp Business API setup will be added in a future update.

---

## ✅ Quick Reference: Complete Setup Checklist

- [ ] Create Telegram bot via @BotFather → get bot token
- [ ] Get your Telegram user ID via @userinfobot
- [ ] Get OpenAI API key from platform.openai.com
- [ ] Create AWS account
- [ ] Create Lightsail instance ($5/month, Ubuntu 22.04)
- [ ] Attach static IP
- [ ] SSH into server
- [ ] Install Python 3 and git
- [ ] Upload/clone ScamGuard code
- [ ] Create virtual environment and install dependencies
- [ ] Configure `.env` with your tokens
- [ ] Test the bot manually (`python -m src.main`)
- [ ] Send `/start` from Telegram to verify
- [ ] Set up systemd service for auto-start
- [ ] Enable the service
- [ ] Test that bot survives a server reboot
- [ ] Share bot username as your public contact point

**Estimated total setup time: 30-45 minutes**