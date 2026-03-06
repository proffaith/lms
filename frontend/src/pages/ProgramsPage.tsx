import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { ProgramObjective } from '@/types'

interface Program {
  id: number
  title: string
  description: string
  status: string
  objective_count: number
  course_count: number
}

export default function ProgramsPage() {
  const user = useAuthStore((s) => s.user)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [objectives, setObjectives] = useState<ProgramObjective[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', status: 'draft' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newObj, setNewObj] = useState({ code: '', description: '' })

  const canManage = user?.role === 'admin' || user?.role === 'instructor'

  const fetchPrograms = () => {
    api.get('/programs/')
      .then((res) => {
        const data = res.data
        setPrograms(Array.isArray(data) ? data : data.results || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPrograms() }, [])

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    api.get(`/programs/${id}/objectives/`).then((res) => {
      const data = res.data
      setObjectives(Array.isArray(data) ? data : data.results || [])
    })
  }

  const saveProgram = async () => {
    try {
      if (editingId) {
        await api.patch(`/programs/${editingId}/`, formData)
        toast.success('Program updated!')
      } else {
        await api.post('/programs/', formData)
        toast.success('Program created!')
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({ title: '', description: '', status: 'draft' })
      fetchPrograms()
    } catch {
      toast.error('Failed to save program.')
    }
  }

  const editProgram = (p: Program) => {
    setFormData({ title: p.title, description: p.description, status: p.status })
    setEditingId(p.id)
    setShowForm(true)
  }

  const deleteProgram = async (id: number) => {
    if (!confirm('Delete this program?')) return
    try {
      await api.delete(`/programs/${id}/`)
      toast.success('Program deleted.')
      fetchPrograms()
      if (expandedId === id) setExpandedId(null)
    } catch {
      toast.error('Failed to delete.')
    }
  }

  const addObjective = async (programId: number) => {
    if (!newObj.code || !newObj.description) return
    try {
      await api.post(`/programs/${programId}/objectives/`, {
        code: newObj.code,
        description: newObj.description,
        order: objectives.length,
      })
      setNewObj({ code: '', description: '' })
      // Refresh objectives
      const res = await api.get(`/programs/${programId}/objectives/`)
      const data = res.data
      setObjectives(Array.isArray(data) ? data : data.results || [])
      fetchPrograms()
      toast.success('Objective added!')
    } catch {
      toast.error('Failed to add objective.')
    }
  }

  const deleteObjective = async (objId: number) => {
    try {
      await api.delete(`/program-objectives/${objId}/`)
      setObjectives((prev) => prev.filter((o) => o.id !== objId))
      fetchPrograms()
      toast.success('Objective removed.')
    } catch {
      toast.error('Failed to delete objective.')
    }
  }

  if (loading) return <p className="text-gray-500">Loading programs...</p>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Programs
        </h1>
        {canManage && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({ title: '', description: '', status: 'draft' })
            }}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" /> New Program
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-2 border-blue-200">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Program' : 'New Program'}
          </h2>
          <div className="space-y-3">
            <input
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder="Program title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <select
              value={formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={saveProgram}
                disabled={!formData.title}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program List */}
      {programs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          No programs yet.
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((prog) => (
            <div key={prog.id} className="bg-white rounded-lg shadow-sm border">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(prog.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === prog.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{prog.title}</h3>
                    <p className="text-xs text-gray-500">
                      {prog.objective_count} objectives | {prog.course_count} courses |{' '}
                      <span className={clsx(
                        prog.status === 'active' ? 'text-green-600' : 'text-gray-400',
                      )}>
                        {prog.status}
                      </span>
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => editProgram(prog)} className="p-1 text-gray-400 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteProgram(prog.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {expandedId === prog.id && (
                <div className="border-t p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Program Objectives</h4>
                  {objectives.length === 0 ? (
                    <p className="text-sm text-gray-400">No objectives yet.</p>
                  ) : (
                    <ul className="space-y-2 mb-4">
                      {objectives.map((obj) => (
                        <li key={obj.id} className="flex items-start gap-3">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono font-medium mt-0.5">
                            {obj.code}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{obj.description}</span>
                          {canManage && (
                            <button
                              onClick={() => deleteObjective(obj.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <input
                        value={newObj.code}
                        onChange={(e) => setNewObj((p) => ({ ...p, code: e.target.value }))}
                        placeholder="PLO-1"
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
                      />
                      <input
                        value={newObj.description}
                        onChange={(e) => setNewObj((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Objective description..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => addObjective(prog.id)}
                        disabled={!newObj.code || !newObj.description}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
