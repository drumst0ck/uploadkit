import type { Metadata } from 'next'
import { ComparePage } from '../_compare-page'
import { COMPARISONS } from '../_data'

const TITLE = 'UploadKit vs UploadThing: pricing, BYOS and components'
const DESCRIPTION =
  'Compare UploadKit and UploadThing on pricing, free plan, bandwidth, file size, own-bucket support and components. When to pick each, plus a migration guide.'
const URL = 'https://uploadkit.dev/vs/uploadthing'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    type: 'website',
    images: ['/og/home.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og/home.png'],
  },
}

export default function Page() {
  return <ComparePage c={COMPARISONS.uploadthing} />
}
