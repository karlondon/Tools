# VibeList.uk — Live Verification (Liveness Check) Future Enablement Guide

## Current State
Currently, VibeList.uk uses **static ID document upload** for identity verification:
- Non-founding members upload a government-issued photo ID (passport, driving licence, etc.)
- Admin manually reviews and approves/rejects the ID

## Future: Live Verification (Liveness Check)

### What Is Liveness Verification?
A **liveness check** confirms the user is a real person (not a photo/deepfake) by asking them to perform actions on camera in real-time, such as:
- Blinking
- Turning their head
- Smiling
- Holding up their ID next to their face

### Recommended Providers (UK-Compatible, GDPR-Compliant)

| Provider | Cost | Features | Integration |
|----------|------|----------|-------------|
| **Onfido** | From £1.50/check | Liveness + document verification, UK-focused, ICO-compliant | REST API + SDK |
| **Jumio** | From £2/check | AI-powered liveness, 200+ countries | REST API + SDK |
| **Veriff** | From £1/check | Real-time video verification, GDPR-compliant | REST API + Web SDK |
| **Yoti** | From £0.50/check | UK-based, age estimation + liveness | REST API + SDK |
| **Sumsub** | From £0.80/check | All-in-one KYC, liveness, document check | REST API + SDK |

### Recommended: **Onfido** (UK-based, excellent GDPR compliance)

### Implementation Steps

#### 1. Sign Up & Get API Keys
```
- Create account at onfido.com
- Get API token (sandbox for testing, live for production)
- Set environment variables: ONFIDO_API_TOKEN
```

#### 2. Backend Changes Required
```typescript
// New endpoints needed:
POST /api/verification/create-check    // Creates an Onfido check
GET  /api/verification/status          // Gets verification status
POST /api/verification/webhook         // Receives Onfido results

// New DB columns:
ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) DEFAULT 'none';
// Values: 'none', 'pending', 'approved', 'rejected'
ALTER TABLE users ADD COLUMN onfido_applicant_id VARCHAR(100);
```

#### 3. Frontend Changes Required
```
- Install Onfido Web SDK: npm install onfido-sdk-ui
- Add verification flow after registration (instead of static ID upload)
- User opens camera, follows on-screen prompts
- SDK handles liveness detection + ID capture
- Results sent to Onfido API → webhook notifies our backend
```

#### 4. Onfido Integration Flow
```
1. User registers → Backend creates Onfido Applicant
2. Backend generates SDK token → Frontend loads Onfido SDK
3. User completes: ID photo + Selfie + Liveness check
4. Onfido processes (usually 10-30 seconds)
5. Webhook: POST /api/verification/webhook → Updates user status
6. User notified: "Verification complete" or "Please retry"
```

#### 5. Cost Estimate
```
At 100 new users/month:
- Onfido: ~£150/month (£1.50/check)
- Yoti: ~£50/month (£0.50/check)
- Veriff: ~£100/month (£1/check)
```

#### 6. GDPR Considerations
- Ensure data processing agreement (DPA) with provider
- Update Privacy Policy to include liveness data processing
- Biometric data falls under "special category data" — needs explicit consent
- Add consent checkbox before liveness check
- Data retention: set auto-delete policy for biometric data (max 30 days)

#### 7. Alternative: DIY Liveness (Not Recommended Initially)
```
- Use MediaPipe Face Detection (free, runs in browser)
- Ask user to blink/turn head, detect with ML model
- Compare selfie to ID photo using face-api.js
- Pros: Free, no third-party dependency
- Cons: Less reliable, no document verification, legal risk
```

### Recommended Rollout Plan
1. **Phase 1 (Current)**: Static ID upload + manual admin review ✅
2. **Phase 2**: Add Onfido/Yoti automated document check (removes manual review burden)
3. **Phase 3**: Add full liveness check for high-value users or flagged accounts
4. **Phase 4**: Make liveness mandatory for all new registrations

### Timeline Estimate
- Phase 2: 2-3 days development + testing
- Phase 3: 3-5 days development + testing
- Phase 4: Configuration change only