'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Menu, Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react'

interface HeaderProps {
  profile: any
  onMenuToggle: () => void
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  procurement: 'bg-blue-100 text-blue-700',
  production: 'bg-amber-100 text-amber-700',
  sales: 'bg-green-100 text-green-700',
  viewer: 'bg-slate-100 text-slate-600',
}

export default function Header({ profile, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'NU'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    try {
      setDropdownOpen(false)
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  function handleSettings() {
    setDropdownOpen(false)
    router.push('/settings')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between
      px-4 py-3 bg-white border-b border-gray-200 h-14 shrink-0">

      {/* Left: hamburger on mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900
            hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800 md:hidden">
          SL Natural ERP
        </span>
      </div>

      {/* Right: bell + avatar dropdown */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600
            hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg
              hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            {/* Avatar circle */}
            <div className="w-8 h-8 rounded-full bg-green-700 text-white
              flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            {/* Name - hidden on mobile */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {profile?.full_name ?? 'User'}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white
              border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">

              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name ?? 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {profile?.email ?? ''}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded
                  text-xs font-medium mt-1.5 capitalize
                  ${roleColors[profile?.role ?? 'viewer']}`}>
                  {profile?.role ?? 'viewer'}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={handleSettings}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Settings
                </button>

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
