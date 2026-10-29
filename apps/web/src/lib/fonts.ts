import { Geist, Geist_Mono } from 'next/font/google' // taste-skill-ignore: mono is only for real <code>

// Geist for all reading text; Geist Mono only inside real <code> and data-ui fragments.
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
