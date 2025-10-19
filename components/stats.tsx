"use client"

import { useEffect, useRef } from "react"

const stats = [
  {
    value: "250K+",
    label: "Active users",
    suffix: "",
  },
  {
    value: "10M+",
    label: "Events processed daily",
    suffix: "",
  },
  {
    value: "50K+",
    label: "Active communities",
    suffix: "",
  },
  {
    value: "100+",
    label: "Platform integrations",
    suffix: "",
  },
]

export function Stats() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const sectionTop = sectionRef.current.offsetTop
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      if (scrollY + windowHeight > sectionTop + 100) {
        const translateY = Math.max(0, (scrollY - sectionTop + windowHeight) * 0.05)
        sectionRef.current.style.transform = `translateY(-${translateY}px)`
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-6 relative border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Trusted by communities worldwide</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
            From small teams to large communities, Synk helps thousands stay connected with what matters
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-accent mb-2">
                {stat.value}
                {stat.suffix}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
