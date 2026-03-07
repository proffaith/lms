import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Home,
  Settings,
  Target,
  Upload,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <Home className="w-5 h-5" /> },
  { label: 'Courses', path: '/courses', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Programs', path: '/programs', icon: <Target className="w-5 h-5" /> },
  { label: 'My Progress', path: '/progress', icon: <BarChart3 className="w-5 h-5" />, roles: ['student'] },
  { label: 'Certificates', path: '/my-certificates', icon: <Award className="w-5 h-5" />, roles: ['student'] },
  // Instructor
  { label: 'My Courses', path: '/instructor/courses', icon: <GraduationCap className="w-5 h-5" />, roles: ['instructor'] },
  { label: 'Submissions', path: '/instructor/submissions', icon: <ClipboardList className="w-5 h-5" />, roles: ['instructor'] },
  // Admin
  { label: 'Manage Users', path: '/admin/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Manage Courses', path: '/admin/courses', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Import Course', path: '/admin/import', icon: <Upload className="w-5 h-5" />, roles: ['admin'] },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role) || user.role === 'admin'
  })

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-57px)]">
      <nav className="p-4 space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              location.pathname === item.path
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
