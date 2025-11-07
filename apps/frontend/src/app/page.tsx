'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Brain,
  MessageSquare,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Hero animations
    const ctx = gsap.context(() => {
      gsap.from('.hero-title', {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
      })

      gsap.from('.hero-subtitle', {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.3,
        ease: 'power4.out',
      })

      gsap.from('.hero-cta', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        ease: 'power4.out',
      })

      // Feature cards animation
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 80%',
        },
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power4.out',
      })

      // Stats animation
      gsap.from('.stat-item', {
        scrollTrigger: {
          trigger: '.stats-section',
          start: 'top 80%',
        },
        scale: 0.5,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)',
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Personas',
      description:
        'Train intelligent brand personas on your content, tone, and values',
    },
    {
      icon: MessageSquare,
      title: 'Omnichannel Deployment',
      description:
        'Deploy across web, WhatsApp, Telegram, Discord, and more',
    },
    {
      icon: Zap,
      title: 'Real-Time Learning',
      description:
        'Your persona evolves and improves with every interaction',
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description:
        'Track engagement, conversions, and performance across all channels',
    },
  ]

  const stats = [
    { value: '10x', label: 'Faster Responses' },
    { value: '95%', label: 'Accuracy Rate' },
    { value: '24/7', label: 'Always Available' },
    { value: '∞', label: 'Scalability' },
  ]

  return (
    <div ref={heroRef} className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <Sparkles className="h-6 w-6" />
            <span className="text-xl font-bold">PersonaOS</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container flex min-h-screen flex-col items-center justify-center px-4 pt-16">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
            className="mx-auto mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted"
          >
            <Brain className="h-10 w-10" />
          </motion.div>

          <h1 className="hero-title mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Your Brand's
            <br />
            <span className="bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
              AI Twin
            </span>
          </h1>

          <p className="hero-subtitle mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Build, deploy, and evolve intelligent brand personas that speak,
            sell, and learn across every channel.
          </p>

          <div className="hero-cta flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="group">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Animated Background Grid */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className="features-section container py-24"
      >
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A complete platform for creating and deploying intelligent brand
            personas
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="feature-card"
            >
              <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-lg">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section border-y border-border bg-muted/50 py-16">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item text-center">
                <div className="mb-2 text-4xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-lg border border-border bg-muted p-12 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Join thousands of brands using PersonaOS to scale their engagement
            and grow their business.
          </p>
          <Link href="/register">
            <Button size="lg">Create Your Persona</Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">PersonaOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 PersonaOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
