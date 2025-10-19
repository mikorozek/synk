import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <Image src="/synk-logo.png" alt="Synk" width={120} height={32} className="h-8 w-auto" />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © 2025 Synk. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
