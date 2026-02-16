'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Activity, CheckCircle2, Clock, User, DollarSign, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

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
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    
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
      setEmpleadosData(resumen)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-3xl font-black italic uppercase text-gray-900">
          Monitoreo <span className="text-gorilla-orange">Personal</span>
        </h1>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Actividad en tiempo real de los lavadores</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {empleadosData.map((emp) => (
          <div key={emp.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gorilla-purple text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-purple-200">
                {emp.nombre[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase leading-none">{emp.nombre}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">ID: {emp.cedula}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Lavados Hoy</p>
                <p className="text-2xl font-black text-gray-900">{emp.completados}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Producido</p>
                <p className="text-2xl font-black text-gorilla-orange">${emp.totalProducido.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Activity size={12} className="text-blue-500 animate-pulse" /> Tareas Actuales
              </h4>
              {emp.activos.length === 0 ? (
                <p className="text-[10px] text-gray-300 font-bold italic py-4 text-center border border-dashed border-gray-200 rounded-2xl">Sin servicios activos</p>
              ) : (
                emp.activos.map((act: any) => (
                  <div key={act.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Clock size={16}/></div>
                      <span className="text-sm font-black text-gray-800">{act.placa}</span>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${act.estado === 'pendiente' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {act.estado}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}