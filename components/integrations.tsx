"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const integrations = [
  { name: "MultiversX", category: "Blockchain", logo: "https://multiversx.com/favicon.ico" },
  { name: "Reddit", category: "Social", logo: "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png" },
  { name: "Twitter", category: "Social", logo: "https://abs.twimg.com/favicons/twitter.3.ico" },
  { name: "RSS Feeds", category: "Content", logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/rss.svg" },
  { name: "Discord", category: "Community", logo: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" },
  { name: "Telegram", category: "Community", logo: "https://telegram.org/favicon.ico" },
  { name: "Slack", category: "Workspace", logo: "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png" },
  { name: "GitHub", category: "Development", logo: "https://github.githubassets.com/favicons/favicon.png" },
  { name: "Twitch", category: "Streaming", logo: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png" },
  { name: "Hacker News", category: "Tech", logo: "https://news.ycombinator.com/favicon.ico" },
  { name: "Stripe", category: "Payments", logo: "https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg?q=80&w=32" },
  { name: "Shopify", category: "E-commerce", logo: "https://cdn.shopify.com/static/shopify-favicon.png" },
  { name: "WordPress", category: "CMS", logo: "https://s.w.org/favicon.ico" },
  { name: "Notion", category: "Productivity", logo: "https://www.notion.so/images/favicon.ico" },
  { name: "Airtable", category: "Database", logo: "https://airtable.com/favicon.ico" },
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
            Connect with <span className="text-yellow-400">100+ platforms</span>
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
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 relative flex items-center justify-center">
                    <Image
                      src={integration.logo}
                      alt={`${integration.name} logo`}
                      width={40}
                      height={40}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
                <div className="font-semibold mb-1 text-sm">{integration.name}</div>
                <div className="text-xs text-muted-foreground">{integration.category}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            And many more... <span className="text-yellow-400 font-bold">Custom integrations available</span>
          </p>
        </div>
      </div>
    </section>
  )
}
