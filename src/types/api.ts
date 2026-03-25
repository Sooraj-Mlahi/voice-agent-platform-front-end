// TypeScript interfaces mirroring the FastAPI backend models (app/models.py)
// Source of truth: API_MANIFEST.md — do not add fields not present there.

export interface AgentConfig {
  // LLM
  system_prompt: string | null
  llm_model: string
  // Retell-native model IDs:
  // "gpt-4o-mini" | "gpt-4o" | "gpt-4.1" | "gpt-4.1-mini"
  // | "claude-4.5-sonnet" | "claude-4.6-sonnet" | "claude-4.5-haiku"
  // | "gemini-2.0-flash" | "gemini-2.5-flash"

  // Voice
  voice_id: string | null
  language: string

  // Behaviour
  business_hours: Record<string, unknown> | null
  escalation_phone: string | null
  calendar_webhook_url: string | null
  crm_webhook_url: string | null
  faq_knowledge_base: string | null
  recording_enabled: boolean

  // Track 1 — Tonality
  prosody_style: 'warm-conversational' | 'formal' | 'empathetic' | 'sales-energetic'

  // Track 4 — Silence handling
  silence_timeout_seconds: number   // 5–60 integer seconds
  max_silence_prompts: 1 | 2        // 1–2 integer

  // STT vocabulary boosting
  custom_vocabulary: string[]       // e.g. ["MedSync", "HbA1c"]. Default: []
}

export interface Customer {
  id: string
  reseller_id: string
  name: string
  billing_email: string
  phone_number: string | null       // E.164
  plan: string                      // "starter" | "pro" | "enterprise"
  status: string                    // "active" | "suspended"
  retell_agent_id: string | null
  created_at: string                // ISO 8601 UTC
}

export interface CallLog {
  id: string
  customer_id: string
  retell_call_id: string | null
  caller_number: string | null
  duration_seconds: number | null
  outcome: string | null            // "completed" | "transferred" | "voicemail" | "dropped" | "no_answer"
  transcript: string | null         // JSON string — parse with JSON.parse() → Array<{role,content}>
  started_at: string | null
  ended_at: string | null

  // Numeric performance metrics (null until call_analyzed fires)
  cost_usd: number | null           // e.g. 0.0042
  latency_p50_ms: number | null     // median e2e latency in ms
  tokens_used: number | null
  prosody_style_used: string | null
}

export interface WebCallToken {
  access_token: string
  call_id: string
}

export interface PublicAgentInfo {
  customer_id: string
  name: string
  has_agent: boolean
}

export interface CreateCustomerPayload {
  name: string
  billing_email: string
  phone_number?: string
  plan: string
  status: string
  agent_config?: Partial<AgentConfig>
}

export interface UpdateConfigPayload {
  agent_config: Partial<AgentConfig>
}
