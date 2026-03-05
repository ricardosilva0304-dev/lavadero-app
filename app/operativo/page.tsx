'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
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

  const handleLogout = () => {
    sessionStorage.removeItem('gorilla_user')
    router.push('/login')
  }

  const fetchMisOrdenes = async (cedula: string, silent = false) => {
    if (!silent) setLoading(true)

    // Obtenemos la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];

    // 1. Obtener el ID del perfil del empleado
    const { data: perfil } = await supabase.from('perfiles').select('id').eq('cedula', cedula).single()

    if (perfil) {
      // 2. Consultar órdenes filtrando por el día completo (desde 00:00:00 a 23:59:59)
      const { data, error } = await supabase
        .from('ordenes_servicio')
        .select('*')
        .eq('empleado_id', perfil.id)
        .gte('creado_en', `${hoy}T00:00:00`)
        .lte('creado_en', `${hoy}T23:59:59`)
        .order('creado_en', { ascending: false })

      if (!error) setOrdenes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchMisOrdenes(parsedUser.cedula)

    // SUSCRIPCIÓN EN TIEMPO REAL OPTIMIZADA
    const channel = supabase.channel('cambios_operativos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes_servicio' },
        (payload) => {
          console.log('Cambio detectado en tiempo real:', payload)
          // Llamamos a la carga en modo silencioso para que el usuario no vea el spinner
          fetchMisOrdenes(parsedUser.cedula, true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Solo se ejecuta al montar el componente

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    // Actualización optimista: cambiar el estado localmente antes de la DB para que sea instantáneo
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o))

    const { error } = await supabase
      .from('ordenes_servicio')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      console.error("Error al actualizar:", error)
      // Si falla, recargar datos originales
      fetchMisOrdenes(user.cedula, true)
    }
  }

  const completadasHoy = ordenes.filter(o => o.estado === 'terminado')
  const totalDinero = completadasHoy.reduce((acc, curr) => acc + Number(curr.total), 0)
  const pendientes = ordenes.filter(o => o.estado !== 'terminado')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <header className="bg-[#0E0C15] text-white p-5 shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gorilla-orange p-2 rounded-lg">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 invert" />
            </div>
            <div>
              <h1 className="text-sm font-black italic leading-none text-white">ECOPLANET</h1>
              <p className="text-[9px] text-gorilla-orange font-bold uppercase tracking-widest">KONG OPERATIVO</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black leading-none uppercase">{user?.nombre?.split(' ')[0]}</p>
              <p className="text-[8px] text-green-500 font-bold uppercase tracking-tighter">En Turno</p>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full text-gray-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex mt-6 bg-white/5 p-1 rounded-2xl max-w-xl mx-auto border border-white/5">
          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'tareas' ? 'bg-gorilla-orange text-white shadow-lg' : 'text-gray-500'}`}
          >
            <ListChecks size={16} /> TAREAS ({pendientes.length})
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'resumen' ? 'bg-gorilla-orange text-white shadow-lg' : 'text-gray-500'}`}
          >
            <Trophy size={16} /> MI RESUMEN
          </button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto mt-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'tareas' ? (
              <motion.div key="tareas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {pendientes.length === 0 ? (
                  <div className="text-center py-20 opacity-20 italic">Sin tareas pendientes</div>
                ) : (
                  pendientes.map((o) => (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {o.tipo_vehiculo === 'carro' ? <Car size={24} /> : <Bike size={24} />}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black tracking-tighter uppercase">{o.placa}</p>
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
              <motion.div key="resumen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-[#0E0C15] text-white rounded-[2.5rem] p-8 shadow-2xl">
                  <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2 text-center">Producción de Hoy</p>
                  <p className="text-5xl font-black italic tracking-tighter text-center">${totalDinero.toLocaleString()}</p>
                </div>
                {completadasHoy.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-lg text-green-600"><CheckCircle2 size={16} /></div>
                      <div><p className="text-sm font-black uppercase">{o.placa}</p><p className="text-[9px] text-gray-400 uppercase">{o.tipo_vehiculo}</p></div>
                    </div>
                    <p className="font-bold text-sm text-gray-900">${Number(o.total).toLocaleString()}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}