import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => setSidebarOpen((p) => !p)} />
      <div className="flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-200
            lg:translate-x-0 lg:block
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
