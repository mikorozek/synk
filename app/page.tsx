import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Integrations } from "@/components/integrations"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Integrations />
      <Footer />
    </main>
  )
}
