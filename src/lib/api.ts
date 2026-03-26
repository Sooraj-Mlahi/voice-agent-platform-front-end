import axios from 'axios'
import { supabase } from '@/lib/supabase'
import type { Customer, CallLog, WebCallToken, PublicAgentInfo, CreateCustomerPayload, UpdateConfigPayload } from '@/types/api'

const BASE = import.meta.env.VITE_API_BASE_URL as string // e.g. https://...railway.app

// ─── Authenticated Axios instance ──────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Typed service functions (all auth-required) ──────────────────────────────

export const customerService = {
  list: ()                                        => api.get<Customer[]>('/api/customers'),
  create: (body: CreateCustomerPayload)           => api.post<Customer>('/api/customers', body),
  updateConfig: (id: string, body: UpdateConfigPayload) =>
    api.put(`/api/customers/${id}/config`, body),
  startWebCall: (id: string)                      => api.post<WebCallToken>(`/api/customers/${id}/web-call`),
}

export const callService = {
  list: () => api.get<CallLog[]>('/api/calls'),
}

export const promptService = {
  generate: (body: { agent_type: string; company_name: string; extra_details?: string }) =>
    api.post<{ system_prompt: string }>('/api/generate-prompt', body),
}

// ─── Public service (no JWT required, plain axios) ───────────────────────────

const publicApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

export const publicAgentService = {
  getInfo:  (customerId: string) => publicApi.get<PublicAgentInfo>(`/public/agent/${customerId}`),
  getToken: (customerId: string) => publicApi.post<WebCallToken>(`/public/agent/${customerId}/token`),
}
