import { Hero } from "@/components/hero"
import { Stats } from "@/components/stats"
import { Features } from "@/components/features"
import { Demo } from "@/components/demo"
import { Integrations } from "@/components/integrations"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Stats />
      <Features />
      <Demo />
      <Integrations />
      <CTA />
      <Footer />
    </main>
  )
}
