'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Car, Bike, CheckCircle2, Clock, 
  PlayCircle, Trophy, DollarSign, ListChecks 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function OperativoPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'tareas' | 'resumen'>('tareas')
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar datos del usuario desde la sesión
    const userData = sessionStorage.getItem('gorilla_user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      fetchMisOrdenes(parsedUser.cedula) // Usamos la cédula para filtrar
    }

    // Suscripción en tiempo real
    const channel = supabase.channel('cambios_operativos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => {
        const u = sessionStorage.getItem('gorilla_user')
        if (u) fetchMisOrdenes(JSON.parse(u).cedula)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchMisOrdenes = async (cedula: string) => {
    setLoading(true)
    const hoy = new Date()
    hoy.setHours(0,0,0,0)

    // Buscamos las órdenes asignadas a este empleado hoy
    // Nota: Primero debemos obtener el ID del perfil basado en la cédula
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
    const { error } = await supabase
      .from('ordenes_servicio')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    
    if (!error) {
      // La actualización se reflejará por el Realtime
    }
  }

  // Cálculos para el resumen
  const completadasHoy = ordenes.filter(o => o.estado === 'terminado')
  const totalDinero = completadasHoy.reduce((acc, curr) => acc + Number(curr.total), 0)
  const pendientes = ordenes.filter(o => o.estado !== 'terminado')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* HEADER SIMPLE PARA MÓVIL */}
      <header className="bg-white p-6 border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-xl mx-auto">
          <div>
            <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-widest">Panel Operativo</p>
            <h1 className="text-xl font-bold uppercase italic">Hola, {user?.nombre?.split(' ')[0]}</h1>
          </div>
          <div className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-orange-600 uppercase">En Línea</span>
          </div>
        </div>

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex mt-6 bg-gray-100 p-1 rounded-2xl max-w-xl mx-auto">
          <button 
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'tareas' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
          >
            <ListChecks size={16} /> TAREAS ({pendientes.length})
          </button>
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'resumen' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
          >
            <Trophy size={16} /> MI RESUMEN
          </button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'tareas' ? (
            <motion.div key="tareas" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-4">
              {pendientes.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <CheckCircle2 size={48} className="mx-auto mb-2" />
                  <p className="font-bold uppercase text-xs">No tienes tareas pendientes</p>
                </div>
              ) : (
                pendientes.map((o) => (
                  <div key={o.id} className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-lg shadow-gray-200/50">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {o.tipo_vehiculo === 'carro' ? <Car size={24}/> : <Bike size={24}/>}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black tracking-tighter">{o.placa}</p>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${o.estado === 'pendiente' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          {o.estado === 'pendiente' ? 'En Espera' : 'Lavando ahora'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Servicios solicitados:</p>
                      <p className="text-sm font-bold text-gray-700 leading-tight">{o.nombres_servicios}</p>
                    </div>

                    {/* BOTONES DE ACCIÓN GIGANTES */}
                    {o.estado === 'pendiente' ? (
                      <button 
                        onClick={() => actualizarEstado(o.id, 'en_proceso')}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-gray-300"
                      >
                        <PlayCircle size={20} className="text-gorilla-orange" /> COMENZAR
                      </button>
                    ) : (
                      <button 
                        onClick={() => actualizarEstado(o.id, 'terminado')}
                        className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-green-200"
                      >
                        <CheckCircle2 size={20} /> MARCAR COMO LISTO
                      </button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="resumen" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
              {/* TARJETA DE RECAUDO PERSONAL */}
              <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 mb-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Trophy size={80} />
                </div>
                <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2">Producción de hoy</p>
                <p className="text-5xl font-black italic tracking-tighter mb-6">${totalDinero.toLocaleString()}</p>
                <div className="flex gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                    <p className="text-[8px] uppercase font-bold text-gray-400">Servicios</p>
                    <p className="text-xl font-black">{completadasHoy.length}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Historial de hoy</h3>
              <div className="space-y-3">
                {completadasHoy.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-lg text-green-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black">{o.placa}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{o.nombres_servicios.substring(0, 20)}...</p>
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