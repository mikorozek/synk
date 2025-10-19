"use client"

import { useEffect, useRef } from "react"
import { Bell, Zap, Shield, Brain, Users, Filter } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Filtering",
    description: "Machine learning algorithms understand your preferences and filter notifications intelligently.",
  },
  {
    icon: Users,
    title: "Built for Communities",
    description: "Perfect for Discord servers, Telegram groups, and online communities managing multiple data sources.",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description: "Process millions of events per second with sub-50ms latency for instant notifications.",
  },
  {
    icon: Filter,
    title: "Multi-Source Aggregation",
    description: "Combine Reddit, Twitter, RSS feeds, and more into a single intelligent notification stream.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance with SOC 2, GDPR, and HIPAA standards.",
  },
  {
    icon: Bell,
    title: "Smart Prioritization",
    description: "Automatically prioritize critical alerts while batching less urgent updates.",
  },
]

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const sectionTop = sectionRef.current.offsetTop
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      cardsRef.current.forEach((card, index) => {
        if (!card) return

        const cardTop = card.offsetTop + sectionTop
        const cardVisible = scrollY + windowHeight > cardTop + 100

        if (cardVisible) {
          const translateY = Math.max(0, (scrollY - cardTop + windowHeight) * 0.1)
          card.style.transform = `translateY(-${translateY}px)`
        }
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="py-32 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">Built for the modern data landscape</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
            Synk adapts to your workflow, integrates with your tools, and scales with your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                ref={(el) => {
                  if (el) cardsRef.current[index] = el
                }}
                className="group relative p-8 rounded-lg border border-border bg-card hover:border-accent/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
