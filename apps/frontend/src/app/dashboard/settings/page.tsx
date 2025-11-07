'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store'
import { Settings as SettingsIcon } from 'lucide-react'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your PersonaOS account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Name</div>
            <div className="text-lg">{user?.name || 'Not set'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-lg">{user?.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Plan</div>
            <div className="text-lg capitalize">{user?.plan}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <SettingsIcon className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">More Settings Coming Soon</h3>
          <p className="text-center text-muted-foreground">
            Additional settings and preferences will be available in future updates
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
