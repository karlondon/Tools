# Meme Dating App — Step-by-Step Implementation Guide

This guide walks from an empty GCP project to a published iOS + Android app. It assumes a small team (1-4 engineers) and sequences work so each phase produces something testable.

---

## Phase 0 — Foundations (Week 1)

1. **Legal/business setup first** (blocks app store approval later, so start now):
   - Register a business entity if you don't have one (required for Apple Developer Program's org account and for payment processor/tax purposes).
   - Draft a Privacy Policy and Terms of Service (required by both app stores before submission — use a lawyer or a reputable generator, then have counsel review given the sensitive data involved; see `SECURITY_MODEL.md` §6).
   - Apple Developer Program enrollment ($99/yr) — can take a few days for org verification, start immediately.
   - Google Play Console account ($25 one-time) + complete the "Dating" category declaration and required Data Safety form.

2. **GCP project setup**:
   ```bash
   gcloud projects create meme-dating-app-prod --organization=YOUR_ORG_ID
   gcloud config set project meme-dating-app-prod
   gcloud services enable run.googleapis.com firestore.googleapis.com \
     storage.googleapis.com vision.googleapis.com secretmanager.googleapis.com \
     cloudkms.googleapis.com pubsub.googleapis.com identitytoolkit.googleapis.com \
     cloudbuild.googleapis.com armor.googleapis.com
   ```
   - Create separate `dev`, `staging`, `prod` GCP projects from day one — never build features against a single shared project you later have to split.

3. **Repo structure**:
   ```
   meme-dating-app/
     mobile/            # Flutter app
     backend/
       profile-service/
       match-service/
       chat-service/
       media-service/
       moderation-service/
       billing-service/
     infra/             # Terraform
     docs/              # this folder
   ```

4. **Terraform bootstrap**: define the three environments' core resources (project, Firestore in Native mode, Cloud Storage buckets, service accounts) as code from the start — do not click-ops in the console for anything beyond initial exploration.

---

## Phase 1 — Identity & Data Foundations (Weeks 2-3)

1. **Enable Firebase** on top of the GCP project (Firebase is a layer on GCP, same project).
2. **Firebase Auth**: enable Phone and Email/Password providers. Configure App Check (see Security) to block API abuse from non-genuine app instances.
3. **Firestore schema** (start simple, iterate):
   ```
   users/{uid}
     - displayName, birthdate, genderPrefs, bio
     - geohash (server-set only, never client-writable)
     - createdAt, verifiedAt, status (active/shadow-banned/deleted)
   users/{uid}/memes/{memeId}
     - storagePath, caption, tags[], moderationStatus, createdAt
   swipes/{swipeId}
     - swiperUid, targetUid, action (like/pass/superlike), createdAt
   matches/{matchId}
     - userIds[2], createdAt, lastMessageAt
   matches/{matchId}/messages/{messageId}
     - senderUid, body (encrypted), createdAt, readAt
   reports/{reportId}
     - reporterUid, targetUid, reason, status, createdAt
   ```
4. **Firestore Security Rules**: write rules that deny by default; a user can only read/write their own `users/{uid}` doc directly, everything else (swipes, matches, moderation status) goes through backend services using the Admin SDK — this is what actually enforces the access model, not just backend code.
5. Deploy Firestore indexes needed for the match engine's geohash + preference queries.

---

## Phase 2 — Core Backend Services (Weeks 3-6)

Build and deploy each as an independent Cloud Run service. Suggested order (each unblocks the next):

1. **Profile Service** — CRUD for `users/{uid}`, enforces age gate (18+) and required-field validation server-side (never trust client validation alone).
2. **Media Service** — issues signed Cloud Storage upload URLs; on finalize, triggers the moderation pipeline (Cloud Function → Vision SafeSearch + CSAM hash match). Only marks a meme visible after passing.
3. **Match Engine** — swipe endpoint writes to a Pub/Sub topic (`swipes`); a subscriber computes mutual likes and creates `matches/{matchId}`. Candidate-deck endpoint queries Firestore by geohash neighbors + preference filters, excludes already-swiped and blocked users.
4. **Chat Service** — uses Firestore realtime listeners directly from the client for read (with security rules scoping access to match participants only) and a Cloud Run endpoint for send (so you can enforce moderation/rate-limits server-side on write).
5. **Notification Service** — Cloud Function triggered on new match/message documents, sends FCM push.
6. **Billing Service** — validates Play/App Store receipts server-side, grants entitlements (boosts, super-likes, subscription tier) in Firestore.

For each service: containerize (Dockerfile), deploy via `gcloud run deploy`, wire into Cloud Build for CI, attach its own least-privilege service account (per `SECURITY_MODEL.md` §2.2).

---

## Phase 3 — API Gateway & Edge (Week 6)

1. Deploy **Cloud Load Balancer** with managed SSL certificate in front of Cloud Run services (or use Cloud Run's built-in domain mapping for simplicity at MVP scale, upgrading to full LB when you need Cloud Armor rules).
2. Configure **Cloud Armor**: enable OWASP rule set, rate-limit rules per endpoint (especially OTP request and swipe endpoints).
3. Set up **API Gateway** (or a lightweight Express/Fastify middleware layer if simpler for your stack) to validate Firebase ID tokens on every request before it reaches backend services.

---

## Phase 4 — Mobile App (Weeks 4-10, parallel with backend)

1. **Scaffold Flutter app**:
   ```bash
   flutter create meme_dating_app
   cd meme_dating_app
   flutter pub add firebase_core firebase_auth cloud_firestore firebase_storage \
     firebase_messaging flutter_riverpod go_router cached_network_image
   ```
2. **Connect Firebase**: run `flutterfire configure` to wire up iOS/Android Firebase config automatically.
3. **Build core screens** in this order (each is independently testable):
   - Onboarding: phone/email auth, age gate, basic profile creation
   - Meme upload/gallery: camera + gallery picker, upload via signed URL
   - Swipe deck: card stack UI, calls Match Engine's candidate endpoint
   - Match list + chat: Firestore realtime listeners for messages
   - Settings: block/report, account deletion, notification preferences
4. **Platform-specific setup**:
   - iOS: configure `Info.plist` permissions (camera, photo library, location — with clear usage-description strings, required by Apple review), push notification capability + APNs key uploaded to Firebase.
   - Android: configure `AndroidManifest.xml` permissions, notification channel setup for FCM.
5. **App Check**: integrate Firebase App Check (DeviceCheck on iOS, Play Integrity on Android) so backend can reject requests not originating from your genuine app build — closes off a major API-abuse vector.
6. **Certificate pinning** (recommended before GA) to harden against MITM on public wifi, common in dating-app threat models.

---

## Phase 5 — Trust & Safety Features (Weeks 8-10, do not skip/defer)

Both app stores will reject a dating/UGC app without these — build alongside core features, not after:

1. Block user (immediate, bidirectional) and report user (with reason categories) flows in both mobile UI and backend.
2. Human moderation queue (even a simple internal admin tool backed by a `reports` collection) with an SLA to act within 24 hours, per Apple's UGC guideline.
3. Shadow-ban capability in Profile Service (`status: shadow-banned` excludes user from candidate decks without notifying them).
4. In-app safety resources (e.g., link to safety tips, emergency resources) — increasingly expected in dating app review.

---

## Phase 6 — Testing & Hardening (Weeks 10-12)

1. **Automated tests**: unit tests per backend service, widget tests for critical Flutter screens, integration test for the full swipe→match→chat flow against the `staging` project.
2. **Load testing**: simulate swipe/chat traffic against staging Cloud Run services (e.g., with `k6` or Locust) to validate autoscaling config before real users hit it.
3. **Security review**:
   - Run through `SECURITY_MODEL.md` as a checklist.
   - Commission a third-party penetration test if budget allows, focused on location privacy (trilateration) and auth/session handling.
   - Verify Firestore Security Rules with the Firebase emulator's rules test suite — this is the actual enforcement layer, test it explicitly.
4. **Privacy/compliance pass**: confirm account deletion actually removes data within your stated SLA, confirm Play Store Data Safety form and Apple Privacy Nutrition Label accurately reflect real data collection (mismatches are a common rejection/removal reason).

---

## Phase 7 — App Store Submission (Weeks 12-13)

1. **Fastlane setup** for both platforms to automate build/sign/upload:
   ```bash
   cd mobile/ios && fastlane init
   cd mobile/android && fastlane init
   ```
2. **iOS (App Store Connect)**:
   - Upload build via Fastlane/Xcode, fill out App Privacy details, age rating (17+ typically required for dating apps due to mature content/UGC).
   - Provide demo account credentials for reviewers (dating apps commonly get manual review — expect this and prep a reviewer note explaining moderation approach).
3. **Android (Play Console)**:
   - Complete Data Safety section, Content Rating questionnaire, and the Dating apps policy declaration.
   - Submit to Internal Testing → Closed Testing (get real users through a beta) → Production.
4. Expect **1-3 rounds of review feedback** on a first dating-app submission, commonly around: age verification adequacy, report/block visibility, or privacy disclosure completeness. Budget 2-4 weeks of buffer beyond initial submission.

---

## Phase 8 — Launch & Post-Launch (Ongoing)

1. **Observability**: dashboards in Cloud Monitoring for API latency/error rate per service, Firebase Crashlytics for mobile crash reporting, alerting on moderation queue backlog and swipe/match error rates.
2. **Analytics**: Firebase Analytics events for onboarding funnel, swipe/match/chat engagement, exported to BigQuery for deeper analysis.
3. **On-call rotation** for the moderation queue (trust & safety response time is both a compliance and retention issue) and for production incidents.
4. **Iterate on matching**: once you have swipe/match data, consider a Vertex AI-based ranking model to replace the initial heuristic ranker in Match Engine — swap-in only, keep the API contract stable.

---

## Rough Timeline Summary

| Phase | Duration | Key Output |
|---|---|---|
| 0. Foundations | Week 1 | GCP projects, legal docs, repo scaffolding |
| 1. Identity & Data | Weeks 2-3 | Auth working, Firestore schema + rules deployed |
| 2. Backend Services | Weeks 3-6 | All Cloud Run services deployed to staging |
| 3. API Gateway/Edge | Week 6 | LB + Cloud Armor + token validation live |
| 4. Mobile App | Weeks 4-10 (parallel) | Flutter app feature-complete against staging |
| 5. Trust & Safety | Weeks 8-10 (parallel) | Block/report/moderation live |
| 6. Testing & Hardening | Weeks 10-12 | Load-tested, security-reviewed |
| 7. Store Submission | Weeks 12-13 | Submitted to both stores |
| 8. Launch | Week 14+ | Live, monitored, iterating |

**Total: ~3-3.5 months** to first public release for a small team, assuming no major review rejections. Add buffer for app store review cycles, which are the least controllable variable in this timeline.
