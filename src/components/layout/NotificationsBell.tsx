'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/types/database'
import { toast } from 'sonner'

interface NotificationsBellProps {
  userId?: string
}

export default function NotificationsBell({ userId }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    const fetchNotifications = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.read).length)
      }
    }

    fetchNotifications()

    // Optionally set up real-time subscription here
    const supabase = createClient()
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)
          toast(payload.new.title, { description: payload.new.message })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return date.toLocaleDateString('en-GB')
  }

  return (
    <DropdownMenu>
      {/* @ts-ignore */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 border border-gray-200 shadow-lg rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <DropdownMenuLabel className="p-0 font-semibold text-gray-900">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
              className="text-xs text-green-700 hover:text-green-800 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer ${!notif.read ? 'bg-green-50/30' : ''}`}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <div className="shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-900 ${!notif.read ? 'font-semibold' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                      {formatTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="shrink-0 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-2 border-t border-gray-100 bg-gray-50">
          <Button variant="ghost" className="w-full text-xs h-8 text-gray-500 hover:text-gray-900">
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
