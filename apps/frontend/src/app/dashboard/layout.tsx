'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  Brain,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Personas', href: '/dashboard/personas', icon: Brain },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 256 : 0 }}
          className="relative border-r border-border"
        >
          <div className="flex h-full w-64 flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-border px-6">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6" />
                <span className="text-xl font-bold">PersonaOS</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.name} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={cn(
                        'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </motion.div>
                  </Link>
                )
              })}
            </nav>

            {/* User Profile */}
            <div className="border-t border-border p-4">
              <div className="mb-2 rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">{user?.name || user?.email}</div>
                <div className="text-xs text-muted-foreground">{user?.plan}</div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center border-b border-border px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
