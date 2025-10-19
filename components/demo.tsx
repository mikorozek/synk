"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

export function Demo() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !imageRef.current) return

      const sectionTop = sectionRef.current.offsetTop
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      if (scrollY + windowHeight > sectionTop + 100) {
        const progress = Math.min(1, (scrollY - sectionTop + windowHeight) / windowHeight)
        const translateY = Math.max(0, 50 - progress * 50)
        const opacity = Math.min(1, progress * 1.5)

        imageRef.current.style.transform = `translateY(${translateY}px)`
        imageRef.current.style.opacity = opacity.toString()
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">See Synk in action</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
            Experience intelligent notification management with our intuitive dashboard
          </p>
        </div>

        <div ref={imageRef} className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
          <div className="aspect-video bg-gradient-to-br from-accent/20 via-background to-background relative">
            <Image
              src="/modern-dark-dashboard-interface-showing-notificati.jpg"
              alt="Synk Dashboard Demo"
              width={1400}
              height={800}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  )
}
