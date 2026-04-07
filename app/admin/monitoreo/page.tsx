'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Activity, User, CheckCircle2, Zap,
  ShieldCheck, PlayCircle, Car, Bike,
  ChevronDown, ChevronUp, Clock,
  CreditCard, Wallet, Trophy, RefreshCw,
  DollarSign, Check, X, AlertCircle
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

  // Modal de cobro
  const [ordenACobrar, setOrdenACobrar] = useState<any>(null)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [loadingCobro, setLoadingCobro] = useState(false)

  // Reloj Colombia en vivo
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
        // cobradas = estado 'cobrado'
        const cobradas = misOrdenes.filter(o => o.estado === 'cobrado')
        // por cobrar = terminadas pero aún no cobradas
        const porCobrar = misOrdenes.filter(o => o.estado === 'terminado')
        // activas = en proceso o pendientes
        const activas = misOrdenes.filter(o => o.estado === 'pendiente' || o.estado === 'en_proceso')

        const totalProducido = cobradas.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const efectivo = cobradas.filter(o => o.metodo_pago === 'efectivo').reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const transferencia = cobradas.filter(o => o.metodo_pago === 'transferencia').reduce((acc, o) => acc + (Number(o.total) || 0), 0)
        const carros = cobradas.filter(o => o.tipo_vehiculo === 'carro').length
        const motos = cobradas.filter(o => o.tipo_vehiculo !== 'carro').length

        return { ...emp, cobradas, porCobrar, activas, totalProducido, efectivo, transferencia, carros, motos }
      })

      // Ordenar: primero los que tienen cosas por cobrar, luego los activos, luego por producción
      resumen.sort((a, b) =>
        b.porCobrar.length - a.porCobrar.length ||
        b.activas.length - a.activas.length ||
        b.totalProducido - a.totalProducido
      )
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

  // Cambiar estado de activos (pendiente → en_proceso)
  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    setEmpleadosData(prev => prev.map(emp => ({
      ...emp,
      activas: emp.activas.map((a: any) => a.id === id ? { ...a, estado: nuevoEstado } : a)
    })))
    const { error } = await supabase.from('ordenes_servicio').update({ estado: nuevoEstado }).eq('id', id)
    if (error) fetchStatus(true)
  }

  // Abrir modal de cobro
  const abrirCobro = (orden: any) => {
    setOrdenACobrar(orden)
    setMetodoPago('efectivo')
  }

  // Confirmar cobro
  const confirmarCobro = async () => {
    if (!ordenACobrar) return
    setLoadingCobro(true)
    const { error } = await supabase
      .from('ordenes_servicio')
      .update({ estado: 'cobrado', metodo_pago: metodoPago })
      .eq('id', ordenACobrar.id)

    if (!error) {
      // Actualización optimista
      setEmpleadosData(prev => prev.map(emp => {
        const orden = emp.porCobrar.find((o: any) => o.id === ordenACobrar.id)
        if (!orden) return emp
        const ordenCobrada = { ...orden, estado: 'cobrado', metodo_pago: metodoPago }
        return {
          ...emp,
          porCobrar: emp.porCobrar.filter((o: any) => o.id !== ordenACobrar.id),
          cobradas: [...emp.cobradas, ordenCobrada],
          totalProducido: emp.totalProducido + (Number(orden.total) || 0),
          efectivo: metodoPago === 'efectivo' ? emp.efectivo + (Number(orden.total) || 0) : emp.efectivo,
          transferencia: metodoPago === 'transferencia' ? emp.transferencia + (Number(orden.total) || 0) : emp.transferencia,
        }
      }))
      setOrdenACobrar(null)
    }
    setLoadingCobro(false)
  }

  const totalGeneral = empleadosData.reduce((acc, e) => acc + e.totalProducido, 0)
  const totalLavados = empleadosData.reduce((acc, e) => acc + e.cobradas.length, 0)
  const totalPorCobrar = empleadosData.reduce((acc, e) => acc + e.porCobrar.length, 0)
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

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#0E0C15] text-white px-5 py-3 rounded-2xl text-right shadow-lg">
              <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-0.5">Hora Colombia</p>
              <p className="text-2xl font-black tracking-tighter leading-none tabular-nums">{horaCol()}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{fechaCol()}</p>
            </div>
            <button onClick={() => fetchStatus()}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm">
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
          {totalPorCobrar > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 tracking-widest uppercase bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 shadow-sm animate-pulse">
              <AlertCircle size={13} /> {totalPorCobrar} por cobrar
            </span>
          )}
        </div>

        {/* ── RESUMEN GLOBAL ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0E0C15] text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gorilla-orange/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1 relative z-10">Recaudo del día</p>
            <p className="text-3xl sm:text-4xl font-black tracking-tighter leading-none relative z-10">${totalGeneral.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lavados Cobrados</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{totalLavados}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 shadow-sm flex items-center gap-4 border ${totalPorCobrar > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${totalPorCobrar > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Por Cobrar</p>
              <p className={`text-3xl font-black tracking-tighter leading-none ${totalPorCobrar > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{totalPorCobrar}</p>
            </div>
          </div>
        </div>

        {/* ── TARJETAS EMPLEADOS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-5">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-72 bg-white border border-slate-100 rounded-2xl animate-pulse shadow-sm" />
            ))
          ) : empleadosData.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay personal registrado</p>
            </div>
          ) : (
            <AnimatePresence>
              {empleadosData.map(emp => {
                const isWorking = emp.activas.length > 0
                const hasCobrar = emp.porCobrar.length > 0
                const isExpanded = expandido === emp.id

                return (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key={emp.id}
                    className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-shadow ${hasCobrar ? 'border-amber-300 shadow-amber-100/60 shadow-md' :
                        isWorking ? 'border-gorilla-purple/30 shadow-purple-100/60 shadow-md' :
                          'border-slate-200'
                      }`}
                  >
                    {/* Barra superior */}
                    <div className={`h-1.5 w-full ${hasCobrar ? 'bg-amber-400' : isWorking ? 'bg-gorilla-purple' : 'bg-slate-100'}`} />

                    <div className="p-5">
                      {/* Encabezado empleado */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-black text-lg text-white ${hasCobrar ? 'bg-amber-400' : isWorking ? 'bg-gorilla-purple' : 'bg-slate-300'
                          }`}>
                          {emp.nombre[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate">{emp.nombre}</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <User size={9} /> CC: {emp.cedula}
                          </p>
                        </div>
                        {hasCobrar && (
                          <span className="bg-amber-100 text-amber-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shrink-0">
                            {emp.porCobrar.length} cobro{emp.porCobrar.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {!hasCobrar && isWorking && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gorilla-purple opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gorilla-purple" />
                          </span>
                        )}
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cobrados</p>
                          <p className="text-2xl font-black text-slate-800 leading-none">{emp.cobradas.length}</p>
                          <div className="flex items-center justify-center gap-2.5 mt-1.5">
                            <span className="flex items-center gap-0.5 text-[8px] text-blue-500 font-bold"><Car size={9} /> {emp.carros}</span>
                            <span className="flex items-center gap-0.5 text-[8px] text-orange-500 font-bold"><Bike size={9} /> {emp.motos}</span>
                          </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-center">
                          <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1">Producido</p>
                          <p className="text-lg font-black text-gorilla-orange leading-none tracking-tighter">${emp.totalProducido.toLocaleString('es-CO')}</p>
                          <p className="text-[8px] text-green-600 font-bold mt-1.5 flex items-center justify-center gap-0.5">
                            <Wallet size={8} /> ${emp.efectivo.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      {/* ── SECCIÓN POR COBRAR ── */}
                      {hasCobrar && (
                        <div className="mb-4">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <DollarSign size={11} /> Por cobrar ({emp.porCobrar.length})
                          </p>
                          <div className="space-y-2">
                            {emp.porCobrar.map((orden: any) => (
                              <div key={orden.id} className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`p-1.5 rounded-lg shrink-0 ${orden.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-500' : 'bg-orange-100 text-orange-500'}`}>
                                    {orden.tipo_vehiculo === 'carro' ? <Car size={13} /> : <Bike size={13} />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{orden.placa}</p>
                                    <p className="text-[8px] text-slate-500 font-bold truncate mt-0.5">{orden.nombres_servicios}</p>
                                    {orden.cliente?.nombre && (
                                      <p className="text-[8px] text-slate-400 font-bold truncate">{orden.cliente.nombre}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <span className="text-sm font-black text-slate-900">${(Number(orden.total) || 0).toLocaleString('es-CO')}</span>
                                  <button onClick={() => abrirCobro(orden)}
                                    className="bg-amber-400 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1">
                                    <DollarSign size={11} /> COBRAR
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── ACTIVOS ── */}
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                          <Activity size={11} className={isWorking ? 'text-gorilla-purple' : 'text-slate-300'} />
                          En lavado ({emp.activas.length})
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
                                {act.estado === 'pendiente' && (
                                  <button onClick={() => actualizarEstado(act.id, 'en_proceso')}
                                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-black transition-all active:scale-95 shrink-0" title="Iniciar">
                                    <PlayCircle size={14} className="text-gorilla-orange" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Expandir historial */}
                      {emp.cobradas.length > 0 && (
                        <button onClick={() => setExpandido(isExpanded ? null : emp.id)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-gorilla-orange uppercase tracking-widest py-2 border-t border-slate-100 transition-colors">
                          {isExpanded
                            ? <><ChevronUp size={12} /> Ocultar detalle</>
                            : <><ChevronDown size={12} /> Ver cobrados hoy ({emp.cobradas.length})</>}
                        </button>
                      )}
                    </div>

                    {/* PANEL EXPANDIBLE — historial cobrado */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50">
                          <div className="p-4 space-y-3">
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
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios cobrados</p>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                              {emp.cobradas.map((orden: any, idx: number) => (
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
                                        : <CreditCard size={8} className="text-blue-500" />}
                                    </div>
                                  </div>
                                </div>
                              ))}
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

      {/* ── MODAL DE COBRO ── */}
      <AnimatePresence>
        {ordenACobrar && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-7 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-green-500" />

              <button onClick={() => setOrdenACobrar(null)} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>

              {/* Info del servicio */}
              <div className="flex flex-col items-center mb-6 pt-2">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
                  <DollarSign size={30} className="text-amber-500" />
                </div>
                <h2 className="text-xl font-black italic uppercase text-slate-900 text-center leading-tight">Registrar Cobro</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{ordenACobrar.placa}</p>
                {ordenACobrar.cliente?.nombre && (
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{ordenACobrar.cliente.nombre}</p>
                )}
                {ordenACobrar.nombres_servicios && (
                  <p className="text-[10px] text-slate-400 font-bold mt-1 text-center">{ordenACobrar.nombres_servicios}</p>
                )}
              </div>

              {/* Total */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 text-center border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a cobrar</p>
                <p className="text-4xl font-black tracking-tighter text-slate-900">
                  ${(parseFloat(ordenACobrar.total) || 0).toLocaleString('es-CO')}
                </p>
              </div>

              {/* Método de pago */}
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Método de pago</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {(['efectivo', 'transferencia'] as const).map(m => (
                  <button key={m} onClick={() => setMetodoPago(m)}
                    className={`py-4 rounded-xl font-black text-[11px] tracking-widest border-2 transition-all flex flex-col items-center gap-1.5 ${metodoPago === m
                        ? m === 'efectivo' ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                    {m === 'efectivo' ? <Wallet size={18} /> : <CreditCard size={18} />}
                    {m === 'efectivo' ? 'EFECTIVO' : 'TRANSF.'}
                    {metodoPago === m && <Check size={13} strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <button onClick={confirmarCobro} disabled={loadingCobro}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loadingCobro
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                  : <><CheckCircle2 size={18} className="text-green-400" /> CONFIRMAR COBRO</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}