'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [rol, setRol] = useState<string | null>(null)
  
  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (userData) {
      setRol(JSON.parse(userData).rol)
    }
  }, [pathname])

  const isLoginPage = pathname === '/login' || pathname === '/'
  const isEmpleado = rol === 'empleado'

  if (isLoginPage || isEmpleado) {
    // Añadimos h-full para que el scroll funcione bien
    return <main className="w-full min-h-screen overflow-y-auto">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* Añadimos h-screen y overflow-y-auto para que la parte derecha sea independiente */}
      <main className="flex-1 w-full lg:ml-72 h-screen overflow-y-auto transition-all duration-300">
        {children}
      </main>
    </div>
  )
}