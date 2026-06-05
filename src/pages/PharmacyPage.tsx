import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import api from '../api/axios'
import { Icons } from '../components/Icons'

interface PharmacyItem {
  id: number
  molecule: string
  name: string
  morning: string
  afternoon: string
  evening: string
  night: string
  when: string
  details: string
}

interface PharmacyOrder {
  id: number
  date_prescribed: string
  notes: string
  status: string
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  doctor: {
    id: number
    username: string
  }
  items: PharmacyItem[]
}

export default function PharmacyPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'All' | 'Waiting' | 'Processing' | 'Fulfilled' | 'Picked Up' | 'Cancelled'>('All')

  const { data: orders, isLoading } = useQuery<PharmacyOrder[]>({
    queryKey: ['pharmacy', 'orders'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/orders')
      return res.data
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.put(`/pharmacy/orders/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'orders'] })
      toast.success('Order status updated')
    },
    onError: () => {
      toast.error('Failed to update order status')
    },
  })

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'All') return true
    const s = o.status.toLowerCase()
    // Treat "Pending" as "Waiting" for backwards compatibility with previous payload
    const normalizedStatus = s === 'pending' ? 'waiting' : s
    return normalizedStatus === filter.toLowerCase()
  }) || []

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'waiting' || s === 'pending') return 'bg-amber-100 text-amber-700'
    if (s === 'processing') return 'bg-blue-100 text-blue-700'
    if (s === 'fulfilled') return 'bg-emerald-100 text-emerald-700'
    if (s === 'picked up') return 'bg-purple-100 text-purple-700'
    if (s === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
              {Icons.pill}
            </span>
            Pharmacy Queue
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xl leading-relaxed">
            Manage prescriptions and dispense medications to patients.
          </p>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-lg self-start">
          {['All', 'Waiting', 'Processing', 'Fulfilled', 'Picked Up', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="">
        {isLoading ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
            <p>Loading pharmacy queue…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {Icons.pill}
            </div>
            <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
            <p className="text-slate-500 mt-1">There are no prescriptions matching the current filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const isWaiting = order.status.toLowerCase() === 'waiting' || order.status.toLowerCase() === 'pending'
              const isProcessing = order.status.toLowerCase() === 'processing'
              const isFulfilled = order.status.toLowerCase() === 'fulfilled'
              
              return (
                <div key={order.id} className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {order.patient.first_name} {order.patient.last_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span>Prescribed by Dr. {order.doctor.username}</span>
                        <span>•</span>
                        <span>{new Date(order.date_prescribed).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                      {order.status === 'Pending' ? 'Waiting' : order.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200">
                          <th className="pb-2 font-medium">Drug</th>
                          <th className="pb-2 font-medium text-center">Morning</th>
                          <th className="pb-2 font-medium text-center">Afternoon</th>
                          <th className="pb-2 font-medium text-center">Evening</th>
                          <th className="pb-2 font-medium text-center">Night</th>
                          <th className="pb-2 font-medium text-right">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <tr key={item.id} className="text-slate-700">
                            <td className="py-2 font-medium text-slate-900">{item.name}</td>
                            <td className="py-2 text-center">{item.morning || '-'}</td>
                            <td className="py-2 text-center">{item.afternoon || '-'}</td>
                            <td className="py-2 text-center">{item.evening || '-'}</td>
                            <td className="py-2 text-center">{item.night || '-'}</td>
                            <td className="py-2 text-right text-slate-500">{item.when || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {order.notes && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 text-sm text-slate-600">
                        <strong>Notes:</strong> {order.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex justify-end gap-3">
                    {(isWaiting || isProcessing) && (
                      <button 
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'Cancelled' })}
                        disabled={updateStatus.isPending}
                        className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {isWaiting && (
                      <button 
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'Processing' })}
                        disabled={updateStatus.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        Start Processing
                      </button>
                    )}
                    
                    {isProcessing && (
                      <button 
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'Fulfilled' })}
                        disabled={updateStatus.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                    
                    {isFulfilled && (
                      <button 
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'Picked Up' })}
                        disabled={updateStatus.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        Mark Picked Up
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
