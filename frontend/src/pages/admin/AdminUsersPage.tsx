import { useEffect, useState } from 'react'
import {
  Search,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { AdminUser, UserRole } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('student')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<AdminUser[]>('/auth/admin/users/')
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false))
  }, [])

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id)
    setEditRole(user.role)
  }

  const saveRole = async (userId: number) => {
    setSaving(true)
    try {
      await api.patch(`/auth/admin/users/${userId}/`, { role: editRole })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: editRole } : u)),
      )
      toast.success('Role updated.')
      setEditingId(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update role.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (userId: number, currentActive: boolean) => {
    try {
      await api.patch(`/auth/admin/users/${userId}/`, { is_active: !currentActive })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u)),
      )
      toast.success(currentActive ? 'User deactivated.' : 'User activated.')
    } catch {
      toast.error('Failed to update user.')
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    instructor: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
  }

  if (loading) return <p className="text-gray-500">Loading users...</p>

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6" />
        Manage Users
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="instructor">Instructors</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">{filteredUsers.length} users</p>

      {/* User table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {u.first_name} {u.last_name}
                    </div>
                    <div className="text-xs text-gray-500">@{u.username}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="student">student</option>
                          <option value="instructor">instructor</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          onClick={() => saveRole(u.id)}
                          disabled={saving}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded font-medium',
                        roleColors[u.role] || 'bg-gray-100 text-gray-600',
                      )}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded font-medium',
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId !== u.id && (
                        <button
                          onClick={() => startEdit(u)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" /> Role
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        className={clsx(
                          'text-xs hover:underline flex items-center gap-1',
                          u.is_active ? 'text-red-600' : 'text-green-600',
                        )}
                      >
                        <UserCheck className="w-3 h-3" />
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
