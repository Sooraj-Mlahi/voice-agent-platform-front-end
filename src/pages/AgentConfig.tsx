import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AgentConfig() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch all customers, then find ours
  const { data: customers, isLoading: isFetching } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers')
      return response.data
    }
  })

  // We assume the customer holds the agent configuration or we just populate a generic form if empty
  const [formData, setFormData] = useState({
    system_prompt: '',
    voice_id: '11labs-Adrian',
    language: 'en-US',
    llm_model: 'gpt-4o',
    recording_enabled: true
  })

  useEffect(() => {
    // If backend returns config inside customer object, initialize it
    if (customers && id) {
      const current = customers.find(c => c.id === id)
      if (current?.agent_config) {
        setFormData({
          system_prompt: current.agent_config.system_prompt || '',
          voice_id: current.agent_config.voice_id || '11labs-Adrian',
          language: current.agent_config.language || 'en-US',
          llm_model: current.agent_config.llm_model || 'gpt-4o',
          recording_enabled: current.agent_config.recording_enabled ?? true
        })
      }
    }
  }, [customers, id])

  const mutation = useMutation({
    mutationFn: async (config: typeof formData) => {
      const response = await api.put(`/customers/${id}/config`, {
        agent_config: config
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isFetching) {
    return <div className="p-8 text-slate-400 flex items-center"><Loader2 className="w-5 h-5 mr-3 animate-spin"/> Loading Configuration...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Agent Configuration</h1>
          <p className="text-slate-400 mt-1">Update the system prompt and voice model for this AI agent.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 p-8 rounded-xl backdrop-blur-sm space-y-6">
        <div className="space-y-2">
          <Label htmlFor="system_prompt" className="text-slate-300">System Prompt</Label>
          <Textarea 
            id="system_prompt" 
            placeholder="You are a helpful customer service assistant answering phone calls..."
            className="h-48 bg-slate-950 border-slate-800 resize-none font-mono text-sm leading-relaxed"
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            required
          />
          <p className="text-xs text-slate-500">This instructs the agent on how to behave and what to talk about.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-300">Voice ID</Label>
            <Select 
              value={formData.voice_id} 
              onValueChange={(val) => setFormData({ ...formData, voice_id: val })}
            >
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="11labs-Adrian">11labs-Adrian (Male)</SelectItem>
                <SelectItem value="11labs-Bella">11labs-Bella (Female)</SelectItem>
                <SelectItem value="11labs-Rachel">11labs-Rachel (Female)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">LLM Model</Label>
            <Select 
              value={formData.llm_model} 
              onValueChange={(val) => setFormData({ ...formData, llm_model: val })}
            >
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude 3.5 Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Language</Label>
            <Select 
              value={formData.language} 
              onValueChange={(val) => setFormData({ ...formData, language: val })}
            >
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-GB">English (UK)</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <Button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {mutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </form>
    </div>
  )
}
