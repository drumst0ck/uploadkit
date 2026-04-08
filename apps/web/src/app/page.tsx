import Navbar from '@/components/nav/navbar'
import Hero from '@/components/hero/hero'
import { CodeDemo } from '@/components/code-demo/code-demo'
import { FeaturesGrid } from '@/components/features/features-grid'
import { ComparisonTable } from '@/components/comparison/comparison-table'
import { ComponentShowcase } from '@/components/showcase/component-showcase'
import { PricingPreview } from '@/components/pricing-preview/pricing-preview'
import { Footer } from '@/components/footer/footer'
import { AnimateObserver } from '@/components/shared/animate-observer'

// Server Component — only CodeDemoClient, ComponentShowcase, AnimateObserver ship JS
export default function WebPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <CodeDemo />
        <FeaturesGrid />
        <ComparisonTable />
        <ComponentShowcase />
        <PricingPreview />
      </main>
      <Footer />
      <AnimateObserver />
    </>
  )
}
