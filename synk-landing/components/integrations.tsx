"use client"

import { useEffect, useRef } from "react"

const integrations = [
  { name: "Reddit", category: "Social" },
  { name: "Twitter", category: "Social" },
  { name: "RSS Feeds", category: "Content" },
  { name: "Discord", category: "Community" },
  { name: "Telegram", category: "Community" },
  { name: "Slack", category: "Workspace" },
  { name: "GitHub", category: "Development" },
  { name: "YouTube", category: "Content" },
  { name: "Twitch", category: "Streaming" },
  { name: "Medium", category: "Content" },
  { name: "Hacker News", category: "Tech" },
  { name: "Product Hunt", category: "Tech" },
  { name: "Stripe", category: "Payments" },
  { name: "Shopify", category: "E-commerce" },
  { name: "WordPress", category: "CMS" },
  { name: "Notion", category: "Productivity" },
  { name: "Airtable", category: "Database" },
  { name: "Google Analytics", category: "Analytics" },
  { name: "Mixpanel", category: "Analytics" },
  { name: "Sentry", category: "Monitoring" },
]

export function Integrations() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !gridRef.current) return

      const sectionTop = sectionRef.current.offsetTop
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      if (scrollY + windowHeight > sectionTop + 100) {
        const translateY = Math.max(0, (scrollY - sectionTop + windowHeight) * 0.08)
        gridRef.current.style.transform = `translateY(-${translateY}px)`
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="py-32 px-6 relative bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            Connect with <span className="text-accent">100+ platforms</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
            From social media APIs to RSS feeds, Synk integrates with all your favorite tools and data sources
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-lg border border-border bg-card hover:border-accent/50 transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-center">
                <div className="font-semibold mb-1 text-sm">{integration.name}</div>
                <div className="text-xs text-muted-foreground">{integration.category}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            And many more... <span className="text-accent font-semibold">Custom integrations available</span>
          </p>
        </div>
      </div>
    </section>
  )
}
