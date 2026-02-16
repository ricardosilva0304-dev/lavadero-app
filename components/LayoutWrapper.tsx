'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Detectar si estamos en el login
  const isLoginPage = pathname === '/login' || pathname === '/'

  // Si es Login, devolvemos SOLO el contenido (pantalla completa, sin sidebar ni margenes)
  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>
  }

  // Si es el sistema interno, devolvemos el Sidebar y el margen
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Aquí aplicamos el margen para el sidebar */}
      <main className="flex-1 w-full lg:ml-72 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}