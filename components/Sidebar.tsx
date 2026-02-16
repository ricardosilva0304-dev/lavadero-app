'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LayoutDashboard, Settings, Car, Clock, 
  Users, Package, LogOut, Menu, X, PlusCircle,
  UserCircle, ListChecks, Activity, History, BarChart3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Definición de ítems por rol
const adminItems = [
  { label: 'Resumen', href: '/admin/resumen', icon: LayoutDashboard, color: 'orange' },
  { label: 'Historial', href: '/admin/historial', icon: History, color: 'orange' }, // Nueva
  { label: 'Monitoreo Empleados', href: '/admin/monitoreo', icon: Activity, color: 'orange' }, // Nueva
  { label: 'Nuevo Servicio', href: '/operativo/nuevo-servicio', icon: PlusCircle, color: 'orange' },
  { label: 'Parqueadero', href: '/operativo/parqueadero', icon: Clock, color: 'orange' },
  { label: 'Inventario', href: '/admin/inventario', icon: Package, color: 'purple' },
  { label: 'Base Clientes', href: '/admin/clientes', icon: Users, color: 'purple' },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3, color: 'purple' },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings, color: 'purple' },
]

const empleadoItems = [
  { label: 'Panel de Tareas', href: '/operativo', icon: ListChecks, color: 'orange' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else if (pathname !== '/login' && pathname !== '/') {
      router.push('/login')
    }
  }, [pathname, router])

  if (pathname === '/login' || pathname === '/') return null
  if (!user) return null

  // Elegimos qué lista mostrar según el rol
  const menuItems = user.rol === 'administrador' ? adminItems : empleadoItems

  const handleLogout = () => {
    sessionStorage.removeItem('gorilla_user')
    router.push('/login')
  }

  return (
    <>
      {/* BOTÓN MÓVIL */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] p-4 bg-gorilla-orange rounded-full text-white shadow-2xl border border-white/20 active:scale-90 transition-transform"
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className={`
        fixed top-0 left-0 h-full z-[55]
        w-72 bg-[#0B0910]/95 backdrop-blur-2xl border-r border-white/5
        transition-all duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full relative">
          
          {/* LOGO */}
          <div className="px-8 pt-10 pb-12 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-4 rounded-full border border-white/10 p-2 bg-[#121216] shadow-[0_0_20px_rgba(244,127,32,0.1)]">
              <Image src="/logo.png" alt="Logo" width={100} height={100} className="object-contain" />
            </div>
            <div className="text-center">
                <h2 className="text-white font-black italic text-xl tracking-tighter uppercase leading-none">
                  ECOPLANET<span className="text-gorilla-orange">KONG</span>
                </h2>
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1 block">
                    {user.rol === 'administrador' ? 'Central de Mando' : 'Terminal Operativa'}
                </span>
            </div>
          </div>

          {/* MENÚ FILTRADO */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">
                Navegación
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isOrange = item.color === 'orange'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    group relative flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all duration-300
                    ${isActive 
                      ? (isOrange ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-900/40' : 'bg-gorilla-purple text-white shadow-lg shadow-purple-900/40')
                      : 'text-gray-500 hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                  {isActive && <motion.div layoutId="activeTab" className="absolute right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />}
                </Link>
              )
            })}
          </nav>

          {/* FOOTER: PERFIL */}
          <div className="p-6 mt-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gorilla-purple/20 flex items-center justify-center text-gorilla-purple">
                  <UserCircle size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-white text-[11px] font-black truncate uppercase italic mb-1">
                    {user.nombre}
                  </p>
                  <p className="text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                    {user.rol}
                  </p>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                  <LogOut size={16} />
                </button>
            </div>
          </div>

        </div>
      </aside>
    </>
  )
}