import { createClient } from '@/lib/supabase/client'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export async function createNotification(
  userId: string | null,
  title: string,
  message: string,
  type: NotificationType = 'info'
) {
  const supabase = createClient()
  
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    read: false
  })
  
  if (error) {
    console.error('Failed to create notification:', error)
  }
}
