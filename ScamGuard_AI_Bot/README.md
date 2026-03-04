# ScamGuard AI Bot 🛡️

**AI-Powered Scam Detection & Auto-Response Bot for Telegram & WhatsApp**

An intelligent bot system that automatically screens messages from unknown contacts, detects scammers/hackers, wastes scammers' time with convincing but useless responses, and forwards legitimate messages to you.

## 🎯 What This Bot Does

1. **Screens unknown contacts** - Automatically responds to messages from people not in your contacts
2. **Scam Detection** - Uses AI to analyze messages for scam patterns (phishing, advance-fee fraud, romance scams, tech support scams, etc.)
3. **Scammer Time-Wasting** - Engages scammers in believable but pointless conversations, wasting their time
4. **Legitimate Message Forwarding** - Identifies genuine messages and politely tells the sender you'll be in touch, then notifies you
5. **Background Reporting** - Automatically reports identified scammers to platform abuse systems

## ⚠️ Platform Feasibility Matrix

| Feature | Telegram | WhatsApp | Phone Calls |
|---------|----------|----------|-------------|
| Auto-respond to messages | ✅ Fully Supported | ⚠️ Limited (Business API) | ❌ Not feasible |
| Scam detection | ✅ Fully Supported | ⚠️ Limited | ❌ N/A |
| Time-wasting responses | ✅ Fully Supported | ⚠️ Limited | ❌ N/A |
| Forward genuine messages | ✅ Fully Supported | ⚠️ Limited | ❌ N/A |
| Report scammers | ✅ Supported | ❌ No API | ❌ N/A |
| Works on Android | ✅ Yes | ⚠️ Via WA Business | ❌ N/A |
| Works on iPhone | ✅ Yes | ⚠️ Via WA Business | ❌ N/A |

### Key Platform Limitations

#### Telegram ✅ (Best Platform for This)
- **Telegram Bot API** is fully open and free
- Bots can receive and respond to messages automatically
- Users can set up a bot and forward unknown messages to it
- OR use **Telegram Userbot** (via Telethon/Pyrogram) to auto-monitor your personal account
- Works identically on Android and iPhone (bot runs server-side)

#### WhatsApp ⚠️ (Significant Limitations)
- **WhatsApp Business API** requires Meta approval and a business phone number
- **No official personal account automation** - WhatsApp actively blocks unofficial bots
- Unofficial libraries (whatsapp-web.js) exist but violate ToS and risk account bans
- **Recommended approach**: Use WhatsApp Business API with a separate number as a screening gateway

#### Phone Calls ❌ (Not Feasible as Described)
- Neither Android nor iOS allows apps to auto-answer and conduct AI conversations on calls
- **Alternative**: Use a VoIP number (Twilio) as your public number, with AI answering via Twilio
- This gives full call screening capability but requires a separate phone number

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  ScamGuard AI Bot                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Telegram  │  │ WhatsApp │  │ Twilio (Optional) │  │
│  │ Connector │  │Connector │  │  Voice Connector  │  │
│  └─────┬────┘  └─────┬────┘  └────────┬──────────┘  │
│        │              │                │              │
│        └──────────┬───┘────────────────┘              │
│                   │                                    │
│           ┌───────▼────────┐                          │
│           │ Message Router  │                          │
│           └───────┬────────┘                          │
│                   │                                    │
│           ┌───────▼────────┐                          │
│           │  Scam Detector  │◄── AI/ML Engine         │
│           │  (OpenAI/Local) │                          │
│           └───────┬────────┘                          │
│                   │                                    │
│          ┌────────┼────────┐                          │
│          │                 │                           │
│   ┌──────▼──────┐  ┌──────▼──────┐                   │
│   │Scam Response │  │  Legitimate  │                  │
│   │  Generator   │  │  Forwarder   │                  │
│   │(Time Waster) │  │  & Notifier  │                  │
│   └──────┬──────┘  └──────┬──────┘                   │
│          │                 │                           │
│   ┌──────▼──────┐  ┌──────▼──────┐                   │
│   │  Scammer    │  │   Owner     │                    │
│   │  Reporter   │  │Notification │                    │
│   └─────────────┘  └─────────────┘                   │
│                                                       │
│   ┌─────────────────────────────────────────────┐    │
│   │          Contact Database / Whitelist         │    │
│   └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- A Telegram account + Bot Token (from @BotFather)
- OpenAI API key (or use local Ollama for free)
- (Optional) WhatsApp Business API access
- (Optional) Twilio account for voice call screening

### Installation

> **Note:** ScamGuard_AI_Bot is a subfolder inside the [`karlondon/Tools`](https://github.com/karlondon/Tools) repository. You don't need to clone the entire repo — just extract this folder.

```bash
# Clone the Tools repo and extract only the ScamGuard_AI_Bot folder
cd /tmp
git clone https://github.com/karlondon/Tools.git
cp -r /tmp/Tools/ScamGuard_AI_Bot ~/scamguard
rm -rf /tmp/Tools

# Set up the bot
cd ~/scamguard
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys (see AWS_LIGHTSAIL_DEPLOYMENT_GUIDE.md for details)
python3 -m src.main
```

**Alternative: Direct SCP from local machine (if you have the files already)**
```bash
scp -r ScamGuard_AI_Bot/* ubuntu@YOUR_SERVER_IP:~/scamguard/
```

### Mobile Access
The bot runs as a **server-side application** - it works the same regardless of whether you use Android or iPhone. Your phone simply receives notifications from the bot via Telegram.

## 📁 Project Structure

```
ScamGuard_AI_Bot/
├── README.md
├── FEASIBILITY_REPORT.md          # Detailed technical feasibility analysis
├── ARCHITECTURE.md                 # System architecture document
├── requirements.txt
├── .env.example
├── config/
│   ├── scam_patterns.yaml          # Known scam patterns & keywords
│   └── responses.yaml              # Time-wasting response templates
├── src/
│   ├── main.py                     # Entry point
│   ├── bot_manager.py              # Bot lifecycle management
│   ├── connectors/
│   │   ├── telegram_connector.py   # Telegram Bot/Userbot integration
│   │   └── whatsapp_connector.py   # WhatsApp Business API integration
│   ├── detection/
│   │   ├── scam_detector.py        # AI-powered scam detection engine
│   │   └── pattern_matcher.py      # Rule-based pattern matching
│   ├── response/
│   │   ├── scam_responder.py       # Time-wasting response generator
│   │   └── legitimate_handler.py   # Genuine message handler
│   ├── reporting/
│   │   └── scam_reporter.py        # Background scam reporting
│   └── utils/
│       ├── contact_manager.py      # Known contacts database
│       └── notification.py         # Owner notification system
└── tests/
    ├── test_scam_detector.py
    └── test_scam_responder.py
```

## 📜 License

MIT License - Use responsibly and ethically.