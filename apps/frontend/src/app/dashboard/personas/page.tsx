'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { personaApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Plus, Loader2, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'

export default function PersonasPage() {
  const { data: personas, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaApi.getAll()
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personas</h1>
          <p className="text-muted-foreground">
            Manage your AI brand personas
          </p>
        </div>
        <Link href="/dashboard/personas/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Persona
          </Button>
        </Link>
      </div>

      {personas && personas.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona: any, index: number) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/dashboard/personas/${persona.id}`}>
                <Card className="group cursor-pointer transition-all hover:border-foreground/20 hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {persona.name}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {persona.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="ml-4">
                        <div className={`rounded-full px-2 py-1 text-xs ${
                          persona.isActive
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {persona.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>{persona._count?.documents || 0} documents</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>{persona._count?.conversations || 0} conversations</span>
                        </div>
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
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">No personas yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Create your first AI persona to start engaging with your audience
            </p>
            <Link href="/dashboard/personas/new">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Persona
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
