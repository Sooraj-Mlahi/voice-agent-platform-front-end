# Frontend ↔ Backend Integration Testing Checklist

**Version:** Phase 5 — AgentConfig + CallLogs
**Stack:** Vite + React (SPA) → FastAPI (Railway) + Redis + Supabase
**Last updated:** 2026-03-25

---

## Prerequisites

Before running any test, confirm the following are operational:

| Item | How to verify |
|---|---|
| FastAPI backend is running | `curl https://voice-agent-platform-production-86a4.up.railway.app/api/health` → 200 |
| Supabase project is live | Sign-in flow completes without errors |
| Redis connected to backend | Backend logs show `Redis connected` at startup |
| Frontend dev server | `npm run dev` → no TS compile errors, `localhost:5173` loads |
| At least one Customer record | `/customers` page shows a row; if empty, create one first |

---

## 1. API Contract Validation (The "Handshake")

### 1.1 Payload Audit — `PUT /api/customers/{id}/config`

The backend Pydantic model expects the full `AgentConfig` nested under the `agent_config` key.
Paste this into the **browser DevTools console** while on any `/customers/:id/config` page.
It monkey-patches `XMLHttpRequest` to log every PUT payload before it leaves the browser:

```js
// ── DevTools Console: Payload Inspector ──────────────────────────────────────
(function () {
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._method = method;
    this._url = url;
    return _open.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._method === 'PUT' && this._url?.includes('/config')) {
      try {
        const parsed = JSON.parse(body);
        console.group('📤 PUT /config Payload Audit');
        console.log('Full body:', parsed);

        const cfg = parsed?.agent_config;
        if (!cfg) {
          console.error('❌ FAIL: `agent_config` key missing from payload');
        } else {
          // Required fields checklist
          const required = [
            'system_prompt',
            'voice_id',
            'llm_model',
            'language',
            'prosody_style',
            'silence_timeout_seconds',
            'max_silence_prompts',
            'recording_enabled',
          ];
          required.forEach((field) => {
            const val = cfg[field];
            const ok = val !== undefined && val !== null && val !== '';
            console.log(`${ok ? '✅' : '❌'} ${field}:`, val);
          });

          // Type assertions
          console.group('Type checks');
          console.assert(typeof cfg.system_prompt === 'string',          '❌ system_prompt must be string');
          console.assert(typeof cfg.silence_timeout_seconds === 'number','❌ silence_timeout_seconds must be number');
          console.assert(Number.isInteger(cfg.silence_timeout_seconds),  '❌ silence_timeout_seconds must be integer');
          console.assert(cfg.silence_timeout_seconds >= 5,               '❌ silence_timeout_seconds min is 5');
          console.assert(cfg.silence_timeout_seconds <= 60,              '❌ silence_timeout_seconds max is 60');
          console.assert([1, 2].includes(cfg.max_silence_prompts),       '❌ max_silence_prompts must be 1 or 2');
          console.assert(typeof cfg.recording_enabled === 'boolean',     '❌ recording_enabled must be boolean');
          console.assert(
            ['warm-conversational','formal','empathetic','sales-energetic'].includes(cfg.prosody_style),
            '❌ prosody_style has unexpected value'
          );
          console.groupEnd();
        }
        console.groupEnd();
      } catch (e) {
        console.error('Could not parse body:', e);
      }
    }
    return _send.call(this, body);
  };

  console.log('✅ Payload inspector active. Edit config and hit Save.');
})();
```

**Expected clean output:**
```
📤 PUT /config Payload Audit
  Full body: { agent_config: { … } }
  ✅ system_prompt: "You are a helpful assistant…"
  ✅ voice_id: "11labs-Adrian"
  ✅ llm_model: "openai/gpt-4o-mini"
  ✅ language: "en-US"
  ✅ prosody_style: "warm-conversational"
  ✅ silence_timeout_seconds: 10
  ✅ max_silence_prompts: 2
  ✅ recording_enabled: true
  Type checks: (all pass, no assertions fire)
```

**Known mismatch to watch for:** The old `AgentConfig.tsx` sent `llm_model: "gpt-4o"` (no vendor prefix). The new form sends `"openai/gpt-4o"`. If the backend Pydantic enum rejects this, you will get a **422**. See Section 1.2.

---

### 1.2 Error Handling — 422 Unprocessable Entity

A 422 means Zod passed validation on the frontend but the backend Pydantic model rejected the value (e.g., an enum mismatch or an out-of-range integer).

**How to trigger it deliberately:**
1. Open DevTools → Network tab.
2. Save the form normally — confirm a 200 first.
3. Open DevTools → Console. Run:
   ```js
   // Force a bad llm_model value to trigger a 422
   window.__TEST_BAD_MODEL = true;
   ```
4. Intercept and modify via the Fetch API override below (run once in console):
   ```js
   const _fetch = window.fetch;
   window.fetch = async (input, init) => {
     if (typeof input === 'string' && input.includes('/config') && init?.method === 'PUT') {
       const body = JSON.parse(init.body);
       body.agent_config.llm_model = 'bad-model-value'; // invalid enum
       init = { ...init, body: JSON.stringify(body) };
     }
     return _fetch(input, init);
   };
   ```
5. Save the form again.

**Expected UI behaviour:**
- The `onSubmit` in `AgentConfig.tsx` catches the error via `updateConfigAsync`.
- Sonner toast fires: `"Failed to save configuration. Please try again."` (red error toast).
- The form stays populated — no data loss.
- Network tab shows the 422 response with the Pydantic validation detail.

**What to check in Network tab (422 body):**
```json
{
  "detail": [
    {
      "loc": ["body", "agent_config", "llm_model"],
      "msg": "value is not a valid enumeration member",
      "type": "value_error.enum"
    }
  ]
}
```

---

### 1.3 Error Handling — 502 Bad Gateway (Retell Sync Failure)

A 502 means the backend saved to Supabase successfully but the subsequent call to the Retell API to sync the agent failed (network issue, Retell outage, etc.).

**How to trigger it deliberately (if you have backend access):**
Temporarily set a bad `RETELL_API_KEY` env var in Railway, or disconnect the backend from the internet for the Retell domain.

**Expected UI behaviour:**
- Sonner toast fires: `"Config saved locally but Retell sync failed — changes will apply on next call."` (amber warning toast).
- The form stays on the page.
- The customer's config **is** saved in Supabase (verify via Supabase dashboard Table Editor).
- On the next `GET /customers` refetch, the saved values will be present.

---

## 2. State & UI Logic Tests

### 2.1 Silence Flow Diagram

**Test Case A — Toggle max_silence_prompts from 2 → 1:**

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/customers/:id/config` | Diagram renders with both prompt nodes visible at full opacity |
| 2 | Observe "Just checking in…" node | Has class `border-slate-600 bg-slate-800/80 text-slate-200` (active) |
| 3 | Click **"1 prompt then hang up"** radio | `max_silence_prompts` watch value changes to `1` |
| 4 | Observe "Just checking in…" node | Should have class `border-slate-800 bg-slate-900/40 text-slate-600 opacity-40` (dimmed) |
| 5 | Observe the arrow after prompt-2 | Should have `opacity-30` |
| 6 | Observe Graceful hang-up node | Should have `opacity-40` |
| 7 | Click **"2 prompts then hang up"** radio | All nodes return to full opacity / active state |

**Test Case B — Silence timeout slider updates diagram label:**

| Step | Action | Expected Result |
|---|---|---|
| 1 | Note current slider value (default 10s) | Diagram arrows show "after 10s" |
| 2 | Drag slider to 30s | Both arrow labels change to "after 30s" in real-time |
| 3 | Drag slider to 5s (minimum) | Both arrow labels show "after 5s" |
| 4 | Try dragging below 5 | Slider stops at 5 (min constraint enforced) |
| 5 | Try dragging above 60 | Slider stops at 60 (max constraint enforced) |

**Browser console verification (run after toggling to 1):**
```js
// Should be the dimmed node — check opacity class is applied
const prompt2 = [...document.querySelectorAll('[class*="checking"]')]
  .find(el => el.textContent.includes('checking'));
console.log('Prompt 2 classes:', prompt2?.className);
// Expected: contains 'opacity-40'
```

---

### 2.2 Latency Pill Color Coding

Reference the mock call data in `mock_api_responses.json`. Load these into your local dev environment via the mock setup described in Section 5.

The formula in `CallLogs.tsx`:
```
estimatedLatencyMs = Math.round((duration_seconds × 1000) / firstAgentWordCount)
```

| Mock Call ID | `duration_seconds` | First-Agent Word Count | Calculated ms | Expected Pill |
|---|---|---|---|---|
| `mock-call-fast-001` | 20 | 67 | **299 ms** | 🟢 **Fast** |
| `mock-call-normal-002` | 90 | 90 | **1000 ms** | 🟡 **Normal** |
| `mock-call-slow-003` | 200 | 24 | **8333 ms** | 🔴 **Slow** |
| `mock-call-noans-004` | 8 | n/a (no transcript) | null | ⚫ **—** (grey dash) |
| `mock-call-voicemail-005` | 35 | n/a (plain string) | null | ⚫ **—** (grey dash) |

**Browser console unit test (run on the CallLogs page):**
```js
// Paste the latency function directly and verify all 3 tiers
const estimate = (durationSeconds, firstTurnText) => {
  const wordCount = firstTurnText.trim().split(/\s+/).length;
  return Math.round((durationSeconds * 1000) / wordCount);
};

const fastText = "Hello welcome to our support line I am your AI assistant here to help you today with any questions or concerns you have about your account billing or technical issues please go ahead";
const normalText = "Hello thank you for calling Bright Solutions customer support my name is Alex and I am your AI assistant for today I am here to help you with billing technical support account management or any other general inquiries you may have our team is dedicated to resolving your issues efficiently and on this very call so please go ahead and tell me what is bringing you in today and I will do my very best to assist you with a quick and thorough resolution to whatever the matter might be";
const slowText = "Good afternoon thank you for reaching out to customer support I am here to assist you today please go ahead and describe your issue in as much detail as possible";

console.assert(estimate(20, fastText) < 500,   `❌ Fast case failed: ${estimate(20, fastText)}ms`);
console.assert(estimate(90, normalText) >= 500 && estimate(90, normalText) <= 1200,
  `❌ Normal case failed: ${estimate(90, normalText)}ms`);
console.assert(estimate(200, slowText) > 1200, `❌ Slow case failed: ${estimate(200, slowText)}ms`);
console.log('✅ All latency tier assertions passed');
console.log('Fast:', estimate(20, fastText), 'ms');
console.log('Normal:', estimate(90, normalText), 'ms');
console.log('Slow:', estimate(200, slowText), 'ms');
```

---

### 2.3 Redis Sync Verification (silence_timeout_seconds → reminder_trigger_ms)

The backend converts `silence_timeout_seconds` from the `AgentConfig` into milliseconds for the Redis session state machine on each new call. This is a **backend-level** concern, but you can verify the contract from the frontend.

**Step-by-step verification:**

1. **Set `silence_timeout_seconds = 15`** in the AgentConfig editor. Save.
2. Confirm the Sonner success toast fires.
3. Open **Supabase Table Editor** → `customers` table → find your customer row → inspect `agent_config` JSON column. Verify `silence_timeout_seconds = 15` is persisted.
4. Initiate a **web call** from the AgentConfig page ("Call Agent in Browser").
5. In a separate terminal, monitor the Railway backend logs:
   ```bash
   # If you have Railway CLI installed
   railway logs --tail
   # Look for a line like:
   # INFO: Initialising Redis session {call_id} with reminder_trigger_ms=15000
   ```
6. During the call, **go silent for 15 seconds**. The agent should say *"Are you still there?"* at approximately the 15-second mark.
7. If timing is off by more than 2 seconds, the conversion from `silence_timeout_seconds × 1000` in the backend may have a regression.

**What to check if Redis sync appears broken:**
- Confirm the `PUT /config` payload (from Section 1.1) is reaching the backend correctly.
- In Supabase, check that the value stored is a number, not a string (e.g., `15` not `"15"`). This is a common JSON serialisation bug when form values come from `<input type="text">` instead of a slider — the new Slider component returns a native number.
- Check Railway env vars: `REDIS_URL` should point to a live instance.

---

## 3. Manual Integration Smoke Tests

Run these **in order** in a clean browser session (incognito window recommended to avoid stale tokens).

### Smoke Test 1 — Unauthenticated Redirect
| Step | Action | Expected |
|---|---|---|
| 1 | Navigate directly to `http://localhost:5173/dashboard` | Redirected to `/login` |
| 2 | Navigate directly to `http://localhost:5173/customers` | Redirected to `/login` |
| ✅ | `ProtectedRoute` is working | |

### Smoke Test 2 — Google OAuth → JWT Injection
| Step | Action | Expected |
|---|---|---|
| 1 | Click **Sign in with Google** on `/login` | Google OAuth popup appears |
| 2 | Complete Google sign-in | Redirected to `/dashboard` |
| 3 | Open DevTools → Application → Local Storage → `supabase.auth.token` | JWT `access_token` is present |
| 4 | Open DevTools → Network → Filter by `XHR` → trigger any page navigation | Every API request to Railway has `Authorization: Bearer eyJ…` header |
| ✅ | Axios interceptor is attaching token to all requests | |

### Smoke Test 3 — Create Customer → Config Editor Round-Trip
| Step | Action | Expected |
|---|---|---|
| 1 | Go to `/customers` → click **Create New Customer** | Dialog opens |
| 2 | Fill in: Name=`Test Corp`, Email=`test@test.com`, Plan=`starter` | |
| 3 | Submit | Dialog closes; new row appears in table without page refresh |
| 4 | Click **Edit Config** on the new row | Navigates to `/customers/:id/config` |
| 5 | Observe form | Fields are populated from backend defaults (not blank) |
| 6 | Change System Prompt to `"You are a test agent."` (min 10 chars) | No validation error |
| 7 | Change `silence_timeout_seconds` slider to `25` | Diagram arrows update to "after 25s" |
| 8 | Click **Save Configuration** | Loading spinner → success toast |
| 9 | Refresh the page | Form still shows `silence_timeout_seconds = 25` (persisted to Supabase) |
| ✅ | Full config save/reload cycle works | |

### Smoke Test 4 — Web Call (Retell Browser SDK)
| Step | Action | Expected |
|---|---|---|
| 1 | From `/customers/:id/config`, click **Call Agent in Browser** | Button shows "Connecting…" spinner |
| 2 | Allow microphone access when prompted | |
| 3 | Speak into microphone | Button turns red and shows "End Call"; agent responds |
| 4 | Click **End Call** | Button returns to green "Call Agent in Browser" |
| 5 | Navigate to `/calls` | New call record appears in table (may take up to 30 seconds for webhook) |
| ✅ | Retell SDK → backend webhook → Supabase → CallLogs full cycle works | |

### Smoke Test 5 — Call Logs Transcript Expander
| Step | Action | Expected |
|---|---|---|
| 1 | Go to `/calls` | Table renders with Date/Time, Caller, Duration, Outcome, Latency columns |
| 2 | Observe outcome badge on completed call | Green **Completed** badge |
| 3 | Click anywhere on a row with a transcript | Row expands inline showing chat bubbles |
| 4 | Verify agent bubbles are **right-aligned, indigo** | ✅ |
| 5 | Verify user bubbles are **left-aligned, grey** | ✅ |
| 6 | Click **Copy Transcript** | Button briefly shows ✓ "Copied!"; clipboard contains plain text |
| 7 | Click the row again | Transcript collapses |
| 8 | Check the **Latency** pill on a call with a transcript | Shows Fast / Normal / Slow with colour coding |
| ✅ | CallLogs expander, copy, and latency pill all work | |

---

## 4. Edge Cases & Regression Tests

### 4.1 Empty / Null Transcript
| Scenario | Expected |
|---|---|
| `transcript: null` | Row is clickable; expander shows "No transcript available." |
| `transcript: ""` | Same as null |
| `transcript: "some plain text"` (legacy string) | Expander renders a `<pre>` block, not chat bubbles |
| `transcript: []` (empty array) | Expander renders empty bubble area |

### 4.2 Form Validation (Zod)
| Scenario | Expected |
|---|---|
| Submit with `system_prompt` shorter than 10 chars | Red inline error: "System prompt must be at least 10 characters" |
| Submit with `system_prompt = ""` | Same error |
| `silence_timeout_seconds` — slider cannot go below 5 or above 60 | Slider is physically constrained; no manual input path |
| `max_silence_prompts = 3` via DevTools DOM edit | Zod `z.union([z.literal(1), z.literal(2)])` rejects; form does not submit |

### 4.3 Authentication Token Expiry
| Scenario | Expected |
|---|---|
| Supabase token expires mid-session | Next API call returns 401 from FastAPI → Axios error propagates → toast error → redirect to `/login` |
| User manually deletes `supabase.auth.token` from localStorage | Same as above on next request |

*Note: The Axios interceptor calls `supabase.auth.getSession()` on every request, which Supabase automatically refreshes if a valid refresh token is present. A true expiry (no refresh token) is the scenario to test.*

### 4.4 Caller Number
| Scenario | Expected |
|---|---|
| `caller_number: null` | Table shows "Unknown" |
| `caller_number: "+15551234567"` | Shows formatted number |

### 4.5 Unknown Outcome Value
| Scenario | Expected |
|---|---|
| `outcome: "silence_hangup"` (future backend value) | Badge shows grey **Unknown** (muted variant) until the `TODO` in `CallLogs.tsx` is resolved |

---

## 5. Mock API Setup for Offline Testing

To test the CallLogs page without live calls, use `mock_api_responses.json` alongside a Vite proxy.

**Option A — MSW (Mock Service Worker) — Recommended:**

Install: `npm install --save-dev msw`

Create `src/mocks/handlers.ts`:
```ts
import { http, HttpResponse } from 'msw'
import mockData from '../../mock_api_responses.json'

export const handlers = [
  http.get('*/api/calls', () => HttpResponse.json(mockData.calls)),
  http.get('*/api/customers', () => HttpResponse.json(mockData.customers)),
]
```

Create `src/mocks/browser.ts`:
```ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)
```

Add to `src/main.tsx` (dev only):
```ts
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

**Option B — Quick hardcode for one-off testing:**

Temporarily replace the `queryFn` in `CallLogs.tsx`:
```ts
queryFn: async () => {
  const { calls } = await import('../../mock_api_responses.json')
  return calls
}
```
Revert after testing.

---

## Quick Reference — Outcome Badge → Colour Mapping

| `outcome` value | Badge Variant | Colour |
|---|---|---|
| `completed` | `success` | Emerald green |
| `transferred` | `info` | Blue |
| `no_answer` | `warning` | Amber |
| `dropped` | `danger` | Red |
| `voicemail` | `muted` | Slate grey |
| `silence_hangup` *(future)* | `muted` (temporary) | Slate grey |
| *(anything else)* | `muted` | Slate grey |

## Quick Reference — Latency Pill Thresholds

| Estimated ms | Pill colour | Label |
|---|---|---|
| < 500 ms | Emerald green | **Fast** |
| 500 – 1200 ms | Amber | **Normal** |
| > 1200 ms | Red | **Slow** |
| null (no transcript or wordCount=0) | Slate grey | **—** |
