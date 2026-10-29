import type { Metadata } from 'next'
import { ComparePage } from '../_compare-page'
import { COMPARISONS } from '../_data'

const TITLE = 'Uploadcare alternative: UploadKit vs Uploadcare pricing'
const DESCRIPTION =
  'UploadKit vs Uploadcare: Pro $15/mo vs $66/mo, free plan limits, file sizes, own S3 bucket and an MIT SDK with 40+ React components. Fair comparison.'
const URL = 'https://uploadkit.dev/vs/uploadcare'

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
  return <ComparePage c={COMPARISONS.uploadcare} />
}
