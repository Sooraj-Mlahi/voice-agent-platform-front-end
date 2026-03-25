import { useEffect, useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Phone, PhoneOff, Info, X } from 'lucide-react'
import { RetellWebClient } from 'retell-client-js-sdk'
import { api } from '@/lib/api'
import {
  useAgentConfig,
  agentConfigSchema,
  type AgentConfigFormValues,
} from '@/hooks/useAgentConfig'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Retell singleton ──────────────────────────────────────────────────────────
const retellWebClient = new RetellWebClient()

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">{label}</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>
      {children}
    </div>
  )
}

// ─── Silence Flow Diagram ──────────────────────────────────────────────────────
function SilenceDiagram({ timeoutSeconds, maxPrompts }: { timeoutSeconds: number; maxPrompts: 1 | 2 }) {
  const nodeBase = 'rounded-lg border px-4 py-2.5 text-xs text-center font-medium transition-all duration-300'
  const activeNode = `${nodeBase} border-slate-600 bg-slate-800/80 text-slate-200`
  const dimmedNode = `${nodeBase} border-slate-800 bg-slate-900/40 text-slate-600 opacity-40`

  return (
    <div className="mt-4 flex flex-col items-center gap-1 select-none">
      <div className={`${nodeBase} border-amber-500/40 bg-amber-500/10 text-amber-300`}>
        Silence detected
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-4 bg-slate-700" />
        <span className="text-[10px] text-slate-500 text-center">after {timeoutSeconds}s</span>
        <div className="w-px h-2 bg-slate-700" />
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600" />
      </div>
      <div className={activeNode}>"Are you still there?"</div>
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-4 bg-slate-700" />
        <span className="text-[10px] text-slate-500 text-center">after {timeoutSeconds}s</span>
        <div className="w-px h-2 bg-slate-700" />
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600" />
      </div>
      <div className={maxPrompts === 2 ? activeNode : dimmedNode}>
        "Just checking in…"&nbsp;
        <span className="text-slate-500 font-normal">(prompt 2)</span>
      </div>
      <div className={`flex flex-col items-center gap-0.5 transition-opacity duration-300 ${maxPrompts === 2 ? 'opacity-100' : 'opacity-30'}`}>
        <div className="w-px h-4 bg-slate-700" />
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-600" />
      </div>
      <div className={`${nodeBase} border-red-500/30 bg-red-500/10 text-red-300 transition-opacity duration-300 ${maxPrompts === 2 ? 'opacity-100' : 'opacity-40'}`}>
        Graceful hang-up
        <span className="block text-[10px] text-red-400/70 font-normal mt-0.5">"Have a great day!"</span>
      </div>
    </div>
  )
}

// ─── Vocabulary Tag Input ──────────────────────────────────────────────────────
function VocabularyInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag || value.includes(tag)) {
      setInputVal('')
      return
    }
    onChange([...value, tag])
    setInputVal('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className="min-h-10 flex flex-wrap gap-1.5 p-2 rounded-md border border-slate-800 bg-slate-950 cursor-text focus-within:ring-1 focus-within:ring-indigo-500"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="text-indigo-400 hover:text-white ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputVal)}
        placeholder={value.length === 0 ? 'Type a term and press Enter…' : ''}
        className="flex-1 min-w-24 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AgentConfig() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isCalling, setIsCalling] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const { customer, config, isLoading, updateConfigAsync, isPending } = useAgentConfig(id)

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors },
  } = useForm<AgentConfigFormValues>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: config,
  })

  useEffect(() => { reset(config) }, [customer]) // eslint-disable-line react-hooks/exhaustive-deps

  const silenceTimeout = watch('silence_timeout_seconds')
  const maxSilencePrompts = watch('max_silence_prompts')

  // ── Retell SDK listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const onStart = () => { setIsCalling(true); setIsConnecting(false) }
    const onEnd   = () => { setIsCalling(false); setIsConnecting(false) }
    const onError = (err: unknown) => {
      console.error('Retell SDK Error:', err)
      setIsCalling(false); setIsConnecting(false)
    }
    retellWebClient.on('call_started', onStart)
    retellWebClient.on('call_ended',   onEnd)
    retellWebClient.on('error',        onError)
    return () => {
      retellWebClient.off('call_started', onStart)
      retellWebClient.off('call_ended',   onEnd)
      retellWebClient.off('error',        onError)
      if (isCalling) retellWebClient.stopCall()
    }
  }, [isCalling])

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: AgentConfigFormValues) => {
    try {
      await updateConfigAsync(values)
      toast.success('Agent updated — changes are live immediately.')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 502) {
        toast.warning('Config saved locally but Retell sync failed — changes will apply on next call.')
      } else {
        toast.error('Failed to save configuration. Please try again.')
      }
    }
  }

  // ── Web call ──────────────────────────────────────────────────────────────
  const toggleCall = async () => {
    if (isCalling) { retellWebClient.stopCall(); return }
    setIsConnecting(true)
    try {
      const response = await api.post(`/api/customers/${id}/web-call`)
      await retellWebClient.startCall({ accessToken: response.data.access_token })
    } catch (err) {
      console.error('Failed to start web call:', err)
      toast.error('Could not connect the call. Please try again.')
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-slate-400 flex items-center">
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />Loading Configuration…
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/customers')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-100">Agent Configuration</h1>
              <p className="text-slate-400 mt-1">
                {customer?.name ? `Editing config for ${customer.name}` : 'Update the prompt and voice settings, then test the agent.'}
              </p>
            </div>
          </div>
          <Button
            onClick={toggleCall}
            disabled={isConnecting}
            className={`font-semibold transition-all duration-300 shadow-lg ${
              isCalling ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
            }`}
          >
            {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : isCalling  ? <PhoneOff className="w-4 h-4 mr-2" />
              :               <Phone className="w-4 h-4 mr-2" />}
            {isConnecting ? 'Connecting…' : isCalling ? 'End Call' : 'Call Agent in Browser'}
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-900/50 border border-slate-800 p-8 rounded-xl backdrop-blur-sm space-y-10">

          {/* ── Section A: Agent Identity ── */}
          <Section label="A — Agent Identity">
            <div className="space-y-2">
              <Label htmlFor="system_prompt" className="text-slate-300">System Prompt</Label>
              <Textarea
                id="system_prompt"
                placeholder="You are a helpful customer service assistant answering phone calls…"
                className="min-h-40 bg-slate-950 border-slate-800 resize-none font-mono text-sm leading-relaxed"
                {...register('system_prompt')}
              />
              {errors.system_prompt && <p className="text-xs text-red-400">{errors.system_prompt.message}</p>}
              <p className="text-xs text-slate-500">Minimum 10 characters. The backend wraps this with prosody instructions automatically.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Voice ID */}
              <div className="space-y-2">
                <Label className="text-slate-300">Voice ID</Label>
                <Controller name="voice_id" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Select a voice" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="11labs-Adrian">11labs-Adrian (Male)</SelectItem>
                      <SelectItem value="11labs-Bella">11labs-Bella (Female)</SelectItem>
                      <SelectItem value="11labs-Rachel">11labs-Rachel (Female)</SelectItem>
                      <SelectItem value="11labs-Antoni">11labs-Antoni (Male)</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.voice_id && <p className="text-xs text-red-400">{errors.voice_id.message}</p>}
              </div>

              {/* LLM Model — Retell-native IDs */}
              <div className="space-y-2">
                <Label className="text-slate-300">LLM Model</Label>
                <Controller name="llm_model" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Default)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                      <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                      <SelectItem value="claude-4.6-sonnet">Claude 4.6 Sonnet</SelectItem>
                      <SelectItem value="claude-4.5-haiku">Claude 4.5 Haiku</SelectItem>
                      <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.llm_model && <p className="text-xs text-red-400">{errors.llm_model.message}</p>}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label className="text-slate-300">Language</Label>
                <Controller name="language" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                      <SelectItem value="pt-BR">Portuguese (BR)</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.language && <p className="text-xs text-red-400">{errors.language.message}</p>}
              </div>
            </div>

            {/* Custom Vocabulary */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Custom Vocabulary
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline w-3.5 h-3.5 ml-1.5 text-slate-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs max-w-64">
                    Domain-specific terms sent to the STT model for boosted recognition. Useful for brand names, medical terms, technical jargon.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Controller
                name="custom_vocabulary"
                control={control}
                render={({ field }) => (
                  <VocabularyInput value={field.value} onChange={field.onChange} />
                )}
              />
              <p className="text-xs text-slate-500">Press Enter or comma to add a term. Backspace removes the last tag.</p>
            </div>
          </Section>

          {/* ── Section B: Voice Personality ── */}
          <Section label="B — Voice Personality">
            <div className="space-y-2">
              <Label className="text-slate-300">Prosody Style</Label>
              <Controller name="prosody_style" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 w-full sm:w-80"><SelectValue placeholder="Select a style" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="warm-conversational">Warm &amp; Conversational (Recommended)</SelectItem>
                    <SelectItem value="formal">Formal &amp; Professional</SelectItem>
                    <SelectItem value="empathetic">Empathetic &amp; Supportive</SelectItem>
                    <SelectItem value="sales-energetic">Sales-Energetic</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              {errors.prosody_style && <p className="text-xs text-red-400">{errors.prosody_style.message}</p>}
              <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  Controls how the agent phrases responses and varies sentence rhythm. It does not change the voice itself — use <span className="text-slate-300">Voice ID</span> for that.
                </p>
              </div>
            </div>
          </Section>

          {/* ── Section C: Barge-in (read-only deployment values) ── */}
          <Section label="C — Barge-in &amp; Interruption">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-400">
                    Interruption Sensitivity
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline w-3.5 h-3.5 ml-1.5 text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs max-w-64">
                        These values are set globally in your deployment. Contact your admin to change them.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="text-slate-500 text-sm font-mono">0.9</span>
                </div>
                <Slider value={[0.9]} min={0} max={1} step={0.01} disabled className="opacity-40" />
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Read-only · Deployment level</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-400">
                    Backchannel Frequency
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline w-3.5 h-3.5 ml-1.5 text-slate-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs max-w-64">
                        These values are set globally in your deployment. Contact your admin to change them.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="text-slate-500 text-sm font-mono">0.45</span>
                </div>
                <Slider value={[0.45]} min={0} max={1} step={0.01} disabled className="opacity-40" />
                <p className="text-[10px] text-slate-600 uppercase tracking-widest">Read-only · Deployment level</p>
              </div>
            </div>
          </Section>

          {/* ── Section D: Silence & Hang-up ── */}
          <Section label="D — Silence &amp; Hang-up Behaviour">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
              <div className="space-y-7">
                {/* Silence Timeout Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Silence Timeout</Label>
                    <span className="text-indigo-400 font-mono font-semibold">{silenceTimeout}s</span>
                  </div>
                  <Controller name="silence_timeout_seconds" control={control} render={({ field }) => (
                    <Slider value={[field.value]} onValueChange={([v]) => field.onChange(v)} min={5} max={60} step={5} />
                  )} />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    {[5, 15, 30, 45, 60].map((t) => <span key={t}>{t}s</span>)}
                  </div>
                  <p className="text-xs text-slate-500">How long the agent waits after silence before prompting the caller.</p>
                </div>

                {/* Max Silence Prompts */}
                <div className="space-y-3">
                  <Label className="text-slate-300">Max Silence Prompts</Label>
                  <Controller name="max_silence_prompts" control={control} render={({ field }) => (
                    <RadioGroup
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v) as 1 | 2)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="1" id="prompts-1" />
                        <Label htmlFor="prompts-1" className="text-slate-300 font-normal cursor-pointer">1 prompt then hang up</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="2" id="prompts-2" />
                        <Label htmlFor="prompts-2" className="text-slate-300 font-normal cursor-pointer">2 prompts then hang up</Label>
                      </div>
                    </RadioGroup>
                  )} />
                  <p className="text-xs text-slate-500">How many reminders before the agent ends the call gracefully.</p>
                </div>
              </div>

              {/* Silence Diagram */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Flow Preview</p>
                <SilenceDiagram timeoutSeconds={silenceTimeout} maxPrompts={maxSilencePrompts} />
              </div>
            </div>
          </Section>

          {/* ── Footer ── */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isPending ? 'Saving…' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  )
}
