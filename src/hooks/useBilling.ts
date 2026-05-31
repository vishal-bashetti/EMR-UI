import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createInvoice, getInvoices, updateInvoiceStatus, deleteInvoice } from '../api/billing'

export const useInvoices = (patientId?: number) =>
  useQuery({ queryKey: ['invoices', patientId], queryFn: () => getInvoices(patientId) })

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

export const useDeleteInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
