import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createInvoice, getInvoices, updateInvoiceStatus, updateInvoice, deleteInvoice, searchInvoiceItems } from '../api/billing'

export const useInvoices = (patientId?: number, startDate?: string, endDate?: string) =>
  useQuery({ queryKey: ['invoices', patientId, startDate, endDate], queryFn: () => getInvoices(patientId, startDate, endDate) })

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export const useUpdateInvoiceStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export const useUpdateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateInvoice(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export const useDeleteInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
