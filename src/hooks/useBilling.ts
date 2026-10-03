import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createInvoice, getInvoices, updateInvoiceStatus, updateInvoice, deleteInvoice, searchInvoiceItems } from '../api/billing'
import type { Invoice } from '../types'

export const useInvoices = (patientId?: number, startDate?: string, endDate?: string, options?: any) =>
  useQuery<Invoice[]>({
    queryKey: ['invoices', patientId, startDate, endDate],
    queryFn: () => getInvoices(patientId, startDate, endDate),
    ...options,
  })

export const useSearchInvoiceItems = (query: string) =>
  useQuery({
    queryKey: ['invoiceItemsSearch', query],
    queryFn: () => searchInvoiceItems(query),
    enabled: query.length > 1,
  })

export const useCreateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })]),
  })
}

export const useUpdateInvoiceStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string; payment_mode?: string; transaction_id?: string } }) => updateInvoiceStatus(id, data),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })]),
  })
}

export const useUpdateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateInvoice(id, data),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })]),
  })
}

export const useDeleteInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })]),
  })
}
