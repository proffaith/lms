import { BookOpen, LogOut, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function Header() {
  const { user, handleLogout } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
        <BookOpen className="w-6 h-6" />
        LMS
      </Link>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{user.first_name || user.username}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
