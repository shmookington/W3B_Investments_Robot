# Frontend Redesign Phase 3: Institutional Onboarding & Authentication

**Status:** APPROVED
**Topic:** Overhauling the "Viewable" to "Ops" Transition Routes (`/login`, `/register`, `/forgot-password`)

## 1. The Strategy: "The Vault Door"
The feeling of signing into W3B should emulate passing through a secure vault door. It shouldn't feel like signing up for an email newsletter; it should feel rigorous, secure, and exclusive. 

### Core Redesign Tenets:
1. **Remove Social Logins:** No "Sign in with Google". We exclusively use Email & institutional-grade passwords, backed by Two-Factor Authentication (in future phases).
2. **The "Gateway" Aesthetic:** Heavy use of profound negative space. A tiny, dead-centered login box floating in a sea of charcoal-grey onyx.
3. **Copy:** Instead of "Sign Up", use verbs like "Request Allocation", "Create Entity", or "Authenticate".

## 2. Component Structure Breakdown

**1. `<InstitutionalAuthForm />` (Replacing current login forms)**
- Clean inputs with a 1px solid `<Platinum>` bottom border. 
- Input backgrounds are pure transparent.
- Font styling transforms to monospace `<JetBrains>` when typing emails/keys to emphasize technical security.

**2. The MFA / Security Warning**
- Prominent disclaimers regarding the CFTC-regulated nature of the platform and the requirement that all deployed capital must pass KYC. This establishes immediate credibility and trust via regulatory rigor, a staple of hedge-fund UI.

## 3. Workflow Implementation
1. Ensure the underlying logic (likely Supabase Auth or NextAuth) remains untouched.
2. Replace all instances of user-facing toast messages from generic UI libraries to custom, brutally minimal "Terminal Logs" in the bottom-left corner of the screen. Example:
   `[AUTH] Verification complete. Allocating session tokens...`

## Next Steps
- Target `app/login/page.tsx` and `app/register/page.tsx`.
- Refactor the auth container into `<InstitutionalAuthForm>`.
- Replace all button styling with the new `Gold -> Platinum` magnetic constraints.
