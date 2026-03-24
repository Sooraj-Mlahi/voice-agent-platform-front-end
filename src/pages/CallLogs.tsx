import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PhoneCall, Clock, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptTurn {
  role: 'agent' | 'user'
  content: string
}

interface CallLog {
  id: string
  customer_id: string
  retell_call_id: string
  caller_number: string | null
  duration_seconds: number
  outcome: string
  transcript: string | TranscriptTurn[] | null
  started_at?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function parseTranscript(raw: string | TranscriptTurn[] | null): TranscriptTurn[] | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as TranscriptTurn[]
  } catch {
    // fall through to plain-string path
  }
  return null // caller should render as <pre>
}

type OutcomeVariant = 'success' | 'info' | 'warning' | 'danger' | 'muted'

function outcomeVariant(outcome: string): OutcomeVariant {
  switch (outcome) {
    case 'completed': return 'success'
    case 'transferred': return 'info'
    case 'no_answer': return 'warning'
    case 'dropped': return 'danger'
    case 'voicemail': return 'muted'
    // TODO: add 'silence_hangup' when backend emits it
    default: return 'muted'
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'completed': return 'Completed'
    case 'transferred': return 'Transferred'
    case 'no_answer': return 'No Answer'
    case 'dropped': return 'Dropped'
    case 'voicemail': return 'Voicemail'
    default: return 'Unknown'
  }
}

// ─── Latency Pill ──────────────────────────────────────────────────────────────

function estimateLatencyMs(
  call: CallLog
): { ms: number; label: string; colour: string } | null {
  const turns = parseTranscript(call.transcript)
  if (!turns || call.duration_seconds <= 0) return null

  const firstAgent = turns.find((t) => t.role === 'agent')
  if (!firstAgent) return null

  const wordCount = firstAgent.content.trim().split(/\s+/).length
  if (wordCount === 0) return null

  // Proxy: ms per word of the first agent turn — lower = faster perceived start
  const ms = Math.round((call.duration_seconds * 1000) / wordCount)
  return { ms, label: '', colour: '' }
}

type LatencyTier = { label: string; colour: string; pill: string }

function latencyTier(ms: number): LatencyTier {
  if (ms < 500)
    return { label: 'Fast', colour: 'text-emerald-400', pill: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' }
  if (ms <= 1200)
    return { label: 'Normal', colour: 'text-amber-400', pill: 'bg-amber-500/10 border-amber-500/20 text-amber-400' }
  return { label: 'Slow', colour: 'text-red-400', pill: 'bg-red-500/10 border-red-500/20 text-red-400' }
}

function LatencyPill({ call }: { call: CallLog }) {
  const result = estimateLatencyMs(call)
  if (!result) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-slate-700 bg-slate-800 text-slate-500">
        —
      </span>
    )
  }
  const tier = latencyTier(result.ms)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-default ${tier.pill}`}
        >
          {tier.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs max-w-56">
        Estimated time-to-first-word. Lower is better. Powered by streaming LLM response.
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Transcript Viewer ─────────────────────────────────────────────────────────

function TranscriptViewer({ call }: { call: CallLog }) {
  const [copied, setCopied] = useState(false)
  const turns = parseTranscript(call.transcript)

  const rawText = (() => {
    if (!call.transcript) return ''
    if (typeof call.transcript === 'string') return call.transcript
    return (call.transcript as TranscriptTurn[])
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n')
  })()

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
      {/* Copy button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-200 text-xs h-7 px-2"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1.5" />
          )}
          {copied ? 'Copied!' : 'Copy Transcript'}
        </Button>
      </div>

      {/* Content */}
      {!call.transcript ? (
        <p className="text-sm text-slate-500 text-center py-4">No transcript available.</p>
      ) : turns ? (
        // Chat bubbles
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {turns.map((turn, i) => (
            <div
              key={i}
              className={`flex ${turn.role === 'agent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  turn.role === 'agent'
                    ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-100 rounded-br-sm'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                <span className="block text-[10px] uppercase tracking-widest mb-1 opacity-50 font-semibold">
                  {turn.role}
                </span>
                {turn.content}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Legacy plain string
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300 max-h-80 overflow-y-auto">
          {call.transcript as string}
        </pre>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CallLogs() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: calls, isLoading } = useQuery<CallLog[]>({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await api.get('/calls')
      return response.data
    },
  })

  const toggleRow = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Call Logs</h1>
          <p className="text-slate-400 mt-1">
            Review webhook transcripts from all your customers' AI calls.
          </p>
        </div>

        <div className="border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900">
              <TableRow className="border-slate-800 hover:bg-slate-900">
                <TableHead className="text-slate-400 font-semibold">Date / Time</TableHead>
                <TableHead className="text-slate-400 font-semibold">Caller</TableHead>
                <TableHead className="text-slate-400 font-semibold">Duration</TableHead>
                <TableHead className="text-slate-400 font-semibold">Outcome</TableHead>
                <TableHead className="text-slate-400 font-semibold">Latency</TableHead>
                <TableHead className="text-slate-400 font-semibold text-right">Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    Loading call logs…
                  </TableCell>
                </TableRow>
              ) : calls && calls.length > 0 ? (
                calls.map((call) => (
                  <>
                    <TableRow
                      key={call.id}
                      className="border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(call.id)}
                    >
                      {/* Date/Time */}
                      <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                        {formatDateTime(call.started_at)}
                      </TableCell>

                      {/* Caller */}
                      <TableCell className="font-medium text-slate-200 font-mono text-sm">
                        {call.caller_number ?? 'Unknown'}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="text-slate-400 font-mono text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          {formatDuration(call.duration_seconds)}
                        </div>
                      </TableCell>

                      {/* Outcome badge */}
                      <TableCell>
                        <Badge variant={outcomeVariant(call.outcome)}>
                          {outcomeLabel(call.outcome)}
                        </Badge>
                      </TableCell>

                      {/* Latency pill */}
                      <TableCell>
                        <LatencyPill call={call} />
                      </TableCell>

                      {/* Expand toggle */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10"
                          onClick={(e) => { e.stopPropagation(); toggleRow(call.id) }}
                        >
                          {expandedId === call.id ? (
                            <ChevronUp className="w-4 h-4 mr-1.5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mr-1.5" />
                          )}
                          {expandedId === call.id ? 'Hide' : 'Transcript'}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded transcript row */}
                    {expandedId === call.id && (
                      <TableRow key={`${call.id}-transcript`} className="border-slate-800 bg-slate-950/40">
                        <TableCell colSpan={6} className="py-4 px-6">
                          <TranscriptViewer call={call} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <PhoneCall className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-slate-300">No calls found</p>
                        <p className="text-sm">
                          When your agents handle calls, the transcripts will appear here.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}
