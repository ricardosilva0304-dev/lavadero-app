'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Car, Bike, CheckCircle2,
  PlayCircle, Trophy, ListChecks, LogOut
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

// Fecha local YYYY-MM-DD sin desfase UTC
const getFechaLocal = () => {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = String(hoy.getMonth() + 1).padStart(2, '0')
  const d = String(hoy.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

    // CORRECCIÓN: usar hora local, no UTC (evita que después de las 7PM no aparezcan órdenes)
    const hoy = getFechaLocal()

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('cedula', cedula)
      .single()

    if (perfil) {
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
    if (!userData) { router.push('/login'); return }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchMisOrdenes(parsedUser.cedula)

    const channel = supabase
      .channel('cambios_operativos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => {
        fetchMisOrdenes(parsedUser.cedula, true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o))
    const { error } = await supabase.from('ordenes_servicio').update({ estado: nuevoEstado }).eq('id', id)
    if (error) fetchMisOrdenes(user.cedula, true)
  }

  const completadasHoy = ordenes.filter(o => o.estado === 'terminado')
  // CORRECCIÓN: parseFloat para evitar NaN en sumas
  const totalDinero = completadasHoy.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
  const pendientes = ordenes.filter(o => o.estado !== 'terminado')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">

      {/* HEADER */}
      <header className="bg-[#0E0C15] text-white shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="bg-gorilla-orange p-2 rounded-lg shrink-0">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 invert" />
            </div>
            <div>
              <h1 className="text-sm font-black italic leading-none text-white">ECOPLANET</h1>
              <p className="text-[9px] text-gorilla-orange font-bold uppercase tracking-widest">KONG OPERATIVO</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black leading-none uppercase">{user?.nombre?.split(' ')[0]}</p>
              <p className="text-[8px] text-green-500 font-bold uppercase tracking-tighter">En Turno</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex px-4 sm:px-6 pb-4 gap-2 max-w-xl mx-auto">
          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${activeTab === 'tareas' ? 'bg-gorilla-orange text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            <ListChecks size={16} /> TAREAS ({pendientes.length})
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${activeTab === 'resumen' ? 'bg-gorilla-orange text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            <Trophy size={16} /> MI RESUMEN
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="p-4 sm:p-6 max-w-xl mx-auto mt-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'tareas' ? (
              <motion.div key="tareas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {pendientes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold uppercase text-sm tracking-widest italic">Sin tareas pendientes ✓</p>
                  </div>
                ) : (
                  pendientes.map(o => (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-[2rem] p-5 sm:p-6 shadow-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {o.tipo_vehiculo === 'carro' ? <Car size={24} /> : <Bike size={24} />}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{o.placa}</p>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${o.estado === 'pendiente' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                            {o.estado === 'pendiente' ? 'En Espera' : 'Lavando'}
                          </span>
                        </div>
                      </div>
                      <div className="mb-5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Servicios:</p>
                        <p className="text-sm font-bold text-gray-700 leading-tight">{o.nombres_servicios}</p>
                      </div>
                      <div className="flex items-center justify-between mb-5 bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="font-black text-lg text-slate-900">${(parseFloat(o.total) || 0).toLocaleString('es-CO')}</span>
                      </div>
                      {o.estado === 'pendiente' ? (
                        <button
                          onClick={() => actualizarEstado(o.id, 'en_proceso')}
                          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                          <PlayCircle size={20} className="text-gorilla-orange" /> INICIAR
                        </button>
                      ) : (
                        <button
                          onClick={() => actualizarEstado(o.id, 'terminado')}
                          className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-200"
                        >
                          <CheckCircle2 size={20} /> TERMINAR
                        </button>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div key="resumen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-[#0E0C15] text-white rounded-[2.5rem] p-7 sm:p-8 shadow-2xl">
                  <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2 text-center">Producción de Hoy</p>
                  <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-center">
                    ${totalDinero.toLocaleString('es-CO')}
                  </p>
                  <p className="text-center text-slate-500 text-[10px] font-bold uppercase mt-3 tracking-widest">
                    {completadasHoy.length} lavados completados
                  </p>
                </div>
                {completadasHoy.length === 0 && (
                  <p className="text-center text-slate-400 font-bold uppercase text-xs py-8 italic">Aún no hay lavados completados</p>
                )}
                {completadasHoy.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-lg text-green-600 shrink-0"><CheckCircle2 size={16} /></div>
                      <div>
                        <p className="text-sm font-black uppercase">{o.placa}</p>
                        <p className="text-[9px] text-gray-400 uppercase">{o.tipo_vehiculo}</p>
                      </div>
                    </div>
                    <p className="font-black text-sm text-gray-900">${(parseFloat(o.total) || 0).toLocaleString('es-CO')}</p>
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