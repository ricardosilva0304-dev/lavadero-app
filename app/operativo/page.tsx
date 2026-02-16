'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
// Importamos Image correctamente de next/image
import Image from 'next/image'
// Aseguramos que LogOut esté en la lista de iconos
import { 
  Car, Bike, CheckCircle2, Clock, 
  PlayCircle, Trophy, ListChecks, LogOut 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function OperativoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tareas' | 'resumen'>('tareas')
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 1. FUNCIÓN PARA CERRAR SESIÓN (Arregla el error handleLogout)
  const handleLogout = () => {
    sessionStorage.removeItem('gorilla_user')
    router.push('/login')
  }

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchMisOrdenes(parsedUser.cedula)
    } else {
        router.push('/login')
    }

    const channel = supabase.channel('cambios_operativos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => {
        const u = sessionStorage.getItem('gorilla_user')
        if (u) fetchMisOrdenes(JSON.parse(u).cedula)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  const fetchMisOrdenes = async (cedula: string) => {
    setLoading(true)
    const hoy = new Date()
    hoy.setHours(0,0,0,0)

    const { data: perfil } = await supabase.from('perfiles').select('id').eq('cedula', cedula).single()
    
    if (perfil) {
      const { data } = await supabase
        .from('ordenes_servicio')
        .select('*')
        .eq('empleado_id', perfil.id)
        .gte('creado_en', hoy.toISOString())
        .order('creado_en', { ascending: false })
      
      setOrdenes(data || [])
    }
    setLoading(false)
  }

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    await supabase.from('ordenes_servicio').update({ estado: nuevoEstado }).eq('id', id)
  }

  const completadasHoy = ordenes.filter(o => o.estado === 'terminado')
  const totalDinero = completadasHoy.reduce((acc, curr) => acc + Number(curr.total), 0)
  const pendientes = ordenes.filter(o => o.estado !== 'terminado')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* HEADER OSCURO PARA EL EMPLEADO */}
      <header className="bg-[#0E0C15] text-white p-5 shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gorilla-orange p-2 rounded-lg">
                {/* Usamos una etiqueta img normal si Image sigue dando guerra en tu config de TS */}
                <img src="/logo.png" alt="Logo" className="w-8 h-8 invert" />
            </div>
            <div>
                <h1 className="text-sm font-black italic leading-none">ECOPLANET</h1>
                <p className="text-[9px] text-gorilla-orange font-bold uppercase tracking-widest">KONG OPERATIVO</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-[10px] font-black leading-none uppercase">{user?.nombre?.split(' ')[0]}</p>
                <p className="text-[8px] text-green-500 font-bold uppercase tracking-tighter">En Turno</p>
            </div>
            <button 
                onClick={handleLogout}
                className="p-2 bg-white/5 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-500 transition-all"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex mt-6 bg-white/5 p-1 rounded-2xl max-w-xl mx-auto border border-white/5">
          <button 
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'tareas' ? 'bg-gorilla-orange text-white' : 'text-gray-500'}`}
          >
            <ListChecks size={16} /> TAREAS ({pendientes.length})
          </button>
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'resumen' ? 'bg-gorilla-orange text-white' : 'text-gray-500'}`}
          >
            <Trophy size={16} /> MI RESUMEN
          </button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'tareas' ? (
            <motion.div key="tareas" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="space-y-4">
              {pendientes.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <CheckCircle2 size={48} className="mx-auto mb-2" />
                  <p className="font-bold uppercase text-xs">Sin tareas pendientes</p>
                </div>
              ) : (
                pendientes.map((o) => (
                  <div key={o.id} className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {o.tipo_vehiculo === 'carro' ? <Car size={24}/> : <Bike size={24}/>}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black tracking-tighter">{o.placa}</p>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${o.estado === 'pendiente' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          {o.estado === 'pendiente' ? 'En Espera' : 'Lavando'}
                        </span>
                      </div>
                    </div>
                    <div className="mb-6">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Servicios:</p>
                      <p className="text-sm font-bold text-gray-700 leading-tight">{o.nombres_servicios}</p>
                    </div>
                    {o.estado === 'pendiente' ? (
                      <button onClick={() => actualizarEstado(o.id, 'en_proceso')} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3">
                        <PlayCircle size={20} className="text-gorilla-orange" /> INICIAR
                      </button>
                    ) : (
                      <button onClick={() => actualizarEstado(o.id, 'terminado')} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3">
                        <CheckCircle2 size={20} /> TERMINAR
                      </button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="resumen" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
              <div className="bg-[#0E0C15] text-white rounded-[2.5rem] p-8 mb-6 shadow-2xl relative overflow-hidden">
                <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2 text-center">Producción de Hoy</p>
                <p className="text-5xl font-black italic tracking-tighter text-center">${totalDinero.toLocaleString()}</p>
              </div>
              <div className="space-y-3">
                {completadasHoy.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-lg text-green-600"><CheckCircle2 size={16} /></div>
                      <div>
                        <p className="text-sm font-black">{o.placa}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{o.tipo_vehiculo}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm text-gray-900">${Number(o.total).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}