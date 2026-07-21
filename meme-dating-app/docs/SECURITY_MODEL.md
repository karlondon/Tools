# Meme Dating App — Security Model

Dating apps handle some of the most sensitive data categories that exist: precise location, sexual orientation/preference, private photos, and private messages. A breach is not just a PR problem — it can put users at real physical risk. Treat security as a launch blocker, not a post-launch cleanup task.

## 1. Threat Model

| Actor | Motivation | Example Attack |
|---|---|---|
| Malicious user | Harassment, stalking, scamming | Fake profile, location deanonymization, catfishing, romance scams |
| Competitor / scraper | Data theft | Scraping profiles/photos at scale via API abuse |
| Criminal (external attacker) | Financial gain, extortion | Account takeover, data breach for blackmail (dating data is high-leverage for extortion) |
| Insider | Curiosity, malice | Engineer/support agent browsing private messages or photos without cause |
| Nation-state / advanced actor | Surveillance | Unlikely for MVP, but relevant if targeting sensitive populations (e.g., LGBTQ+ users in hostile jurisdictions) |
| CSAM/exploitation actor | Abuse of platform | Uploading illegal content, grooming minors |

## 2. Identity & Access Management

### 2.1 User Authentication
- **Firebase Auth** for identity: phone number (SMS OTP) or email/social login. Phone verification is strongly recommended as the primary factor — raises the cost of mass fake-account creation.
- Enforce **email/phone verification before profile visibility** — unverified accounts cannot appear in the swipe deck.
- **Age gate**: mandatory birthdate at signup, hard block under 18 (dating apps are 18+ only — Apple/Google will reject otherwise). Do not rely on self-attestation alone if budget allows a third-party age-verification/ID-check vendor for at least a sample or on report.
- Session tokens: short-lived Firebase ID tokens (1 hour) + refresh tokens; revoke refresh tokens on logout, password change, or suspicious activity.

### 2.2 Service-to-Service IAM
- Every Cloud Run service gets its **own dedicated service account** with least-privilege IAM bindings (e.g., Chat Service can write to `chats/*` Firestore collection only, not `profiles/*`).
- No service uses the default Compute Engine service account.
- Use **Workload Identity Federation** for CI/CD (Cloud Build/GitHub Actions) instead of long-lived JSON key files.
- VPC Service Controls around the project to prevent data exfiltration to unauthorized GCP projects.

### 2.3 Internal (Employee/Admin) Access
- Admin/support console requires SSO + mandatory MFA (Google Workspace + a hardware key or authenticator app).
- **All access to raw user data (messages, photos, precise location) by employees is logged and requires a documented reason** (support ticket ID) — build an audit trail (Cloud Audit Logs), not just access control.
- Principle of least privilege: support agents get a redacted view (e.g., can see "user reported for harassment" context) without needing full message history unless escalated.

## 3. Data Protection

### 3.1 Encryption
- **In transit**: TLS 1.3 everywhere — client↔LB, and service↔service within GCP (Cloud Run supports this by default within the VPC boundary; enforce via Cloud Armor/LB config).
- **At rest**: Firestore and Cloud Storage are encrypted at rest by default (Google-managed keys). For an extra layer on the most sensitive fields (precise geolocation, private photos), use **Cloud KMS customer-managed encryption keys (CMEK)** so Google's own operational access is also gated by your key policy.
- **Chat messages**: consider client-side encryption (E2E) for message bodies as a differentiator/trust signal — even if not full E2E at MVP, encrypt message content at the application layer with a key not directly tied to the raw Firestore document, so a Firestore-level breach doesn't equal plaintext message leakage.

### 3.2 Location Privacy (Critical for Dating Apps)
This is the single most important dating-app-specific control — multiple dating apps have been publicly shown to leak precise user location, enabling stalking.
- **Never send precise lat/long to the client for other users.** Only send a coarse distance ("3 miles away") or a fuzzed/truncated geohash.
- Store precise location server-side only, used internally for candidate ranking; round/fuzz before any value leaves the backend.
- Add randomized jitter (e.g., ±0.5–1 mile) to displayed distance, re-randomized periodically, to prevent trilateration attacks (repeated distance queries from fake moved positions to triangulate exact location).
- Rate-limit and monitor for the trilateration pattern specifically: many profile-view requests for the same target from the "attacker" account, or an attacker account whose reported location changes unnaturally fast.

### 3.3 Photo/Meme Content
- Strip **EXIF metadata** (which can contain GPS coordinates, device info) from all uploaded images server-side before storage — do this unconditionally, never trust the client to have done it.
- Signed, time-limited URLs for private media (e.g., photos not yet public/matched) rather than public Cloud Storage buckets.
- **CSAM detection is mandatory, not optional**: integrate Google's CSAI Match API (or equivalent) on every image upload before it becomes visible to any other user. Report confirmed matches to NCMEC per legal obligation (US) — consult legal counsel on jurisdiction-specific reporting requirements before launch.

### 3.4 PII Minimization
- Collect only what's needed: don't require full legal name, exact address, etc.
- Support **account deletion that actually deletes** (or irreversibly anonymizes) data within a committed SLA (e.g., 30 days), including backups — required for GDPR/CCPA compliance and increasingly expected by users of sensitive apps.
- Data retention policy: define explicit TTLs for swipe logs, rejected/unmatched profile views, and moderation queue items rather than retaining indefinitely.

## 4. Application-Layer Security

### 4.1 API Security
- All endpoints require a valid Firebase Auth JWT; validate signature, expiry, and audience on every request at the API Gateway layer (don't trust individual services to re-implement this correctly).
- **Rate limiting per user AND per IP** on: swipe actions, message sends, profile views, signup/OTP requests (prevents scraping, spam, and OTP-bombing abuse).
- Input validation and output encoding on all user-generated text (bios, chat messages) to prevent stored XSS if any web surface exists (e.g., admin panel rendering user content).
- CSRF protection on any web-based admin/support tooling.

### 4.2 Abuse & Trust Safety
- **Block/report is a day-one feature, not a fast-follow.** Blocking must be immediate and bidirectional (blocked user can't see or message the blocker, and vice versa) and must survive re-matching logic.
- Shadow-ban capability for accounts under investigation (reduce their visibility without alerting them, pending review).
- Automated fake-account signals: device fingerprint reuse, disposable phone number/email detection, velocity checks (accounts created per device/IP per hour).
- Text moderation (toxicity/harassment classifier) on chat messages and bios, with a human review queue for edge cases — don't rely on pure automation for account bans, which are high-stakes false-positive-sensitive actions.

### 4.3 Payment Security
- No card data ever touches your backend — Play Billing / StoreKit handle PCI scope entirely.
- Server-side receipt validation only (never trust client-reported purchase state) via Play Developer API / App Store Server API before granting entitlements.

## 5. Infrastructure Security

- **Cloud Armor** WAF rules (OWASP Top 10 rule set) in front of the Load Balancer.
- **VPC Service Controls** to create a service perimeter around Firestore/Storage/BigQuery — prevents data exfiltration even if a credential leaks.
- **Secret Manager** for all API keys/secrets; no secrets in source, container images, or environment variable literals in Terraform state.
- **Binary Authorization** on Cloud Run: only allow deployment of container images signed/built by your CI pipeline, blocking unauthorized image deploys.
- Dependency scanning (Cloud Build integration with a SCA tool, or GitHub Dependabot) on both backend and Flutter dependencies.
- Regular **penetration testing** before major launches — dating apps are a high-value target class; budget for at least one third-party pentest pre-GA.

## 6. Compliance Checklist

| Requirement | Applies When | Action |
|---|---|---|
| GDPR | Any EU users | DPA with GCP, data subject access/deletion requests, lawful basis for processing, EU data residency if required |
| CCPA/CPRA | California users | Privacy policy disclosures, opt-out of data sale (you're not selling data — say so explicitly), deletion rights |
| COPPA | Any minor could sign up | Hard 18+ age gate, no data collection from under-13s (should be entirely blocked) |
| Apple App Store Guideline 1.2 (UGC) | Always, for UGC apps | Report/block mechanism, content moderation, ability to filter objectionable content, 24-hour moderation response capability |
| Google Play Dating/Social Policy | Always | Similar UGC + safety requirements, plus Play's own age/verification expectations |
| CSAM reporting (NCMEC, US) | Always, any image upload | Automated detection + mandatory reporting pipeline (Section 3.3) |
| State-level dating safety laws | US — e.g., some states require ID verification or safety disclosures for dating apps | Check current requirements in your launch states before GA |

## 7. Incident Response

- Define an **incident response runbook** before launch: who's on call, escalation path, user notification templates for a breach.
- Log retention sufficient for forensic investigation (Cloud Audit Logs, application logs) — balance against the PII minimization principle above (retain access logs longer than raw content where possible).
- Pre-drafted breach notification process meeting GDPR's 72-hour requirement if EU users are in scope.

## 8. Security Ownership Summary

| Layer | Primary Control | Owner |
|---|---|---|
| Network edge | Cloud Armor, Load Balancer TLS | Platform/Infra |
| AuthN/AuthZ | Firebase Auth, IAM least privilege | Backend |
| Data at rest | Firestore/Storage encryption, CMEK | Platform/Infra |
| Location privacy | Server-side fuzzing, geohash truncation | Backend (Match Engine) |
| Content safety | CSAM scan, moderation pipeline | Trust & Safety |
| Payments | Play Billing/StoreKit + server validation | Backend (Billing) |
| Mobile client | Secure storage, cert pinning | Mobile |
| Compliance | Privacy policy, deletion SLAs, reporting | Legal + Backend |
