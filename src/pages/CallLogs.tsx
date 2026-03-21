import { useQuery } from '@tanstack/react-query'
import { PhoneCall, Clock, Hash, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CallLog {
  id: string
  customer_id: string
  retell_call_id: string
  caller_number: string
  duration_seconds: number
  outcome: string
  transcript: string
}

export function CallLogs() {
  const { data: calls, isLoading } = useQuery<CallLog[]>({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await api.get('/calls')
      return response.data
    }
  })

  // Helper to format duration
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Call Logs</h1>
        <p className="text-slate-400 mt-1">Review webhook transcripts from all your customer's AI calls.</p>
      </div>

      <div className="border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-400 font-semibold">Caller Number</TableHead>
              <TableHead className="text-slate-400 font-semibold">Duration</TableHead>
              <TableHead className="text-slate-400 font-semibold">Outcome</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">Transcript</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                  Loading call logs...
                </TableCell>
              </TableRow>
            ) : calls && calls.length > 0 ? (
              calls.map((call) => (
                <TableRow key={call.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-medium text-slate-200">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2 text-slate-500" />
                      {call.caller_number}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-slate-500" />
                      {formatDuration(call.duration_seconds)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      call.outcome === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      call.outcome === 'voicemail' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {call.outcome || "unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View Transcript
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-100 max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Call Transcript</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
                          {call.transcript || "No transcript available for this call."}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                      <PhoneCall className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-300">No calls found</p>
                      <p className="text-sm">When your agents handle calls, the transcripts will appear here.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
