'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import type { Profile } from '@/types/database'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !prof) {
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          role: 'viewer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
      } else {
        setProfile(prof as Profile)
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAF9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
          <p className="text-sm font-medium text-[#4A6358]">Loading system session…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F8FAF9] overflow-hidden">
      {/* Sidebar with mobile drawer state props */}
      <Sidebar
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header with hamburger toggle sidebar prop */}
        <Header
          profile={profile}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  )
}
