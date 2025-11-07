'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { personaApi, chatApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, MessageSquare, TrendingUp, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'

export default function DashboardPage() {
  const { data: personas, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaApi.getAll()
      return response.data
    },
  })

  const stats = [
    {
      title: 'Total Personas',
      value: personas?.length || 0,
      icon: Brain,
      color: 'text-blue-500',
    },
    {
      title: 'Total Conversations',
      value: formatNumber(
        personas?.reduce((acc: number, p: any) => acc + (p._count?.conversations || 0), 0) || 0
      ),
      icon: MessageSquare,
      color: 'text-green-500',
    },
    {
      title: 'Total Messages',
      value: formatNumber(
        personas?.reduce((acc: number, p: any) => acc + (p._count?.messages || 0), 0) || 0
      ),
      icon: TrendingUp,
      color: 'text-purple-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your AI personas and activity
          </p>
        </div>
        <Link href="/dashboard/personas/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Persona
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Personas */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Your Personas</h2>
        {personas && personas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona: any, index: number) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/dashboard/personas/${persona.id}`}>
                  <Card className="cursor-pointer transition-all hover:border-foreground/20 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle>{persona.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {persona.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MessageSquare className="mr-1 h-4 w-4" />
                          {persona._count?.conversations || 0} conversations
                        </div>
                        <div className={cn(
                          'rounded-full px-2 py-1 text-xs',
                          persona.isActive
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {persona.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No personas yet</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Create your first AI persona to get started
              </p>
              <Link href="/dashboard/personas/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Persona
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
