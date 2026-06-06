'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package2, LayoutDashboard, ShoppingCart, Warehouse,
  Settings2, Users, BarChart3, Factory, TruckIcon, ChevronRight, XIcon, DollarSign, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { COMPANY } from '@/lib/company'

const navItems = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin','manager','procurement','production','sales','viewer'] },
  { href: '/procurement', label: 'Procurement',  icon: TruckIcon,       roles: ['admin','manager','procurement'] },
  { href: '/inventory',   label: 'Inventory',    icon: Warehouse,       roles: ['admin','manager','procurement','production'] },
  { href: '/production',  label: 'Production',   icon: Factory,         roles: ['admin','manager','production'] },
  { href: '/sales',       label: 'Sales',        icon: ShoppingCart,    roles: ['admin','manager','sales'] },
  { href: '/customers',   label: 'Customers',    icon: Users,           roles: ['admin','manager','sales'] },
  { href: '/finance',     label: 'Finance',      icon: DollarSign,      roles: ['admin','manager'] },
  { href: '/reports',     label: 'Reports',      icon: BarChart3,       roles: ['admin','manager'] },
  { href: '/settings',    label: 'Settings',     icon: Settings2,       roles: ['admin'] },
]

interface SidebarProps {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const role = profile?.role ?? 'viewer'

  const allowed = navItems.filter(item => item.roles.includes(role))

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-64 bg-green-900 text-white
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:w-60
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden text-green-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-green-800">
          <img
            src={COMPANY.logo}
            alt={COMPANY.shortName}
            className="w-10 h-10 rounded-lg object-contain bg-white p-1"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="min-w-0 pr-8 md:pr-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {COMPANY.shortName}
            </p>
            <p className="text-xs text-green-300 truncate">{COMPANY.tagline}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowed.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm transition-all group relative rounded-lg',
                  isActive
                    ? 'bg-green-800 text-white font-medium'
                    : 'text-green-100 hover:bg-green-800/50 hover:text-white'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom user info */}
        <div className="px-5 py-4 bg-green-950 border-t border-green-800 shrink-0">
          <p className="text-xs font-semibold text-white truncate">{profile?.full_name ?? 'User'}</p>
          <p className="text-[10px] text-green-300 truncate mt-0.5">{profile?.email}</p>
        </div>
      </aside>
    </>
  )
}
