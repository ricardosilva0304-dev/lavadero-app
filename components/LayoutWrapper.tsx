'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const isLoginPage = pathname === '/login' || pathname === '/'
    const userData = sessionStorage.getItem('gorilla_user')

    if (!userData && !isLoginPage) {
      router.push('/login')
      return
    }

    if (userData) {
      setRol(JSON.parse(userData).rol)
    }
    setChecked(true)
  }, [pathname, router])

  const isLoginPage = pathname === '/login' || pathname === '/'
  const isEmpleado = rol === 'empleado'

  // No renderizar nada hasta verificar sesión (evita flash de contenido)
  if (!checked && !isLoginPage) return null

  if (isLoginPage || isEmpleado) {
    return <main className="w-full min-h-screen overflow-y-auto">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 w-full lg:ml-72 h-screen overflow-y-auto transition-all duration-300">
        {children}
      </main>
    </div>
  )
}