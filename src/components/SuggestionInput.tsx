import { useState, useRef, useEffect } from 'react'

interface SuggestionItem {
  text: string
  count: number
}

export function SuggestionInput({
  value,
  onChange,
  fetchSuggestions,
  className,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (val: string) => void
  fetchSuggestions: (query: string) => Promise<SuggestionItem[]>
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced fetch
  useEffect(() => {
    if (!value || value.length < 1) {
      // Fetch top suggestions when focused with empty/short input
      if (isOpen && !disabled) {
        setLoading(true)
        fetchSuggestions('').then(data => {
          setSuggestions(data)
          setLoading(false)
        }).catch(() => setLoading(false))
      }
      return
    }

    if (disabled) return

    const timer = setTimeout(() => {
      setLoading(true)
      fetchSuggestions(value).then(data => {
        setSuggestions(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [value, isOpen, disabled])

  // Click outside handler
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
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
      />
      {isOpen && !disabled && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-xs flex justify-between items-center transition-colors"
              onClick={() => {
                onChange(s.text)
                setIsOpen(false)
              }}
            >
              <span className="font-medium text-slate-900">{s.text}</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                {s.count}×
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
