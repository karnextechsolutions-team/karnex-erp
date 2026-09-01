'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Edit2, X, Power, Plus } from 'lucide-react'
import { COMPANY } from '@/lib/company'

const ERP_ROLES = ['ADMIN', 'SALES', 'PROCUREMENT', 'QA', 'PRODUCTION', 'FINANCE', 'HR'] as const

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const tabs = [
    { key: 'company', label: 'Company Profile' },
    { key: 'users', label: 'User Role Management' }
  ] as const
  
  const [activeTab, setActiveTab] = useState<'company' | 'users'>('company')

  // --- USERS STATE ---
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [editUser, setEditUser] = useState<any>(null)
  const [newRole, setNewRole] = useState('')
  const [saving, setSaving] = useState(false)

  // --- ADD USER STATE ---
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', password: '', role: 'SALES'
  })

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data ?? [])
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // --- ACTIONS: USERS ---
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser || !newRole) return
    setSaving(true)
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', editUser.id)
    if (error) {
      toast.error('Failed to save role: ' + error.message)
    } else {
      toast.success('User role updated successfully!')
      loadUsers()
      setEditUser(null)
    }
    setSaving(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.role) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      let token = ''
      try {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token || ''
      } catch (err) {
        console.error('Failed to get session from supabase:', err)
      }

      if (!token && typeof window !== 'undefined') {
        // Fallback 1: LocalStorage keys search
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            try {
              const val = localStorage.getItem(key)
              if (val) {
                const parsed = JSON.parse(val)
                token = parsed?.access_token || ''
                if (token) break
              }
            } catch {}
          }
        }
      }

      if (!token && typeof document !== 'undefined') {
        // Fallback 2: Parse document.cookie matching Supabase auth token format
        const match = document.cookie.match(/sb-[a-z0-9]+-auth-token=([^;]+)/)
        if (match) {
          try {
            const parsed = JSON.parse(decodeURIComponent(match[1]))
            token = parsed?.access_token || ''
          } catch {}
        }
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUserForm)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('User created successfully!')
        setShowAddUser(false)
        loadUsers()
      } else {
        toast.error(data.error || 'Failed to create user')
      }
    } catch (err: any) {
      toast.error('An error occurred: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // --- FILTERS & BADGES ---
  const filteredUsers = users.filter(u =>
    (u.full_name ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(userSearch.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const normalizedRole = (role || 'viewer').toLowerCase()
    const map: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      manager: 'bg-purple-100 text-purple-700 border-purple-200',
      procurement: 'bg-blue-100 text-blue-700 border-blue-200',
      production: 'bg-amber-100 text-amber-700 border-amber-200',
      sales: 'bg-green-100 text-green-700 border-green-200',
      qa: 'bg-teal-100 text-teal-700 border-teal-200',
      finance: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      hr: 'bg-pink-100 text-pink-700 border-pink-200',
      viewer: 'bg-gray-100 text-gray-600 border-gray-200'
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${map[normalizedRole] || map.viewer}`}>
        {role || 'viewer'}
      </span>
    )
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage company profile, user access roles, and configurations
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 0: COMPANY PROFILE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'company' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" className="w-16 h-16 object-contain rounded-xl border border-gray-200 p-2 bg-white" alt="Company Logo" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">{COMPANY.name}</h2>
                <p className="text-sm text-gray-500">{COMPANY.tagline}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Address</p><p className="font-semibold text-gray-800">{COMPANY.address}</p></div>
            <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Phone</p><p className="font-semibold text-gray-800">{COMPANY.phone}</p></div>
            <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Email</p><p className="font-semibold text-gray-800">{COMPANY.email}</p></div>
            <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Country</p><p className="font-semibold text-gray-800">{COMPANY.country}</p></div>
            <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Currency</p><p className="font-semibold text-gray-800">{COMPANY.currency}</p></div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              Note: To update company details, edit `src/lib/company.ts` and 
              replace `/public/logo.png` with your company logo file.
            </p>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TAB 1: USER ROLE MANAGEMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setNewUserForm({ name: '', email: '', password: '', role: 'SALES' })
                setShowAddUser(true)
              }}
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse border-spacing-0">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{u.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditUser(u); setNewRole(u.role || 'viewer') }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mt-4">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{u.full_name || 'No Name'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </div>
                  <div>{getRoleBadge(u.role)}</div>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-50">
                  <button
                    onClick={() => { setEditUser(u); setNewRole(u.role || 'viewer') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Role
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD USER DIALOG */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add New ERP User</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text" required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                <input
                  type="email" required
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="e.g. john@karnex.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                <input
                  type="password" required minLength={6}
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ERP User Role *</label>
                <select
                  required
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {ERP_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE DIALOG */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">Edit User Role</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
              <p className="font-bold text-gray-900">{editUser.full_name || 'No Name'}</p>
              <p className="text-sm text-gray-500">{editUser.email}</p>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role *</label>
                <select
                  required
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {/* Standard roles + existing compatible lowercase roles */}
                  {['admin', 'manager', 'procurement', 'production', 'sales', 'viewer', ...ERP_ROLES].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
                  {saving ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
