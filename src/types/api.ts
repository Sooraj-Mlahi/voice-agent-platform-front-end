// TypeScript interfaces mirroring the FastAPI backend models (app/models.py)

export interface AgentConfig {
  system_prompt?: string;
  voice_id?: string;                  // e.g. "11labs-Adrian"
  language?: string;                  // e.g. "en-US"
  llm_model?: string;                 // e.g. "openai/gpt-4o-mini"
  recording_enabled?: boolean;
  business_hours?: Record<string, unknown>;
  escalation_phone?: string;
  calendar_webhook_url?: string;
  crm_webhook_url?: string;
  faq_knowledge_base?: string;
  prosody_style?: 'warm-conversational' | 'formal' | 'empathetic' | 'sales-energetic';
  silence_timeout_seconds?: number;   // 5–60
  max_silence_prompts?: 1 | 2;
}

export interface Customer {
  id: string;
  name: string;
  billing_email: string;
  phone_number?: string;
  plan: string;
  status: string;
  retell_agent_id?: string;
  agent_config?: AgentConfig;
  created_at: string;
}

export interface CallLog {
  id: string;
  customer_id: string;
  retell_call_id: string;
  caller_number?: string;
  duration_seconds?: number;
  outcome: 'completed' | 'transferred' | 'dropped' | 'voicemail' | 'no_answer';
  transcript?: Array<{ role: 'agent' | 'user'; content: string }>;
  started_at: string;
  ended_at?: string;
}

export interface CreateCustomerPayload {
  name: string;
  billing_email: string;
  phone_number?: string;
  plan: string;
  status: string;
  agent_config?: AgentConfig;
}

export interface UpdateConfigPayload {
  agent_config: AgentConfig;
}

export interface WebCallResponse {
  access_token: string;
}
