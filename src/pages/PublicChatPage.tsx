import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RetellWebClient } from 'retell-client-js-sdk'
import { publicAgentService } from '@/lib/api'
import type { PublicAgentInfo } from '@/types/api'
import { Loader2, Mic, MicOff, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

const client = new RetellWebClient()

export function PublicChatPage() {
  const { customerId } = useParams<{ customerId: string }>()

  const [info, setInfo] = useState<PublicAgentInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<CallStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)

  // Fetch public agent info (no auth)
  useEffect(() => {
    if (!customerId) return
    publicAgentService.getInfo(customerId)
      .then((r) => setInfo(r.data))
      .catch(() => setLoadError('Agent not found. The link may be invalid.'))
  }, [customerId])

  // Retell SDK event listeners
  useEffect(() => {
    const onStart = () => setStatus('active')
    const onEnd   = () => setStatus('ended')
    const onError = (err: unknown) => {
      console.error('Retell SDK error:', err)
      setStatus('error')
    }
    client.on('call_started', onStart)
    client.on('call_ended',   onEnd)
    client.on('error',        onError)
    return () => {
      client.off('call_started', onStart)
      client.off('call_ended',   onEnd)
      client.off('error',        onError)
    }
  }, [])

  async function startCall() {
    if (!customerId) return
    setStatus('connecting')
    try {
      const { data } = await publicAgentService.getToken(customerId)
      await client.startCall({ accessToken: data.access_token })
    } catch {
      setStatus('error')
    }
  }

  function endCall() {
    client.stopCall()
  }

  function toggleMute() {
    client.mute(!isMuted)
    setIsMuted((m) => !m)
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <PhoneCall className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-slate-300 font-medium">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-8">
      {/* Brand / agent identity */}
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
          <PhoneCall className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">{info.name}</h1>
        <p className="text-slate-400 text-sm">AI Voice Agent</p>
      </div>

      {/* Status pill */}
      <div className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
        status === 'active'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse'
          : status === 'connecting'
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : status === 'ended'
          ? 'bg-slate-800 border-slate-700 text-slate-400'
          : status === 'error'
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-slate-800 border-slate-700 text-slate-500'
      }`}>
        {status === 'idle'       && 'Ready to connect'}
        {status === 'connecting' && 'Connecting…'}
        {status === 'active'     && 'Call in progress'}
        {status === 'ended'      && 'Call ended'}
        {status === 'error'      && 'Connection failed'}
      </div>

      {/* Call controls */}
      <div className="flex gap-4">
        {(status === 'idle' || status === 'ended' || status === 'error') && (
          <Button
            onClick={startCall}
            disabled={!info.has_agent}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 h-12 text-base shadow-lg shadow-emerald-500/20"
          >
            <PhoneCall className="w-5 h-5 mr-2" />
            {status === 'ended' ? 'Call Again' : 'Talk to Agent'}
          </Button>
        )}

        {status === 'connecting' && (
          <Button disabled className="bg-slate-800 text-slate-400 px-8 h-12">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting…
          </Button>
        )}

        {status === 'active' && (
          <>
            <Button
              onClick={toggleMute}
              variant="outline"
              className={`h-12 w-12 rounded-full border-slate-700 ${isMuted ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 text-slate-300'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 h-12 shadow-lg shadow-red-500/20"
            >
              End Call
            </Button>
          </>
        )}
      </div>

      {!info.has_agent && (
        <p className="text-xs text-slate-600">This agent is not yet configured.</p>
      )}

      <p className="text-xs text-slate-700 mt-4">Powered by Voice Agent Platform</p>
    </div>
  )
}
