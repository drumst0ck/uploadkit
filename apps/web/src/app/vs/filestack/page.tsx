import type { Metadata } from 'next'
import { ComparePage } from '../_compare-page'
import { COMPARISONS } from '../_data'

const TITLE = 'Filestack alternative: UploadKit vs Filestack pricing'
const DESCRIPTION =
  'UploadKit vs Filestack compared: paid plans from $15/mo vs $69/mo, free plan limits, own-bucket support and an open-source SDK with 40+ React components.'
const URL = 'https://uploadkit.dev/vs/filestack'

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
  return <ComparePage c={COMPARISONS.filestack} />
}
