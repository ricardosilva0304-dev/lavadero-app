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
  }, [pathname]) // Se actualiza cada vez que cambia la ruta

  const isLoginPage = pathname === '/login' || pathname === '/'
  
  // CONDICIÓN CLAVE: Si es empleado, NO mostramos sidebar ni margen
  const isEmpleado = rol === 'empleado'

  if (isLoginPage || isEmpleado) {
    return <main className="w-full min-h-screen">{children}</main>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full lg:ml-72 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}