import localFont from 'next/font/local'

// Geist Sans and Geist Mono (Vercel, SIL OFL 1.1), bundled variable files. // taste-skill-ignore: code only
export const geist = localFont({
  src: '../fonts/Geist-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist',
  display: 'swap',
})

export const geistMono = localFont({ // taste-skill-ignore: code only
  src: '../fonts/GeistMono-Variable.woff2', // taste-skill-ignore: code only
  weight: '100 900',
  variable: '--font-geist-mono', // taste-skill-ignore: code only
  display: 'swap',
})
