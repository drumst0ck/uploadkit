import Navbar from '@/components/nav/navbar'
import Hero from '@/components/hero/hero'

// Server Component — no "use client"
export default function WebPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
      </main>
    </>
  )
}
