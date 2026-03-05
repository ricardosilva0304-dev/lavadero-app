'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, FileText, User, Car, Tag, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function HistorialPage() {
  const supabase = createClient()
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistorial()
  }, [])

  const fetchHistorial = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('ordenes_servicio')
      .select(`
        *,
        cliente:clientes!cliente_id (nombre),
        empleado:perfiles!empleado_id (nombre)
      `)
      .order('creado_en', { ascending: false })

    if (error) {
      console.error("Error en el historial:", error.message)
      const { data: fallbackData } = await supabase
        .from('ordenes_servicio')
        .select('*')
        .order('creado_en', { ascending: false })
      setOrdenes(fallbackData || [])
    } else {
      setOrdenes(data || [])
    }

    setLoading(false)
  }

  const filtered = ordenes.filter(o => o.placa.toLowerCase().includes(busqueda.toLowerCase()))

  // Función para formatear la fecha de forma más limpia
  const formatearFecha = (fechaISO: string) => {
    const date = new Date(fechaISO);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-10">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black italic uppercase text-slate-900 leading-none">
            Historial <span className="text-gorilla-orange">Total</span>
          </h1>
        </div>

        <div className="relative w-full md:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder="BUSCAR POR PLACA..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm font-bold uppercase text-xs placeholder:text-slate-300"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando base de datos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No se encontraron registros</p>
          </div>
        ) : (
          filtered.map((o) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={o.id}
              className="bg-white border border-slate-100 p-5 lg:p-6 rounded-[2rem] shadow-sm hover:shadow-lg hover:border-slate-200 transition-all group"
            >
              {/* Uso de CSS Grid Inteligente: En móvil colapsa de forma organizada, en PC es horizontal */}
              <div className="grid grid-cols-2 lg:grid-cols-12 gap-y-4 gap-x-6 items-center w-full">

                {/* 1. VEHÍCULO Y FECHA (PC: 3 columnas | Móvil: Fila completa) */}
                <div className="col-span-2 lg:col-span-3 flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-gorilla-orange group-hover:bg-orange-50 transition-colors shrink-0">
                    <Car size={26} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-slate-900 leading-none mb-1">{o.placa}</h3>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock size={10} />
                      {formatearFecha(o.creado_en)}
                    </div>
                  </div>
                </div>

                {/* 2. CLIENTE Y SERVICIOS (PC: 5 columnas | Móvil: Fila completa) */}
                <div className="col-span-2 lg:col-span-5 flex flex-col justify-center border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User size={14} className="text-gorilla-purple shrink-0" />
                    <span className="text-xs font-bold text-slate-700 uppercase truncate">
                      {o.cliente?.nombre || 'Cliente General'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag size={14} className="text-slate-400 shrink-0 mt-[2px]" />
                    {/* line-clamp-2 recorta el texto si es muy largo añadiendo "..." */}
                    <p className="text-[11px] font-medium text-slate-500 uppercase leading-snug line-clamp-2">
                      {o.nombres_servicios}
                    </p>
                  </div>
                </div>

                {/* 3. OPERADOR Y ESTADO (PC: 2 columnas | Móvil: Media fila) */}
                <div className="col-span-1 lg:col-span-2 flex flex-col items-start justify-center border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lavador Asignado</span>
                  <p className="text-[11px] font-black text-slate-800 uppercase truncate w-full mb-2">
                    {o.empleado?.nombre || 'No asignado'}
                  </p>
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${o.metodo_pago === 'efectivo'
                      ? 'bg-green-100/50 text-green-600 border border-green-200/50'
                      : 'bg-blue-100/50 text-blue-600 border border-blue-200/50'
                    }`}>
                    {o.metodo_pago}
                  </span>
                </div>

                {/* 4. TOTAL PAGADO (PC: 2 columnas | Móvil: Media fila) */}
                <div className="col-span-1 lg:col-span-2 flex flex-col items-end justify-center border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pagado</span>
                  <p className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    ${Number(o.total || 0).toLocaleString()}
                  </p>
                </div>

              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  )
}