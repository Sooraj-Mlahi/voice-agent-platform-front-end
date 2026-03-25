import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { CustomersList } from './pages/CustomersList'
import { AgentConfig } from './pages/AgentConfig'
import { CallLogs } from './pages/CallLogs'
import { PublicChatPage } from './pages/PublicChatPage'

function App() {
  return (
    <Routes>
      {/* Public — no auth required */}
      <Route path="/login" element={<Login />} />
      <Route path="/chat/:customerId" element={<PublicChatPage />} />

      {/* Protected — requires Supabase session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<CustomersList />} />
          <Route path="/customers/:id/config" element={<AgentConfig />} />
          <Route path="/calls" element={<CallLogs />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
