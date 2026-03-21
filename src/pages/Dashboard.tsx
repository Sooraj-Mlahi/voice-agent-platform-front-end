import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="max-w-4xl mx-auto flex flex-col items-start gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full">
          <h2 className="text-xl font-semibold mb-2">Welcome Back!</h2>
          <p className="text-slate-400 mb-6">You are successfully logged in as: <span className="text-indigo-400">{user?.email}</span></p>
          
          <Button onClick={signOut} variant="destructive">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
