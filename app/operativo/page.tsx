'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Car, Bike, CheckCircle2, PlayCircle, Trophy, ListChecks, LogOut, Phone, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { rangoHoyCol } from '@/utils/colombia'

export const dynamic = 'force-dynamic'

export default function OperativoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tareas' | 'resumen'>('tareas')
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchMisOrdenes = async (cedula: string, silent = false) => {
    if (!silent) setLoading(true)
    const { inicio, fin } = rangoHoyCol()

    const { data: perfil } = await supabase
      .from('perfiles').select('id').eq('cedula', cedula).single()

    if (perfil) {
      const { data } = await supabase
        .from('ordenes_servicio')
        .select('*, cliente:clientes!cliente_id(nombre, telefono)')
        .eq('empleado_id', perfil.id)
        .gte('creado_en', inicio)
        .lte('creado_en', fin)
        .order('creado_en', { ascending: false })
      setOrdenes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) { router.push('/login'); return }
    const u = JSON.parse(userData)
    setUser(u)
    fetchMisOrdenes(u.cedula)

    const channel = supabase
      .channel('cambios_operativos')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes_servicio' },
        (payload) => {
          // ← Usar u.cedula directamente del closure, no del state
          fetchMisOrdenes(u.cedula, true)
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status) // Para verificar que conecta
      })

    return () => { supabase.removeChannel(channel) }
  }, []) // ← Esto está bien, solo al montar

  const iniciarServicio = async (id: string) => {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: 'en_proceso' } : o))
    await supabase.from('ordenes_servicio').update({ estado: 'en_proceso' }).eq('id', id)
  }

  const terminarServicio = async (id: string) => {
    // El empleado SOLO marca que terminó el lavado.
    // El cobro lo registra el coordinador/vendedor desde Monitoreo.
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: 'terminado' } : o))
    const { error } = await supabase.from('ordenes_servicio').update({ estado: 'terminado' }).eq('id', id)
    if (error) fetchMisOrdenes(user.cedula, true)
  }

  // Pendientes = lo que el empleado aún tiene que hacer (no cobrado todavía)
  const pendientes = ordenes.filter(o => o.estado !== 'cobrado')
  const completadas = ordenes.filter(o => o.estado === 'cobrado')
  const totalDia = completadas.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">

      {/* HEADER */}
      <header className="bg-[#0E0C15] text-white shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gorilla-orange p-2 rounded-lg shrink-0">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 invert" />
            </div>
            <div>
              <h1 className="text-sm font-black italic leading-none">ECOPLANET</h1>
              <p className="text-[9px] text-gorilla-orange font-bold uppercase tracking-widest">KONG OPERATIVO</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black leading-none uppercase">{user?.nombre?.split(' ')[0]}</p>
              <p className="text-[8px] text-green-400 font-bold uppercase tracking-tighter">En Turno</p>
            </div>
            <button onClick={() => { sessionStorage.removeItem('gorilla_user'); router.push('/login') }}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex px-4 sm:px-6 pb-4 gap-2 max-w-xl mx-auto">
          <button onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${activeTab === 'tareas' ? 'bg-gorilla-orange text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
            <ListChecks size={16} /> TAREAS ({pendientes.length})
          </button>
          <button onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all ${activeTab === 'resumen' ? 'bg-gorilla-orange text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
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

            {/* ── TAREAS ── */}
            {activeTab === 'tareas' ? (
              <motion.div key="tareas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {pendientes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold uppercase text-sm tracking-widest italic">Sin tareas pendientes</p>
                  </div>
                ) : (
                  pendientes.map(o => (
                    <motion.div layout key={o.id} className="bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 shadow-lg">

                      {/* Encabezado */}
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                          {o.tipo_vehiculo === 'carro' ? <Car size={24} /> : <Bike size={24} />}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{o.placa}</p>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${o.estado === 'pendiente' ? 'bg-yellow-50 text-yellow-600' :
                            o.estado === 'en_proceso' ? 'bg-blue-50 text-blue-600' :
                              'bg-green-50 text-green-600'
                            }`}>
                            {o.estado === 'pendiente' ? '⏳ En espera' :
                              o.estado === 'en_proceso' ? '🔄 Lavando' :
                                '✅ Listo — esperando cobro'}
                          </span>
                        </div>
                      </div>

                      {/* Servicios */}
                      <div className="mb-3">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Servicios</p>
                        <p className="text-sm font-bold text-gray-700 leading-snug">{o.nombres_servicios}</p>
                      </div>

                      {/* Cliente */}
                      {o.cliente && (
                        <div className="flex items-center gap-2 mb-4 bg-slate-50 px-3 py-2 rounded-xl">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{o.cliente.nombre}</p>
                          {o.cliente.telefono && (
                            <><span className="text-slate-300 text-xs">·</span>
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <p className="text-[11px] font-bold text-slate-500">{o.cliente.telefono}</p></>
                          )}
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="font-black text-xl text-slate-900">${(parseFloat(o.total) || 0).toLocaleString('es-CO')}</span>
                      </div>

                      {/* Botones — solo si no está terminado aún */}
                      {o.estado === 'pendiente' && (
                        <button onClick={() => iniciarServicio(o.id)}
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
                          <PlayCircle size={20} className="text-gorilla-orange" /> INICIAR LAVADO
                        </button>
                      )}
                      {o.estado === 'en_proceso' && (
                        <button onClick={() => terminarServicio(o.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-100">
                          <CheckCircle2 size={20} /> LAVADO TERMINADO
                        </button>
                      )}
                      {o.estado === 'terminado' && (
                        <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 py-3 rounded-2xl font-black text-xs text-center uppercase tracking-widest">
                          ⏳ Esperando cobro del coordinador
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>

            ) : (

              /* ── RESUMEN ── */
              <motion.div key="resumen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-[#0E0C15] text-white rounded-[2.5rem] p-7 sm:p-8 shadow-2xl">
                  <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2 text-center">Producción de Hoy</p>
                  <p className="text-4xl sm:text-5xl font-black italic tracking-tighter text-center">${totalDia.toLocaleString('es-CO')}</p>
                  <p className="text-center text-slate-500 text-[10px] font-bold uppercase mt-3 tracking-widest">{completadas.length} lavados cobrados</p>
                </div>
                {completadas.length === 0 && (
                  <p className="text-center text-slate-400 font-bold uppercase text-xs py-8 italic">Aún no hay lavados cobrados hoy</p>
                )}
                {completadas.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2.5 rounded-xl text-green-600 shrink-0"><CheckCircle2 size={16} /></div>
                      <div>
                        <p className="text-sm font-black uppercase">{o.placa}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">{o.tipo_vehiculo} · {o.metodo_pago}</p>
                      </div>
                    </div>
                    <p className="font-black text-base text-gray-900">${(parseFloat(o.total) || 0).toLocaleString('es-CO')}</p>
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