# Aether Mobile App — Static Code Audit

**Audit date:** 21 November 2026  
**Repository:** PawanDixit23/aether  
**Audited branch:** dev  
**Audited commit:** 3320889d2feee4ca8cc8d29795a2cc7ad092dcd5  
**Audit type:** Static source/configuration review; no production code modified

## 1. Executive summary

The Android application is primarily an Expo / React Native shell around the production Aether web application using React Native WebView. The mobile-specific implementation is concentrated in:

- mobile/App.tsx — WebView lifecycle, native bridge, permissions, notifications, deep links, AsyncStorage backup and error recovery.
- mobile/src/api.ts — standalone native API helper functions.
- mobile/app.json and mobile/eas.json — Expo app identity, permissions, plugins and EAS build profiles.
- mobile/android/app/src/main/AndroidManifest.xml — effective Android permission and application declarations.

The mobile source subtree currently contains only App.tsx and src/api.ts as application source files. This makes the WebView bridge and the boundary between the authenticated WebView session and native React Native requests especially important.

### Findings overview

| Priority | Finding | GitHub issue |
|---|---|---|
| P1 | Native bridge allowlist and handler names are out of sync; many native actions are unreachable | #41 |
| P1 | Notification Complete/Snooze requests omit the Bearer token required by the server | #42 |
| P1 | OAuth deep-link parameters are accepted before validating callback scheme/host/state | #43 |
| P1 | Offline backup restore is not account-scoped; save/clear bridge actions are blocked | #44 |
| P1 | Android allows cleartext traffic and declares broad/legacy permissions; backup policy needs hardening | #45 |
| P2 | Microphone and location permissions are requested at app startup | #46 |
| P2 | WebView retries indefinitely at a fixed five-second interval after timeout | #47 |
| P2 | WebView video capture is allowed by callback but CAMERA permission is not declared/requested | #48 |
| P2 | Reminder notifications expose public lock-screen content and request DND bypass by default | #49 |
| P2 | Mobile has no automated test/typecheck/lint release gate | #50 |

Issues are open and contain proposed acceptance criteria. This document records findings and recommended work; it does not implement the fixes.

## 2. Scope and methodology

### Files reviewed

- mobile/App.tsx (native shell and bridge)
- mobile/src/api.ts (native API helper)
- mobile/package.json and mobile/package-lock.json metadata
- mobile/app.json
- mobile/eas.json
- mobile/android/app/src/main/AndroidManifest.xml
- Repository tree under mobile/
- Related server authentication implementation in server/security/auth.py
- Related task notification endpoints in server/main.py

### Checks performed

- Enumerated all bridge action names in ALLOWED_BRIDGE_ACTIONS and compared them with all data.type handler branches.
- Traced the native notification action requests to their server endpoints and mandatory authentication dependency.
- Reviewed deep-link parsing and WebView navigation/origin checks.
- Reviewed local backup storage, account scoping, restore and clear behavior.
- Reviewed Android permissions, cleartext traffic, backup behavior and notification privacy settings.
- Reviewed mobile package scripts and presence/absence of automated mobile tests.

### Not performed

This is a static repository audit, not a runtime penetration test or a release certification. I did not:
- Build an APK/AAB with EAS.
- Install and exercise the app on a physical Android device.
- Run Android instrumentation, Detox, Maestro, Jest, ESLint or TypeScript checks.
- Test iOS build/runtime behavior on an Apple device.
- Inspect the final merged manifest produced by an EAS production build.
- Verify live Render/Supabase behavior or production notification delivery.

Any runtime behavior described below is either directly implied by the source or marked as requiring device verification. Do not treat this document as proof that an APK has been tested.

## 3. Detailed findings

### P1 — Native bridge allowlist and handlers are inconsistent

**Evidence:** mobile/App.tsx lines 95–114 define ALLOWED_BRIDGE_ACTIONS; line 691 rejects any action not in that set. Handler branches appear from approximately lines 663–1000.

A static comparison found:
- Only four exact action names appear in both the allowlist and the handler switch: MAKE_CALL, SEARCH_CONTACT_AND_CALL, OPEN_UPI_PAYMENT and OPEN_EXTERNAL_URL.
- Fourteen implemented handler action names are not allowlisted and are rejected before their handlers execute.
- Fourteen allowlisted names have no corresponding handler branch and therefore have no implementation in this switch.

Examples of blocked handler actions include REQUEST_CONTACTS_PERMISSION, OPEN_APP_SETTINGS, REQUEST_CONTACTS_SYNC, DOWNLOAD_FILE, OPEN_MAP, TRIGGER_NOTIFICATION, SCHEDULE_REMINDER, CANCEL_REMINDER, REQUEST_MIC_PERMISSION, REQUEST_LOCATION_PERMISSION, REQUEST_NOTIFICATION_PERMISSION, PLAY_TTS_AUDIO, STORE_NATIVE_BACKUP and CLEAR_NATIVE_BACKUP.

Examples of allowlisted names without a matching handler include OPEN_SETTINGS, SYNC_ALL_CONTACTS, OPEN_NATIVE_MAP and the speech/audio action names.

**Impact:** Native reminders, contacts, permission requests, maps, audio and backup behavior may be silently unavailable. This is a bridge contract defect, not simply a missing UI element.

**Recommended fix:**
1. Define a typed bridge contract with one canonical action enum/schema.
2. Keep the web-side emitted actions and native handlers synchronized.
3. Reject unknown actions, but log a structured diagnostic that can be correlated with a bridge-contract test.
4. Add tests asserting every allowlisted action has a handler and every handler action is allowlisted.
5. Verify every supported native action on a physical Android device.

**Tracking:** https://github.com/PawanDixit23/aether/issues/41

### P1 — Native notification actions do not send authentication

**Evidence:** mobile/App.tsx lines 209 and 217 call the task Complete and Snooze endpoints using plain React Native fetch requests. Neither request attaches an Authorization Bearer token. Both request failures are swallowed with catch(() => {}).

The server handlers in server/main.py for POST /api/tasks/{task_id}/complete and POST /api/tasks/{task_id}/snooze require get_current_user_identity. server/security/auth.py validates the Authorization header and rejects unauthenticated production requests with HTTP 401.

**Impact:** Mark Done and Snooze actions from native notifications are expected to fail with 401 in production. Since the response is ignored, the user may believe the action succeeded while the server task remains unchanged.

**Recommended fix:**
1. Use one authenticated native API client that obtains the current Supabase access token at action time.
2. Never place access tokens in notification payload data or logs.
3. Handle 401, 403, offline and server errors explicitly.
4. Update WebView state only after the server confirms success.
5. Add tests for expired/missing tokens and successful task actions.

**Tracking:** https://github.com/PawanDixit23/aether/issues/42

### P1 — OAuth deep-link callback validation is too permissive

**Evidence:** mobile/App.tsx lines 258–282. handleDeepLink checks for access_token or code= before validating the incoming URL scheme, host, callback path or OAuth state. It then copies the incoming query/fragment into a URL on AETHER_URL and navigates the WebView there. The registered custom-scheme checks occur in a later branch.

**Impact:** An arbitrary deep-link invocation containing OAuth-looking parameters can be treated as an authentication callback. This creates an OAuth callback injection/login-CSRF risk and can forward attacker-controlled authorization data into the Aether origin.

**Recommended fix:**
1. Accept callbacks only for exact registered Aether schemes and the expected callback path/host.
2. Validate OAuth state and the PKCE transaction against the login attempt that initiated the callback.
3. Parse with URL APIs and reject duplicate, malformed or unexpected parameters.
4. Do not forward arbitrary fragments or query strings.
5. Add negative tests for foreign schemes/hosts, invalid state, malformed codes and replayed callbacks.

**Tracking:** https://github.com/PawanDixit23/aether/issues/43

### P1 — Offline backup restore is not safely isolated by account

**Evidence:** mobile/App.tsx lines 988–1004 define STORE_NATIVE_BACKUP and CLEAR_NATIVE_BACKUP handlers. Neither action is present in ALLOWED_BRIDGE_ACTIONS, so the guard at line 691 prevents these handlers from running.

The store handler writes both an email-scoped key and the shared key aether_offline_backup. On every WebView load, lines 1015–1025 read the shared key and inject it into the current page without confirming that the authenticated user owns that backup.

**Impact:** Backup save/clear messages are currently unreachable through the bridge. A stale shared backup left by an earlier app version/session can be restored into a later account on the same device. This is a potential cross-account personal-data exposure.

**Recommended fix:**
1. Remove the shared unscoped backup key.
2. Scope backup data to immutable authenticated user ID, not only email.
3. Verify the current authenticated identity before restoring.
4. Clear or quarantine the previous account's WebView state and local data on logout/account switch.
5. Add logout, account-switch and stale-backup regression tests.
6. Define whether sensitive backup data should be excluded from Android Auto Backup.

**Tracking:** https://github.com/PawanDixit23/aether/issues/44

### P1 — Android network and permission configuration needs hardening

**Evidence:**
- mobile/app.json line 34 enables usesCleartextTraffic.
- mobile/android/app/src/main/AndroidManifest.xml line 22 also sets android:usesCleartextTraffic="true".
- The checked-in manifest declares READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE and SYSTEM_ALERT_WINDOW (lines 7, 12 and 14).
- The application declaration sets android:allowBackup="true" (line 22).

**Impact:** Cleartext HTTP is permitted at application level. Broad/legacy storage and overlay permissions increase user privacy and Play Store review risk. Android backup may include local AsyncStorage content unless explicit backup/data-extraction exclusions are configured.

**Recommended fix:**
1. Disable cleartext traffic in production; allow local HTTP only in a debug-specific configuration if required.
2. Remove obsolete or unused storage/overlay permissions and document the feature that requires every remaining permission.
3. Add Android backup/data-extraction rules excluding authentication/session and sensitive offline data.
4. Inspect the final merged manifest from the actual EAS production build.
5. Add a release check for permissions and network security settings.

**Tracking:** https://github.com/PawanDixit23/aether/issues/45

### P2 — Sensitive permissions are requested during app startup

**Evidence:** mobile/App.tsx lines 151–170 call PermissionsAndroid.requestMultiple for RECORD_AUDIO, ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION during the initial setup effect.

**Impact:** Users are asked for microphone and location access before they choose a feature that needs them. This can reduce trust and lead to blanket denial during onboarding.

**Recommended fix:** Request each permission just in time after a user action, explain the purpose in context, and handle denied/permanently-denied states without repeatedly prompting.

**Tracking:** https://github.com/PawanDixit23/aether/issues/46

### P2 — Automatic WebView retry has no backoff or attempt limit

**Evidence:** mobile/App.tsx lines 292–307 run a loading watchdog. After timeout, the retry effect at approximately lines 311–330 retries every five seconds without a maximum attempt count, connectivity check, jitter or background pause.

**Impact:** A device with no network or a prolonged outage can continuously reload the WebView, consume battery/mobile data and generate unnecessary traffic against the Render service.

**Recommended fix:** Use bounded exponential backoff with jitter, pause while offline/backgrounded, expose a manual retry, and reset the retry budget only after a successful load.

**Tracking:** https://github.com/PawanDixit23/aether/issues/47

### P2 — Video capture is accepted by the WebView callback but CAMERA permission is missing

**Evidence:** mobile/App.tsx lines 438–468 accept VIDEO_CAPTURE in the WebView permission callback. The app configuration's Android permission list does not declare android.permission.CAMERA, and startup permission requests do not request CAMERA.

**Impact:** Camera-based WebView features may fail to receive Android runtime permission even if the in-app prompt is accepted.

**Recommended fix:** Confirm camera capture is an intended supported mobile feature. If yes, declare CAMERA and request it only when needed; test allow, deny and permanently-denied states on a physical device.

**Tracking:** https://github.com/PawanDixit23/aether/issues/48

### P2 — Reminder notification privacy defaults are too permissive

**Evidence:** mobile/App.tsx lines 180–185 configure the reminders channel with bypassDnd: true and lockscreenVisibility: PUBLIC.

**Impact:** Private task titles/reminder content may be visible on the lock screen, and the app requests Do Not Disturb bypass by default.

**Recommended fix:** Default to private/redacted lock-screen content. Make sensitive previews an explicit user preference. Do not request DND bypass by default; require a separate opt-in if justified.

**Tracking:** https://github.com/PawanDixit23/aether/issues/49

### P2 — No mobile automated test/release gate is present

**Evidence:** mobile/package.json provides start, android, ios and web scripts only. The mobile source subtree has no automated test files or test/lint/typecheck scripts.

**Impact:** Bridge contract drift, notification authentication, deep-link validation, account isolation and permission regressions can reach releases without automated detection.

**Recommended fix:** Add unit tests for bridge contracts, URL/origin validation, deep-link parsing, backup scoping and retry policy; add typecheck/lint CI; add an Android EAS preview-build gate and physical-device release checklist.

**Tracking:** https://github.com/PawanDixit23/aether/issues/50

## 4. Additional observations (not separate confirmed defects)

1. mobile/src/api.ts defines task, briefing, chat and quick-capture fetch helpers but does not attach an Authorization header. The current mobile source tree has no other application module beyond App.tsx and this helper, and App.tsx does not import it. Treat it as an unsafe/incomplete helper if it is later wired into native screens; route it through the authenticated client before use.
2. The WebView disables its cache (cacheEnabled=false and LOAD_NO_CACHE). This may increase repeated asset downloads and startup time. Measure on-device before changing it; do not weaken session isolation or caching controls without a threat review.
3. The native shell imports SafeAreaProvider and SafeAreaView but renders a plain root View. The status bar is translucent. Verify status-bar, display-cutout and gesture-navigation insets on real devices before changing layout.
4. The app config declares an iOS bundle identifier and package scripts include an iOS command, but this audit did not validate an iOS build or iOS permission prompts. Treat iOS readiness as unverified.
5. generateCryptographicBridgeToken() is passed directly as the argument to useRef. JavaScript evaluates that argument on every render even though React retains only the first ref value. This can generate unnecessary random bytes on rerenders; initialize the token lazily with a stable initializer pattern.
6. The native notification response handler interpolates taskId into injected JavaScript. Validate it as a positive integer and serialize values with JSON.stringify before injection.

## 5. Recommended remediation order

### First — P1 security and data integrity
1. Fix the bridge action contract (#41).
2. Authenticate notification Complete/Snooze and report failures (#42).
3. Validate OAuth deep links with state/PKCE (#43).
4. Isolate offline backups and repair logout/account-switch cleanup (#44).
5. Harden Android cleartext, permission and backup configuration (#45).

### Second — P2 reliability and privacy
6. Move sensitive permission prompts to feature entry points (#46).
7. Add bounded retry/backoff (#47).
8. Confirm and correctly configure camera capture (#48).
9. Make lock-screen privacy and DND bypass opt-in (#49).
10. Add automated mobile test/build gates (#50).

## 6. Definition of done for the mobile app

A mobile release should not be considered verified until:

- Every native bridge action has a tested web-to-native contract.
- Notification actions succeed with the signed-in user's valid token and fail visibly/safely when auth expires.
- OAuth callbacks reject untrusted schemes, hosts, invalid state and replay attempts.
- Logout and account switching cannot restore another user's data.
- Production Android merged manifest has no unnecessary permissions and disallows cleartext traffic.
- Permission prompts occur only when the user starts the corresponding feature.
- Reminders work across app restart and device reboot as supported, with private lock-screen defaults.
- Retry behavior is bounded and battery/network safe.
- Android EAS build, install, upgrade and smoke tests pass on a physical device.
- iOS is separately built and tested before claiming iOS support.
- Automated tests and CI checks run for every mobile code change.

## 7. Audit conclusion

The mobile wrapper has useful security controls already present (exact trusted-host checks, HTTPS checks for trusted production hosts, a bridge action allowlist, message size checks, and YouTube embed URL validation). However, the bridge contract mismatch undermines several native features, while the notification authentication and account-scoped backup issues need priority attention. OAuth callback validation and Android network/permission configuration should also be hardened before a wider public release.

This audit intentionally creates tracking issues and documentation only. No runtime code, database schema, Supabase settings, Render environment variables or production deployment settings were changed.
