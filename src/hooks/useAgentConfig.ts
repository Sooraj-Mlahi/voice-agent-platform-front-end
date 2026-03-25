import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { z } from 'zod'

// ─── Zod Schema ────────────────────────────────────────────────────────────────

export const agentConfigSchema = z.object({
  system_prompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  voice_id: z.string().min(1, 'Please select a voice'),
  llm_model: z.string().min(1, 'Please select a model'),
  language: z.string().min(1, 'Please select a language'),
  prosody_style: z.enum(['warm-conversational', 'formal', 'empathetic', 'sales-energetic']),
  silence_timeout_seconds: z.number().int().min(5).max(60),
  max_silence_prompts: z.union([z.literal(1), z.literal(2)]),
  recording_enabled: z.boolean(),
  custom_vocabulary: z.array(z.string()),
})

export type AgentConfigFormValues = z.infer<typeof agentConfigSchema>

export const defaultAgentConfig: AgentConfigFormValues = {
  system_prompt: '',
  voice_id: '11labs-Adrian',
  llm_model: 'gpt-4o-mini',          // Retell-native ID
  language: 'en-US',
  prosody_style: 'warm-conversational',
  silence_timeout_seconds: 10,
  max_silence_prompts: 2,
  recording_enabled: false,
  custom_vocabulary: [],
}

// ─── Customer type ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  billing_email: string
  phone_number?: string
  plan?: string
  status?: string
  retell_agent_id?: string
  agent_config?: Partial<AgentConfigFormValues>
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentConfig(customerId: string | undefined) {
  const queryClient = useQueryClient()

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/api/customers')
      return response.data
    },
    staleTime: 30_000,
  })

  const customer = customers?.find((c) => c.id === customerId) ?? null

  // Merge backend config over defaults so all fields are always present
  const config: AgentConfigFormValues = customer?.agent_config
    ? { ...defaultAgentConfig, ...customer.agent_config }
    : { ...defaultAgentConfig }

  const mutation = useMutation({
    mutationFn: async (values: AgentConfigFormValues) => {
      const response = await api.put(`/api/customers/${customerId}/config`, {
        agent_config: values,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  return {
    customer,
    config,
    isLoading,
    updateConfig: mutation.mutate,
    updateConfigAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
