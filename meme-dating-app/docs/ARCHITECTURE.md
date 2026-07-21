# Meme Dating App — Architecture

## 1. Overview

A meme-based dating app matches users on shared humor rather than (or in addition to) traditional swiping-on-photos. Users build profiles around memes they post/react to, swipe on other users' meme feeds, and match when there's mutual interest. The architecture below assumes:

- **Mobile clients**: Flutter (single codebase → iOS + Android)
- **Cloud**: Google Cloud Platform
- **Scale target**: MVP → 50k users, designed to scale to millions without a rewrite

## 2. High-Level Diagram

```
                         ┌─────────────────────────┐
                         │   iOS App / Android App   │
                         │   (Flutter, one codebase) │
                         └────────────┬──────────────┘
                                      │ HTTPS/WSS (TLS 1.3)
                                      ▼
                         ┌─────────────────────────┐
                         │   Cloud Load Balancer     │
                         │   + Cloud Armor (WAF)     │
                         └────────────┬──────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │   API Gateway             │
                         │   (JWT validation,        │
                         │    rate limiting)         │
                         └────────────┬──────────────┘
                                      ▼
        ┌────────────────┬──────────────────────┬───────────────────┐
        ▼                ▼                      ▼                   ▼
 ┌─────────────┐  ┌──────────────┐     ┌─────────────────┐  ┌──────────────┐
 │ Profile Svc │  │ Match Engine  │     │  Chat Service    │  │ Media Svc     │
 │ (Cloud Run) │  │ (Cloud Run)   │     │  (Cloud Run +    │  │ (Cloud Run)   │
 │             │  │               │     │   Pub/Sub)       │  │               │
 └──────┬──────┘  └───────┬──────┘      └────────┬─────────┘  └──────┬───────┘
        │                 │                      │                   │
        ▼                 ▼                      ▼                   ▼
 ┌─────────────┐  ┌──────────────┐     ┌─────────────────┐  ┌──────────────┐
 │  Firestore   │  │  Firestore /  │     │   Firestore      │  │ Cloud Storage │
 │  (profiles)  │  │  Memorystore  │     │   (messages)      │  │ (meme images/ │
 │              │  │  (swipe deck, │     │   + FCM push      │  │  video)       │
 │              │  │   geo index)  │     │                   │  │               │
 └─────────────┘  └──────────────┘     └─────────────────┘  └──────┬───────┘
                                                                     ▼
                                                          ┌─────────────────────┐
                                                          │ Moderation Pipeline  │
                                                          │ Cloud Functions →    │
                                                          │ Vision API SafeSearch│
                                                          │ + CSAM hash match +  │
                                                          │ Text moderation      │
                                                          └─────────────────────┘

 Supporting services (cross-cutting):
 - Firebase Auth (identity, phone/email/social login)
 - Cloud KMS + Secret Manager (encryption keys, secrets)
 - Cloud Storage + Cloud CDN (meme asset delivery)
 - BigQuery + Firebase Analytics (product analytics)
 - Cloud Logging / Monitoring / Error Reporting (observability)
 - Cloud Build + Fastlane (CI/CD, app store delivery)
 - Play Billing / StoreKit + Cloud Functions (payments, receipt validation)
```

## 3. Component Breakdown

### 3.1 Mobile Clients
- **Framework**: Flutter — one codebase for iOS and Android, native performance, mature ecosystem for camera/gallery access (needed for meme creation/upload).
- **State management**: Riverpod or Bloc.
- **Local storage**: Secure device keystore (iOS Keychain / Android Keystore) for tokens; no PII cached unencrypted on disk.
- **Push**: Firebase Cloud Messaging (FCM) SDK handles both platforms.

### 3.2 Edge / Gateway
- **Cloud Load Balancer** (HTTPS) terminates TLS, fronts all backend traffic.
- **Cloud Armor** provides WAF rules + DDoS protection, geo-fencing if launching region-by-region.
- **API Gateway** (or Cloud Endpoints) validates Firebase Auth JWTs, applies per-user rate limits, routes to backend services.

### 3.3 Backend Services (Cloud Run)
Stateless, containerized microservices, each with its own least-privilege service account:

| Service | Responsibility |
|---|---|
| Profile Service | CRUD for user profiles, meme galleries, preferences |
| Match Engine | Swipe processing, mutual-like detection, geo-based candidate ranking |
| Chat Service | Message send/receive, conversation state, typing indicators |
| Media Service | Signed upload URLs, meme post-processing (thumbnailing, format conversion) |
| Moderation Service | Orchestrates Vision API + text moderation + human review queue |
| Notification Service | Composes and sends FCM pushes for matches/messages |
| Billing Service | Validates Play Billing / StoreKit receipts, manages subscriptions/boosts |

Why Cloud Run over GKE: no cluster to manage, scales to zero (cost control pre-launch), scales up automatically under load — revisit GKE only if you need sidecars/service mesh at scale.

### 3.4 Data Layer
- **Firestore** (primary datastore): user profiles, matches, chat messages, swipe history. Native mobile SDKs give offline support and realtime listeners for chat — avoids building a custom WebSocket layer for MVP.
- **Memorystore (Redis)**: swipe-deck caching, session/rate-limit counters, "who's online" presence.
- **Cloud SQL (Postgres) — optional, add when needed**: if/when you need complex relational queries (e.g., geo-radius search with PostGIS at scale, or financial reporting), introduce Cloud SQL alongside Firestore rather than forcing everything into one store.
- **Cloud Storage**: original meme uploads, served through **Cloud CDN** for low-latency delivery.
- **BigQuery**: analytics export from Firestore (via scheduled export or Dataflow) for product metrics, cohort analysis.

### 3.5 Meme Content Pipeline
1. Client requests a signed upload URL from Media Service.
2. Client uploads directly to Cloud Storage (bypasses backend for the large binary transfer).
3. Cloud Storage finalize event triggers a Cloud Function.
4. Function calls Vision API SafeSearch + CSAM hash-matching (Google's CSAI Match, mandatory for any UGC image app) + text moderation on captions.
5. Passes → asset marked "approved", becomes visible; CDN cache warmed.
6. Flags → asset quarantined, routed to human moderation queue; user notified if rejected.

### 3.6 Matching Engine Design
- Store user location as a **geohash**, truncated in precision to avoid exposing exact coordinates (see Security Model).
- Candidate generation: query Firestore/Redis for users within geohash neighbors + preference filters (age range, gender preference).
- Ranking: simple score initially (recency, mutual meme-tag overlap, distance) — swap in a learned ranking model later without changing the API contract.
- Swipe writes are append-only events (Pub/Sub topic) consumed asynchronously to update match state — keeps the swipe API latency low even if downstream processing lags.

### 3.7 Payments
- Use **Google Play Billing** and **Apple StoreKit** exclusively for any in-app purchase (boosts, super-likes, subscriptions) — both platforms require this and reject apps that route around it.
- Backend never touches card data. Cloud Function validates purchase receipts server-side against Play Developer API / App Store Server API before unlocking entitlements.

### 3.8 CI/CD
- **Cloud Build**: builds/tests backend containers on push, deploys to Cloud Run (staging → prod with manual promotion gate).
- **Fastlane**: automates iOS/Android build signing and upload to TestFlight / Play Internal Testing, then production tracks.
- **Terraform**: all GCP infra (IAM, Cloud Run services, networking, Firestore indexes) defined as code, reviewed via PR.

## 4. Why These Choices (Trade-offs)

| Decision | Alternative considered | Why this choice |
|---|---|---|
| Flutter over native Swift/Kotlin | Two native codebases | Half the engineering cost/time for MVP; native gap is negligible for this app's feature set |
| Cloud Run over GKE | Kubernetes cluster | No ops overhead, scales to zero, sufficient for microservices at this scale |
| Firestore over Cloud SQL as primary store | Postgres from day one | Realtime listeners + offline sync are built-in, ideal for chat/swipe UX; add Cloud SQL later only if relational needs emerge |
| Firebase Auth over custom auth | Rolling your own auth service | Handles phone/social/email login, MFA, and token issuance correctly out of the box — auth is not where you want to innovate |
| Direct-to-Storage upload over proxying through backend | Uploading through API service | Keeps large binary traffic off your compute layer, cheaper and faster |

## 5. Scaling Path

1. **MVP (0–50k users)**: as described above, single region (e.g., `us-central1`), Cloud Run min instances = 0.
2. **Growth (50k–1M)**: Cloud Run min instances > 0 to avoid cold starts, add Memorystore for hot-path caching, introduce read replicas / Cloud SQL for reporting.
3. **Scale (1M+)**: multi-region deployment, Firestore multi-region mode, CDN edge caching tuned, consider dedicated matching service with a real ranking model (Vertex AI).
