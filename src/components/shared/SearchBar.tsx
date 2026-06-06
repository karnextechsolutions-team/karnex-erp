'use client'

import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Search…', className }: SearchBarProps) {
  return (
    <div className={`relative flex items-center w-full md:w-80 ${className || ''}`}>
      <Search className="absolute left-3 w-4 h-4 text-[#8FAF9F] pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-9 w-full bg-white border border-[#E2EBE7] rounded-lg text-sm text-[#1A2E25] placeholder-[#8FAF9F] focus-visible:ring-1 focus-visible:ring-[#2D6A4F] focus-visible:border-[#2D6A4F]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 p-1 rounded-md text-[#8FAF9F] hover:text-[#4A6358] transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
