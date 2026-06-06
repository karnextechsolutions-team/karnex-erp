'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User, Menu } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import NotificationsBell from './NotificationsBell'
import { COMPANY } from '@/lib/company'

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  procurement: 'bg-blue-100 text-blue-700',
  production: 'bg-amber-100 text-amber-700',
  sales: 'bg-green-100 text-green-700',
  viewer: 'bg-slate-100 text-slate-600',
}

interface HeaderProps {
  profile: Profile | null
  onMenuToggle?: () => void
}

export default function Header({ profile, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? COMPANY.shortName.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 h-14">
      {/* Left side: Hamburger button on mobile, empty space on desktop */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800 md:hidden">
          {COMPANY.shortName} ERP
        </span>
      </div>

      {/* Right side: Bell notification and profile actions */}
      <div className="flex items-center gap-3">
        <NotificationsBell userId={profile?.id} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2 px-1 md:px-2 h-auto py-1 hover:bg-slate-100 rounded-lg">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-[#2D6A4F] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-none text-slate-700">{profile?.full_name ?? 'User'}</p>
                </div>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-slate-800">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1.5 capitalize ${roleColors[profile?.role ?? 'viewer']}`}>
                {profile?.role}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> My profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
