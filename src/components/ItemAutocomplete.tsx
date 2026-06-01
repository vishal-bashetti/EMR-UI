import { useState, useRef, useEffect } from 'react'
import { useLabCatalog } from '../hooks/useLabResults'
import { useAppointmentTypes } from '../hooks/useAppointments'

export function ItemAutocomplete({
  value,
  onChange,
  onSelect,
  className,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  onSelect: (name: string, price: number) => void
  className?: string
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), 300)
    return () => clearTimeout(timer)
  }, [value])

  const { data: labCatalog } = useLabCatalog(debouncedValue)
  const { data: appointmentTypes } = useAppointmentTypes(debouncedValue)

  const suggestions = (() => {
    const valLower = value ? value.toLowerCase() : ''
    
    const labs = (labCatalog || [])
      .filter((l) => !valLower || l.name.toLowerCase().includes(valLower))
      .map((l) => ({ name: l.name, price: l.price, source: 'Lab Catalog' }))

    const apptTypes = (appointmentTypes || [])
      .map((a) => ({ name: a.name, price: a.rate, source: 'Appointment Type' }))

    const combined = [...labs, ...apptTypes]
    const seen = new Set()
    return combined.filter(item => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 8)
  })()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-xs flex justify-between items-center transition-colors"
              onClick={() => {
                onSelect(s.name, s.price)
                setIsOpen(false)
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-900">{s.name}</span>
                <span className="text-[10px] text-slate-400">{s.source}</span>
              </div>
              <span className="font-semibold text-slate-800">₹{s.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
