'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Car, Bike, CheckCircle2, PlayCircle, Trophy,
  ListChecks, LogOut, Phone, User, Zap,
  CreditCard, Wallet, TrendingUp, Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { rangoHoyCol, isoAHoraCol } from '@/utils/colombia'

export const dynamic = 'force-dynamic'

export default function OperativoPage() {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tareas' | 'resumen'>('tareas')
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Ref para usar el perfilId dentro del canal realtime sin recrearlo
  const perfilIdRef = useRef<string | null>(null)

  // Fetch usando el perfilId directamente — sin re-buscar la cédula cada vez
  const fetchOrdenes = useCallback(async (pId: string, silent = false) => {
    if (!silent) setLoading(true)
    const { inicio, fin } = rangoHoyCol()
    const { data } = await supabase
      .from('ordenes_servicio')
      .select('*, cliente:clientes!cliente_id(nombre, telefono)')
      .eq('empleado_id', pId)
      .gte('creado_en', inicio)
      .lte('creado_en', fin)
      .order('creado_en', { ascending: false })
    setOrdenes(data || [])
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) { router.push('/login'); return }
    const u = JSON.parse(userData)
    setUser(u)

    let channelRef: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      // Buscamos el perfil UNA sola vez
      const { data: perfil } = await supabase
        .from('perfiles').select('id').eq('cedula', u.cedula).single()
      if (!perfil) { router.push('/login'); return }

      setPerfilId(perfil.id)
      perfilIdRef.current = perfil.id
      await fetchOrdenes(perfil.id)

      // Canal estable que nunca se recrea
      channelRef = supabase
        .channel('operativo_lavador')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'ordenes_servicio' },
          () => {
            if (perfilIdRef.current) fetchOrdenes(perfilIdRef.current, true)
          }
        )
        .subscribe()
    }

    init()
    return () => { if (channelRef) supabase.removeChannel(channelRef) }
  }, [])

  const iniciarServicio = async (id: string) => {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: 'en_proceso' } : o))
    await supabase.from('ordenes_servicio').update({ estado: 'en_proceso' }).eq('id', id)
  }

  const terminarServicio = async (id: string) => {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: 'terminado' } : o))
    const { error } = await supabase.from('ordenes_servicio').update({ estado: 'terminado' }).eq('id', id)
    if (error && perfilId) fetchOrdenes(perfilId, true)
  }

  // Derivados
  const pendientes = ordenes.filter(o => o.estado !== 'cobrado')
  const cobradas = ordenes.filter(o => o.estado === 'cobrado')
  const totalDia = cobradas.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)
  const totalEfectivo = cobradas.filter(o => o.metodo_pago === 'efectivo').reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)
  const totalTransferencia = cobradas.filter(o => o.metodo_pago === 'transferencia').reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)
  const carros = cobradas.filter(o => o.tipo_vehiculo === 'carro').length
  const motos = cobradas.filter(o => o.tipo_vehiculo !== 'carro').length

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-24">

      {/* ── HEADER ── */}
      <header className="bg-[#0B0910] text-white sticky top-0 z-50 shadow-2xl">
        <div className="flex justify-between items-center max-w-lg mx-auto px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="bg-gorilla-orange p-2 rounded-xl shrink-0">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 invert" />
            </div>
            <div>
              <p className="text-[9px] text-gorilla-orange font-black uppercase tracking-[0.2em] leading-none">Ecoplanet Kong</p>
              <p className="text-sm font-black uppercase leading-tight">{user?.nombre?.split(' ')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalDia > 0 && (
              <div className="bg-white/10 rounded-xl px-3 py-1.5 text-right">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Hoy</p>
                <p className="text-sm font-black text-gorilla-orange leading-tight">${totalDia.toLocaleString('es-CO')}</p>
              </div>
            )}
            <button
              onClick={() => { sessionStorage.removeItem('gorilla_user'); router.push('/login') }}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex px-4 pb-3 gap-2 max-w-lg mx-auto">
          <button onClick={() => setActiveTab('tareas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'tareas'
              ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-900/30'
              : 'bg-white/5 text-gray-500'}`}>
            <ListChecks size={15} />
            Tareas
            {pendientes.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${activeTab === 'tareas' ? 'bg-white/25 text-white' : 'bg-gorilla-orange text-white'}`}>
                {pendientes.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('resumen')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'resumen'
              ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-900/30'
              : 'bg-white/5 text-gray-500'}`}>
            <Trophy size={15} />
            Mi Día
            {cobradas.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${activeTab === 'resumen' ? 'bg-white/25 text-white' : 'bg-gorilla-orange/20 text-gorilla-orange'}`}>
                {cobradas.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="p-4 max-w-lg mx-auto mt-3">
        {loading ? (
          <div className="text-center py-24">
            <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ──────────── TAREAS ──────────── */}
            {activeTab === 'tareas' ? (
              <motion.div key="tareas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {pendientes.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <CheckCircle2 className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Sin tareas pendientes</p>
                    <p className="text-slate-300 text-xs font-bold mt-1">¡Todo al día!</p>
                  </div>
                ) : (
                  pendientes.map(o => (
                    <motion.div layout key={o.id}
                      className="bg-white rounded-[1.75rem] shadow-md border border-gray-100 overflow-hidden">

                      {/* Barra de color según estado */}
                      <div className={`h-1.5 w-full ${o.estado === 'pendiente' ? 'bg-yellow-400' :
                          o.estado === 'en_proceso' ? 'bg-blue-500' :
                            'bg-amber-400'
                        }`} />

                      <div className="p-5">
                        {/* Placa + tipo + hora + estado */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl shrink-0 ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-gorilla-orange'}`}>
                              {o.tipo_vehiculo === 'carro' ? <Car size={22} /> : <Bike size={22} />}
                            </div>
                            <div>
                              <p className="text-2xl font-black tracking-tighter uppercase leading-none">{o.placa}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                {o.tipo_vehiculo} · {isoAHoraCol(o.creado_en)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-widest shrink-0 ${o.estado === 'pendiente' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                              o.estado === 'en_proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                            {o.estado === 'pendiente' ? '⏳ En espera' :
                              o.estado === 'en_proceso' ? '🔄 Lavando' :
                                '✅ Listo'}
                          </span>
                        </div>

                        {/* Servicios */}
                        <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Servicios</p>
                          <p className="text-sm font-bold text-slate-700 leading-snug">{o.nombres_servicios}</p>
                        </div>

                        {/* Cliente */}
                        {o.cliente && (
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <User size={12} className="text-slate-400 shrink-0" />
                            <p className="text-[11px] font-bold text-slate-600 uppercase truncate">{o.cliente.nombre}</p>
                            {o.cliente.telefono && (
                              <>
                                <span className="text-slate-300">·</span>
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <p className="text-[11px] font-bold text-slate-500">{o.cliente.telefono}</p>
                              </>
                            )}
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex items-center justify-between mb-4 bg-slate-900 text-white px-4 py-3 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                          <span className="font-black text-xl text-gorilla-orange">${(parseFloat(o.total) || 0).toLocaleString('es-CO')}</span>
                        </div>

                        {/* Botones de acción */}
                        {o.estado === 'pendiente' && (
                          <button onClick={() => iniciarServicio(o.id)}
                            className="w-full bg-slate-900 active:bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest">
                            <PlayCircle size={20} className="text-gorilla-orange" /> Iniciar Lavado
                          </button>
                        )}
                        {o.estado === 'en_proceso' && (
                          <button onClick={() => terminarServicio(o.id)}
                            className="w-full bg-green-600 active:bg-green-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-200 text-sm uppercase tracking-widest">
                            <CheckCircle2 size={20} /> Lavado Terminado
                          </button>
                        )}
                        {o.estado === 'terminado' && (
                          <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 py-3.5 rounded-2xl font-black text-xs text-center uppercase tracking-widest flex items-center justify-center gap-2">
                            <Clock size={14} /> Esperando cobro del coordinador
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>

            ) : (

              /* ──────────── MI DÍA ──────────── */
              <motion.div key="resumen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

                {/* Tarjeta hero — producción total */}
                <div className="bg-[#0B0910] text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gorilla-orange/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gorilla-purple/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={13} className="text-gorilla-orange" />
                      <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.25em]">Producción de hoy</p>
                    </div>
                    <p className="text-5xl font-black italic tracking-tighter leading-none mb-1">
                      ${totalDia.toLocaleString('es-CO')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      {cobradas.length} lavado{cobradas.length !== 1 ? 's' : ''} cobrado{cobradas.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {cobradas.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Aún sin cobros hoy</p>
                    <p className="text-slate-300 text-xs font-bold mt-1 px-8 text-center leading-relaxed">Los números aparecen aquí cuando el coordinador cobra</p>
                  </div>
                ) : (
                  <>
                    {/* Stats en grid 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-green-50 rounded-xl">
                            <Wallet size={14} className="text-green-600" />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efectivo</p>
                        </div>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">${totalEfectivo.toLocaleString('es-CO')}</p>
                      </div>

                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <CreditCard size={14} className="text-blue-600" />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transferencia</p>
                        </div>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">${totalTransferencia.toLocaleString('es-CO')}</p>
                      </div>

                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <Car size={14} className="text-blue-500" />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carros</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{carros}</p>
                      </div>

                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-orange-50 rounded-xl">
                            <Bike size={14} className="text-gorilla-orange" />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motos</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{motos}</p>
                      </div>
                    </div>

                    {/* Lista detallada de lavados cobrados */}
                    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                        <Zap size={13} className="text-gorilla-orange" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Detalle de lavados
                        </p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {cobradas.map((o, i) => (
                          <motion.div
                            key={o.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center justify-between px-5 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-xl shrink-0 ${o.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-gorilla-orange'}`}>
                                {o.tipo_vehiculo === 'carro' ? <Car size={14} /> : <Bike size={14} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black uppercase tracking-tight leading-none">{o.placa}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{isoAHoraCol(o.creado_en)}</p>
                                  <span className="text-slate-200 text-xs">·</span>
                                  <span className={`text-[9px] font-black uppercase ${o.metodo_pago === 'efectivo' ? 'text-green-600' : 'text-blue-600'}`}>
                                    {o.metodo_pago === 'efectivo' ? '💵' : '💳'} {o.metodo_pago}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="font-black text-sm text-slate-900 shrink-0 ml-2">
                              ${(parseFloat(o.total) || 0).toLocaleString('es-CO')}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}