import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name?: string
  plan: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token })
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token)
        }
      },
      logout: () => {
        set({ user: null, token: null })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
        }
      },
      isAuthenticated: () => {
        const state = get()
        return !!state.token && !!state.user
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

interface AppState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
