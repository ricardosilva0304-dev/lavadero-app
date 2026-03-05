'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Activity, Clock, User, CheckCircle2, Zap, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function MonitoreoPage() {
  const supabase = createClient()
  const [empleadosData, setEmpleadosData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
    const channel = supabase.channel('monitoreo_admin').on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchStatus()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchStatus = async () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    // 1. Obtener todos los empleados
    const { data: empleados } = await supabase.from('perfiles').select('*').eq('rol', 'empleado')

    // 2. Obtener todas las ordenes de hoy
    const { data: ordenes } = await supabase.from('ordenes_servicio').select('*').gte('creado_en', hoy.toISOString())

    if (empleados) {
      const resumen = empleados.map(emp => {
        const misOrdenes = ordenes?.filter(o => o.empleado_id === emp.id) || []
        return {
          ...emp,
          completados: misOrdenes.filter(o => o.estado === 'terminado').length,
          activos: misOrdenes.filter(o => o.estado !== 'terminado'),
          totalProducido: misOrdenes.filter(o => o.estado === 'terminado').reduce((acc, curr) => acc + Number(curr.total), 0)
        }
      })

      // Ordenar: Los que tienen tareas activas primero, luego por producción
      resumen.sort((a, b) => b.activos.length - a.activos.length || b.totalProducido - a.totalProducido)

      setEmpleadosData(resumen)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-8 lg:p-10 relative overflow-x-hidden">

      <div className="max-w-7xl mx-auto space-y-8 lg:space-y-10">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Rendimiento Operativo</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-4 text-slate-900 leading-none">
              Monitoreo <span className="text-gorilla-orange">Personal</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest uppercase bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                <ShieldCheck size={14} className="text-gorilla-purple" /> {empleadosData.length} Lavadores
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-orange tracking-widest uppercase bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
                <Zap size={14} fill="currentColor" /> Actividad en Tiempo Real
              </span>
            </div>
          </motion.div>
        </header>

        {/* CONTENIDO PRINCIPAL - GRID INTELIGENTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 lg:gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-72 bg-white border border-slate-100 rounded-[2rem] animate-pulse shadow-sm" />
            ))
          ) : empleadosData.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
              <LayoutDashboard size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay personal registrado</p>
            </div>
          ) : (
            <AnimatePresence>
              {empleadosData.map((emp) => {
                const isWorking = emp.activos.length > 0;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={emp.id}
                    className={`bg-white border p-6 rounded-[2rem] transition-all group relative flex flex-col justify-between ${isWorking
                        ? 'border-purple-200 shadow-lg shadow-purple-100/50'
                        : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300'
                      }`}
                  >
                    {/* Indicador de Actividad */}
                    {isWorking && (
                      <div className="absolute top-5 right-5 flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gorilla-purple opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gorilla-purple"></span>
                        </span>
                      </div>
                    )}

                    {/* Encabezado: Avatar y Nombre */}
                    <div className="flex items-center gap-4 mb-6 pr-6">
                      <div className={`w-12 h-12 shrink-0 rounded-[1rem] flex items-center justify-center font-black text-xl text-white shadow-inner ${isWorking ? 'bg-gorilla-purple' : 'bg-slate-300'}`}>
                        {emp.nombre[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate">{emp.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          <User size={10} /> ID: {emp.cedula || '---'}
                        </div>
                      </div>
                    </div>

                    {/* Métricas: Lavados Hoy y Producido */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lavados Hoy</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{emp.completados}</p>
                      </div>
                      <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-100 flex flex-col items-center justify-center text-center">
                        <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1">Producido</p>
                        <p className="text-2xl font-black text-gorilla-orange leading-none tracking-tighter">${emp.totalProducido.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Sección de Tareas en Curso */}
                    <div className="flex-1 flex flex-col pt-2 border-t border-slate-100">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity size={12} className={isWorking ? "text-gorilla-purple" : "text-slate-300"} />
                        Tareas en curso ({emp.activos.length})
                      </h4>

                      <div className="space-y-2">
                        {emp.activos.length === 0 ? (
                          <div className="py-4 px-2 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin servicios activos</p>
                          </div>
                        ) : (
                          emp.activos.map((act: any) => (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={act.id} className="bg-white border border-purple-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-2.5">
                                <div className="bg-purple-50 p-1.5 rounded-lg text-gorilla-purple"><Clock size={14} /></div>
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{act.placa}</span>
                              </div>
                              <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${act.estado === 'pendiente' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-purple-50 text-gorilla-purple border border-purple-100'}`}>
                                {act.estado}
                              </span>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

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