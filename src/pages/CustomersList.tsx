import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Settings, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Customer {
  id: string;
  name: string;
  billing_email: string;
  phone_number: string | null;
  status: string;
  plan: string;
  retell_agent_id: string | null;
}

import { CreateCustomerDialog } from '@/components/CreateCustomerDialog'

export function CustomersList() {
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers')
      return response.data
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Customers</h1>
          <p className="text-slate-400 mt-1">Manage your clients and their AI voice agents.</p>
        </div>
        <CreateCustomerDialog />
      </div>

      <div className="border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-400 font-semibold">Name</TableHead>
              <TableHead className="text-slate-400 font-semibold">Email</TableHead>
              <TableHead className="text-slate-400 font-semibold">Status</TableHead>
              <TableHead className="text-slate-400 font-semibold">Plan</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : customers && customers.length > 0 ? (
              customers.map((c) => (
                <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-medium text-slate-200">{c.name}</TableCell>
                  <TableCell className="text-slate-400">{c.billing_email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400 capitalize">{c.plan}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10">
                      <Link to={`/customers/${c.id}/config`}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configure Agent
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                      <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-300">No customers found</p>
                      <p className="text-sm">Click the button above to add your first customer.</p>
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
