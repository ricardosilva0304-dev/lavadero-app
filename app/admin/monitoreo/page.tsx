'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Activity, User, CheckCircle2, Zap,
  ShieldCheck, PlayCircle, Car, Bike,
  ChevronDown, ChevronUp, Clock,
  CreditCard, Wallet, Trophy, RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { rangoHoyCol, isoAHoraCol } from '@/utils/colombia'

export const dynamic = 'force-dynamic'

export default function MonitoreoPage() {
  const supabase = createClient()
  const [empleadosData, setEmpleadosData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [ahora, setAhora] = useState(new Date())

  // Reloj en vivo Colombia
  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const horaCol = () => {
    const col = new Date(ahora.getTime() - 5 * 60 * 60 * 1000)
    const h = String(col.getUTCHours()).padStart(2, '0')
    const m = String(col.getUTCMinutes()).padStart(2, '0')
    const s = String(col.getUTCSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const fechaCol = () => {
    const col = new Date(ahora.getTime() - 5 * 60 * 60 * 1000)
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${dias[col.getUTCDay()]}, ${col.getUTCDate()} ${meses[col.getUTCMonth()]} ${col.getUTCFullYear()}`
  }

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { inicio, fin } = rangoHoyCol()

    const [{ data: empleados }, { data: ordenes }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('rol', 'empleado'),
      supabase
        .from('ordenes_servicio')
        .select('*, cliente:clientes!cliente_id(nombre)')
        .gte('creado_en', inicio)
        .lte('creado_en', fin)
        .order('creado_en', { ascending: true })
    ])

    if (empleados) {
      const resumen = empleados.map(emp => {
        const misOrdenes = ordenes?.filter(o => o.empleado_id === emp.id) || []
        const completadas = misOrdenes.filter(o => o.estado === 'terminado')
        const activas = misOrdenes.filter(o => o.estado !== 'terminado')
        const totalProducido = completadas.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const efectivo = completadas.filter(o => o.metodo_pago === 'efectivo').reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const transferencia = completadas.filter(o => o.metodo_pago === 'transferencia').reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const carros = completadas.filter(o => o.tipo_vehiculo === 'carro').length
        const motos = completadas.filter(o => o.tipo_vehiculo !== 'carro').length
        return { ...emp, completadas, activas, totalProducido, efectivo, transferencia, carros, motos }
      })
      resumen.sort((a, b) => b.activas.length - a.activas.length || b.totalProducido - a.totalProducido)
      setEmpleadosData(resumen)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const channel = supabase.channel('monitoreo_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchStatus(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchStatus])

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    setEmpleadosData(prev => prev.map(emp => {
      const tarea = emp.activas.find((a: any) => a.id === id)
      if (!tarea) return emp
      if (nuevoEstado === 'terminado') {
        return {
          ...emp,
          activas: emp.activas.filter((a: any) => a.id !== id),
          completadas: [...emp.completadas, { ...tarea, estado: 'terminado' }],
          totalProducido: emp.totalProducido + (Number(tarea.total) || 0),
          efectivo: tarea.metodo_pago === 'efectivo' ? emp.efectivo + (Number(tarea.total) || 0) : emp.efectivo,
          transferencia: tarea.metodo_pago === 'transferencia' ? emp.transferencia + (Number(tarea.total) || 0) : emp.transferencia,
        }
      }
      return { ...emp, activas: emp.activas.map((a: any) => a.id === id ? { ...a, estado: nuevoEstado } : a) }
    }))
    const { error } = await supabase.from('ordenes_servicio').update({ estado: nuevoEstado }).eq('id', id)
    if (error) fetchStatus(true)
  }

  const totalGeneral = empleadosData.reduce((acc, e) => acc + e.totalProducido, 0)
  const totalLavados = empleadosData.reduce((acc, e) => acc + e.completadas.length, 0)
  const enTrabajo = empleadosData.filter(e => e.activas.length > 0).length

  return (
    <div className="min-h-screen pt-20 lg:pt-8 bg-[#F8FAFC] text-slate-900 pb-24 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Rendimiento Operativo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
              Monitoreo <span className="text-gorilla-orange">Personal</span>
            </h1>
          </div>

          {/* Reloj Colombia + Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#0E0C15] text-white px-5 py-3 rounded-2xl text-right shadow-lg">
              <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-0.5">Hora Colombia</p>
              <p className="text-2xl font-black tracking-tighter leading-none tabular-nums">{horaCol()}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{fechaCol()}</p>
            </div>
            <button
              onClick={() => fetchStatus()}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm"
              title="Actualizar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest uppercase bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <ShieldCheck size={13} className="text-gorilla-purple" /> {empleadosData.length} Lavadores
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-orange tracking-widest uppercase bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
            <Zap size={13} fill="currentColor" /> Tiempo Real
          </span>
          {enTrabajo > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-purple tracking-widest uppercase bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gorilla-purple opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gorilla-purple" />
              </span>
              {enTrabajo} en trabajo
            </span>
          )}
        </div>

        {/* ── RESUMEN GLOBAL ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0E0C15] text-white rounded-2xl p-5 shadow-xl relative overflow-hidden col-span-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gorilla-orange/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1 relative z-10">Recaudo del día</p>
            <p className="text-3xl sm:text-4xl font-black tracking-tighter leading-none relative z-10">${totalGeneral.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lavados Hoy</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{totalLavados}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-gorilla-purple shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Activos Ahora</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{enTrabajo}</p>
            </div>
          </div>
        </div>

        {/* ── TARJETAS EMPLEADOS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-5">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-72 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm" />
            ))
          ) : empleadosData.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay personal registrado</p>
            </div>
          ) : (
            <AnimatePresence>
              {empleadosData.map((emp) => {
                const isWorking = emp.activas.length > 0
                const isExpanded = expandido === emp.id

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    key={emp.id}
                    className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-shadow ${isWorking ? 'border-gorilla-purple/30 shadow-purple-100/60 shadow-md' : 'border-slate-200'
                      }`}
                  >
                    {/* Barra de estado superior */}
                    <div className={`h-1 w-full ${isWorking ? 'bg-gorilla-purple' : 'bg-slate-100'}`} />

                    <div className="p-5">
                      {/* Encabezado */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-black text-lg text-white ${isWorking ? 'bg-gorilla-purple' : 'bg-slate-300'
                          }`}>
                          {emp.nombre[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate">{emp.nombre}</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <User size={9} /> ID: {emp.cedula}
                          </p>
                        </div>
                        {isWorking && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gorilla-purple opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gorilla-purple" />
                          </span>
                        )}
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lavados</p>
                          <p className="text-2xl font-black text-slate-800 leading-none">{emp.completadas.length}</p>
                          <div className="flex items-center justify-center gap-2.5 mt-1.5">
                            <span className="flex items-center gap-0.5 text-[8px] text-blue-500 font-bold">
                              <Car size={9} /> {emp.carros}
                            </span>
                            <span className="flex items-center gap-0.5 text-[8px] text-orange-500 font-bold">
                              <Bike size={9} /> {emp.motos}
                            </span>
                          </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-center">
                          <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1">Producido</p>
                          <p className="text-lg font-black text-gorilla-orange leading-none tracking-tighter">
                            ${emp.totalProducido.toLocaleString('es-CO')}
                          </p>
                          <p className="text-[8px] text-green-600 font-bold mt-1.5 flex items-center justify-center gap-0.5">
                            <Wallet size={8} /> ${emp.efectivo.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      {/* Tareas activas */}
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                          <Activity size={11} className={isWorking ? 'text-gorilla-purple' : 'text-slate-300'} />
                          Tareas en curso ({emp.activas.length})
                        </p>
                        <div className="space-y-2">
                          {emp.activas.length === 0 ? (
                            <div className="py-3 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-center">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sin servicios activos</p>
                            </div>
                          ) : (
                            emp.activas.map((act: any) => (
                              <div key={act.id} className="bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`p-1.5 rounded-lg shrink-0 ${act.estado === 'pendiente' ? 'bg-yellow-50 text-yellow-500' : 'bg-purple-50 text-gorilla-purple'}`}>
                                    {act.tipo_vehiculo === 'carro' ? <Car size={12} /> : <Bike size={12} />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{act.placa}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                      {act.estado === 'pendiente' ? '⏳ En espera' : '🔄 Lavando'}
                                    </p>
                                  </div>
                                </div>
                                {act.estado === 'pendiente' ? (
                                  <button onClick={() => actualizarEstado(act.id, 'en_proceso')}
                                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-black transition-all active:scale-95 shrink-0" title="Iniciar">
                                    <PlayCircle size={14} className="text-gorilla-orange" />
                                  </button>
                                ) : (
                                  <button onClick={() => actualizarEstado(act.id, 'terminado')}
                                    className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-all active:scale-95 shrink-0" title="Finalizar">
                                    <CheckCircle2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Botón expandir */}
                      {emp.completadas.length > 0 && (
                        <button
                          onClick={() => setExpandido(isExpanded ? null : emp.id)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-gorilla-orange uppercase tracking-widest py-2 border-t border-slate-100 transition-colors"
                        >
                          {isExpanded
                            ? <><ChevronUp size={12} /> Ocultar detalle</>
                            : <><ChevronDown size={12} /> Ver resumen del día ({emp.completadas.length})</>
                          }
                        </button>
                      )}
                    </div>

                    {/* ── PANEL EXPANDIBLE ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50"
                        >
                          <div className="p-4 space-y-3">
                            {/* Resumen pagos */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white border border-green-100 rounded-xl p-3 flex items-center gap-2">
                                <Wallet size={14} className="text-green-600 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efectivo</p>
                                  <p className="text-sm font-black text-slate-900">${emp.efectivo.toLocaleString('es-CO')}</p>
                                </div>
                              </div>
                              <div className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                                <CreditCard size={14} className="text-blue-500 shrink-0" />
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Transfer.</p>
                                  <p className="text-sm font-black text-slate-900">${emp.transferencia.toLocaleString('es-CO')}</p>
                                </div>
                              </div>
                            </div>

                            {/* Lista de servicios */}
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Servicios realizados
                              </p>
                              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                {emp.completadas.map((orden: any, idx: number) => (
                                  <div key={orden.id} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[9px] font-black text-slate-300 w-4 shrink-0 tabular-nums">#{idx + 1}</span>
                                      <div className={`p-1 rounded-lg shrink-0 ${orden.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                                        {orden.tipo_vehiculo === 'carro' ? <Car size={11} /> : <Bike size={11} />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{orden.placa}</p>
                                        {orden.nombres_servicios && (
                                          <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5">{orden.nombres_servicios}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[11px] font-black text-slate-900">${(Number(orden.total) || 0).toLocaleString('es-CO')}</p>
                                      <div className="flex items-center gap-1 justify-end mt-0.5">
                                        <Clock size={8} className="text-slate-300" />
                                        <span className="text-[8px] text-slate-400 font-bold tabular-nums">
                                          {orden.creado_en ? isoAHoraCol(orden.creado_en) : '--:--'}
                                        </span>
                                        {orden.metodo_pago === 'efectivo'
                                          ? <Wallet size={8} className="text-green-500" />
                                          : <CreditCard size={8} className="text-blue-500" />
                                        }
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  )
}