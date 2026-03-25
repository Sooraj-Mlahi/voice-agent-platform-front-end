import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    name: '',
    billing_email: '',
    phone_number: '',
    plan: 'starter'
  })

  const mutation = useMutation({
    mutationFn: async (newCustomer: typeof formData) => {
      const response = await api.post('/api/customers', {
        ...newCustomer,
        status: 'active',
        retell_agent_id: null,
        agent_config: {
          system_prompt: "You are a helpful customer service assistant.",
          voice_id: "11labs-Adrian",
          language: "en-US",
          llm_model: "gpt-4o",
          recording_enabled: true
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setOpen(false)
      setFormData({ name: '', billing_email: '', phone_number: '', plan: 'starter' })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-indigo-500/20 shadow-lg transition-all duration-200">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription className="text-slate-400">
            Instantly spin up a new AI Voice Agent for your client by filling out these initial details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-slate-300">Name</Label>
              <Input 
                id="name" 
                placeholder="Acme Corp" 
                className="bg-slate-950 border-slate-800"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-slate-300">Billing Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="billing@acme.com" 
                className="bg-slate-950 border-slate-800"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                required 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number (Optional)</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+15551234567" 
                className="bg-slate-950 border-slate-800"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mutation.isPending ? "Creating..." : "Create Customer & Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
