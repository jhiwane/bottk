import './globals.css'

export const metadata = {
  title: 'TK Baiturrohman Pulodarat - Mencetak Generasi Cerdas & Berakhlak',
  description: 'Selamat datang di situs resmi TK Baiturrohman Pulodarat. Kami berdedikasi mencetak generasi yang cerdas, kreatif, dan berakhlakul karimah melalui pendidikan usia dini yang berkualitas.',
  icons: {
    icon: '/logotk.png',
    apple: '/logotk.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="scroll-smooth overflow-x-hidden">
      <head>
        <meta name="google-site-verification" content="pVEhWQj5gM0Qpot1zgwcXFErmapQeedwLsulUHU8ryI" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
