'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { personaApi, chatApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const queryClient = useQueryClient()
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaApi.getAll()
      return response.data
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedPersonaId) throw new Error('No persona selected')

      const response = await chatApi.sendMessage({
        personaId: selectedPersonaId,
        message: text,
        conversationId: conversationId || undefined,
      })
      return response.data
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId)
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ])
      setMessage('')
    },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && selectedPersonaId) {
      sendMessageMutation.mutate(message)
    }
  }

  if (loadingPersonas) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!personas || personas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-semibold">No personas available</h3>
        <p className="mb-6 text-center text-muted-foreground">
          Create a persona first to start chatting
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat</h1>
        <p className="text-muted-foreground">
          Test and interact with your AI personas
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Persona Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Persona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personas.map((persona: any) => (
              <button
                key={persona.id}
                onClick={() => {
                  setSelectedPersonaId(persona.id)
                  setMessages([])
                  setConversationId(null)
                }}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-all',
                  selectedPersonaId === persona.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-foreground/20'
                )}
              >
                <div className="font-medium">{persona.name}</div>
                <div className="text-xs opacity-70">
                  {persona.description || 'No description'}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPersonaId ? (
              <div className="flex h-96 items-center justify-center text-muted-foreground">
                Select a persona to start chatting
              </div>
            ) : (
              <div className="space-y-4">
                {/* Messages */}
                <div className="h-96 space-y-4 overflow-y-auto rounded-lg border border-border p-4">
                  <AnimatePresence>
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          'flex items-start space-x-3',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg p-3',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          {msg.content}
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {sendMessageMutation.isPending && (
                    <div className="flex items-start space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
