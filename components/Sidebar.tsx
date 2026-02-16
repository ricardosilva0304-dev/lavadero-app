'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LayoutDashboard, Settings, Car, Clock, 
  Users, Package, LogOut, Menu, X, PlusCircle,
  UserCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const menuItems = [
  { label: 'Resumen', href: '/admin/resumen', icon: LayoutDashboard, color: 'orange' },
  { label: 'Nuevo Servicio', href: '/operativo/nuevo-servicio', icon: PlusCircle, color: 'orange' },
  { label: 'Parqueadero', href: '/operativo/parqueadero', icon: Clock, color: 'orange' },
  { label: 'Inventario', href: '/admin/inventario', icon: Package, color: 'purple' },
  { label: 'Base Clientes', href: '/admin/clientes', icon: Users, color: 'purple' },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings, color: 'purple' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  // 1. Si estamos en login, no mostrar sidebar
  if (pathname === '/login' || pathname === '/') return null

  // 2. PROTECCIÓN DE RUTA (Seguridad)
  useEffect(() => {
    // Intentamos leer el usuario de la sesión temporal
    const userData = sessionStorage.getItem('gorilla_user')
    
    if (!userData) {
      // Si no hay datos (porque recargó la página o entró directo), lo expulsamos
      router.push('/login')
    } else {
      setUser(JSON.parse(userData))
    }

    // OPCIONAL: Si quieres ser EXTREMAMENTE estricto y que al dar F5 se borre todo:
    // Descomenta las siguientes 3 líneas:
    /*
    const handleUnload = () => sessionStorage.clear()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
    */

  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('gorilla_user')
    router.push('/login')
  }

  // Si no hay usuario cargado aún, no mostramos nada para evitar parpadeos
  if (!user) return null

  return (
    <>
      {/* BOTÓN MÓVIL */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] p-4 bg-gorilla-orange rounded-full text-white shadow-[0_10px_30px_rgba(244,127,32,0.4)] border border-white/20 active:scale-90 transition-transform"
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
          
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gorilla-orange/10 to-transparent pointer-events-none" />

          {/* LOGO */}
          <div className="px-8 pt-10 pb-12 flex flex-col items-center">
            <motion.div 
              animate={{ boxShadow: ["0 0 20px rgba(244,127,32,0.1)", "0 0 40px rgba(244,127,32,0.3)", "0 0 20px rgba(244,127,32,0.1)"] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="relative w-28 h-28 mb-4 rounded-full border border-white/10 p-2 bg-[#121216]"
            >
              <Image src="/LogoFondo.png" alt="Gorilla Logo" width={100} height={100} className="object-contain" />
            </motion.div>
            <div className="text-center">
                <h2 className="text-white font-black italic text-2xl tracking-tighter leading-none">
                  ECOPLANET<span className="text-gorilla-orange">KONG</span>
                </h2>
                <div className="flex items-center gap-1 justify-center mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.3em]">Sistema Operativo</span>
                </div>
            </div>
          </div>

          {/* MENÚ */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">Menú Principal</p>
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
                    group relative flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-300
                    ${isActive 
                      ? (isOrange ? 'bg-gorilla-orange text-white shadow-xl shadow-orange-900/40' : 'bg-gorilla-purple text-white shadow-xl shadow-purple-900/40')
                      : 'text-gray-500 hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <Icon size={20} className={isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
                  {item.label}
                  {isActive && <motion.div layoutId="activeTab" className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />}
                </Link>
              )
            })}
          </nav>

          {/* FOOTER */}
          <div className="p-6 mt-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 relative overflow-hidden group">
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gorilla-purple/20 flex items-center justify-center text-gorilla-purple">
                  <UserCircle size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-white text-xs font-black truncate uppercase tracking-tighter italic">
                    {user?.nombre || 'Operador'}
                  </p>
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                    {user?.rol || 'Staff'}
                  </p>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  )
}