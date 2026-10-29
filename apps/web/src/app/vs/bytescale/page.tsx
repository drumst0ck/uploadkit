import type { Metadata } from 'next'
import { ComparePage } from '../_compare-page'
import { COMPARISONS } from '../_data'

const TITLE = 'Bytescale alternative: UploadKit vs Bytescale pricing'
const DESCRIPTION =
  'UploadKit vs Bytescale compared: free plan vs $7/mo Basic, storage and bandwidth limits, file sizes, own buckets and an MIT SDK with 40+ React components.'
const URL = 'https://uploadkit.dev/vs/bytescale'

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
  return <ComparePage c={COMPARISONS.bytescale} />
}
