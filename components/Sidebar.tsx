'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Settings, Clock, Users, Package, LogOut, Menu, X, PlusCircle,
  ListChecks, Activity, History, BarChart3, LayoutDashboard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Rol, MENU_POR_ROL, ETIQUETA_ROL, COLOR_ROL } from '@/utils/roles'

const ICONOS: Record<string, React.ElementType> = {
  Settings, Clock, Users, Package, PlusCircle,
  ListChecks, Activity, History, BarChart3, LayoutDashboard,
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (userData) setUser(JSON.parse(userData))
    else if (pathname !== '/login' && pathname !== '/') router.push('/login')
  }, [pathname, router])

  if (pathname === '/login' || pathname === '/') return null
  if (!user) return null

  const rol: Rol = user.rol ?? 'empleado'
  const menuItems = MENU_POR_ROL[rol] ?? MENU_POR_ROL['empleado']

  return (
    <>
      <header className="lg:hidden fixed top-0 w-full h-16 bg-[#0B0910] z-[50] flex items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <h2 className="text-white font-black text-sm tracking-tighter uppercase italic">
            ECOPLANET<span className="text-gorilla-orange">KONG</span>
          </h2>
        </div>
        <button onClick={() => setIsOpen(true)} className="text-white p-2">
          <Menu size={24} />
        </button>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed top-0 left-0 h-full z-[55] w-72 bg-[#0B0910] border-r border-white/5
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <button onClick={() => setIsOpen(false)} className="lg:hidden absolute top-5 right-5 text-gray-400">
            <X size={24} />
          </button>

          <div className="px-8 pt-10 pb-6 flex flex-col items-center">
            <div className="w-20 h-20 mb-4 rounded-full border border-white/10 p-1 bg-[#121216]">
              <Image src="/logo.png" alt="Logo" width={80} height={80} />
            </div>
            <h2 className="text-white font-black italic text-lg uppercase leading-none">
              ECOPLANET<span className="text-gorilla-orange">KONG</span>
            </h2>
            <div className="mt-3 flex flex-col items-center gap-1">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest truncate max-w-[160px]">
                {user.nombre}
              </span>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${COLOR_ROL[rol as Rol]}`}>
                {ETIQUETA_ROL[rol as Rol]}
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = ICONOS[item.icon] ?? Package
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${isActive
                      ? item.color === 'orange' ? 'bg-gorilla-orange text-white' : 'bg-gorilla-purple text-white'
                      : 'text-gray-500 hover:text-white'
                    }`}
                >
                  <Icon size={18} /> {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-6">
            <button
              onClick={() => { sessionStorage.removeItem('gorilla_user'); router.push('/login') }}
              className="w-full flex items-center gap-3 text-gray-500 hover:text-red-500 font-bold text-xs uppercase p-4"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden h-16" />
    </>
  )
}