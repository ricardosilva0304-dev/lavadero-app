import Sidebar from '@/components/Sidebar'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-[#0E0C15] antialiased">
        <div className="flex">
          {/* El Sidebar se encarga de no mostrarse en el login por sí solo */}
          <Sidebar />
          
          {/* El contenido principal se desplaza en PC para dejar espacio al sidebar */}
          <main className="flex-1 w-full lg:ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}