'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, Package, Clock, Search, TrendingUp, Calendar, Tag, Car, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ReportesPage() {
    const supabase = createClient()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'ventas' | 'inventario' | 'parqueadero'>('ventas')
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('')

    useEffect(() => {
        if (!sessionStorage.getItem('gorilla_user')) router.push('/login')
    }, [router])

    useEffect(() => { fetchReporte() }, [activeTab])

    const fetchReporte = async () => {
        setLoading(true)
        let query: any
        if (activeTab === 'ventas') {
            query = supabase.from('ordenes_servicio').select('*, empleado:perfiles!empleado_id(nombre)').order('creado_en', { ascending: false })
        } else if (activeTab === 'inventario') {
            query = supabase.from('productos').select('*').order('stock', { ascending: true })
        } else {
            query = supabase.from('parqueadero_registros').select('*').eq('estado', 'finalizado').order('hora_salida', { ascending: false })
        }
        const { data: res } = await query
        setData(res || [])
        setLoading(false)
    }

    const dataFiltrada = data.filter(item => {
        const t = filtro.toLowerCase()
        return (
            (item.placa?.toLowerCase().includes(t)) ||
            (item.nombre?.toLowerCase().includes(t)) ||
            (item.nombres_servicios?.toLowerCase().includes(t)) ||
            (item.categoria?.toLowerCase().includes(t))
        )
    })

    // CORRECCIÓN: parseFloat en todos los campos numéricos para evitar NaN
    const totalMonto = dataFiltrada.reduce((acc, item) => {
        const val = parseFloat(item.total ?? item.total_pagar ?? item.precio_venta ?? 0) || 0
        return acc + val
    }, 0)

    const formatItem = (item: any) => {
        if (activeTab === 'inventario') {
            return {
                titulo: item.nombre,
                subtitulo: item.categoria || 'Producto',
                detalle: `Stock actual: ${item.stock}`,
                isCritico: item.stock <= (item.stock_minimo || 0),
                valor: parseFloat(item.precio_venta) || 0,
                fecha: null,
                icon: <Package size={18} />
            }
        }
        if (activeTab === 'ventas') {
            return {
                titulo: item.placa,
                subtitulo: item.empleado?.nombre || 'Sin asignar',
                detalle: item.nombres_servicios,
                isCritico: false,
                valor: parseFloat(item.total) || 0,
                fecha: new Date(item.creado_en).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
                icon: <Car size={18} />
            }
        }
        return {
            titulo: item.placa,
            subtitulo: 'Parqueo Finalizado',
            detalle: item.tipo_tarifa === 'dia' ? 'Cobro por Día' : 'Cobro por Mes',
            isCritico: false,
            valor: parseFloat(item.total_pagar) || 0,
            fecha: new Date(item.hora_salida).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
            icon: <Clock size={18} />
        }
    }

    return (
        <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:px-10 pb-36 overflow-x-hidden">
            <style jsx global>{`
        @media print {
          nav, .no-print, button, header { display: none !important; }
          body { background: white; }
          .print-card { break-inside: avoid; border: 1px solid #e2e8f0; box-shadow: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

            <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

                {/* ENCABEZADO */}
                <header className="flex flex-col gap-5 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-1 w-8 bg-gorilla-purple rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                                Reportes <span className="text-gorilla-purple">Flash</span>
                            </h1>
                        </div>
                        {/* Botón Imprimir (antes faltaba en la UI) */}
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm w-fit"
                        >
                            <Printer size={15} /> Imprimir
                        </button>
                    </div>

                    {/* Tabs con scroll horizontal en móvil */}
                    <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200/60 w-full overflow-x-auto no-scrollbar gap-1">
                        <ReportTab label="Servicios" icon={<FileText size={15} />} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
                        <ReportTab label="Inventario" icon={<Package size={15} />} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
                        <ReportTab label="Parqueo" icon={<Clock size={15} />} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
                    </div>
                </header>

                {/* BUSCADOR */}
                <div className="relative group no-print">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-purple transition-colors" size={16} />
                    <input
                        placeholder="Buscar placa, producto o detalle..."
                        className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-[1.5rem] outline-none font-bold text-sm shadow-sm focus:ring-4 ring-purple-50 focus:border-gorilla-purple transition-all uppercase placeholder:text-slate-300"
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                    />
                </div>

                {/* LISTADO */}
                <main className="space-y-3">
                    {loading ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 border-4 border-gorilla-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Generando Reporte...</p>
                        </div>
                    ) : dataFiltrada.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                            <FileText className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No se encontraron datos</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {dataFiltrada.map(item => {
                                const info = formatItem(item)
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={item.id}
                                        className="print-card bg-white border border-slate-200/60 p-4 sm:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-gorilla-purple/40 transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">

                                            {/* Icono + título + subtítulo */}
                                            <div className="flex items-center gap-4 sm:w-1/3">
                                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                                    {info.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-base sm:text-lg text-slate-800 uppercase tracking-tighter leading-none mb-1 truncate">
                                                        {info.titulo || 'N/A'}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {info.fecha && <><Calendar size={10} /> {info.fecha} ·</>}
                                                        <span className="truncate">{info.subtitulo}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detalle */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Tag size={13} className="text-slate-300 shrink-0" />
                                                    <p className={`text-xs font-bold uppercase leading-snug line-clamp-1 ${info.isCritico ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {info.detalle}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Precio */}
                                            <div className="text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-none border-slate-100">
                                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter leading-none">
                                                    ${info.valor.toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </main>
            </div>

            {/* TOTAL FLOTANTE */}
            {!loading && dataFiltrada.length > 0 && (
                <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 lg:right-10 z-40 no-print">
                    <div className="bg-[#0E0C15] rounded-[1.5rem] sm:rounded-[2rem] px-5 sm:px-8 py-4 sm:py-5 shadow-2xl flex justify-between sm:gap-10 items-center text-white border border-slate-800">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2.5 bg-white/10 rounded-xl hidden sm:block">
                                <TrendingUp size={22} className="text-gorilla-purple" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total reporte</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{dataFiltrada.length} registros</p>
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tracking-tighter text-white">
                            ${totalMonto.toLocaleString('es-CO')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function ReportTab({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${active ? 'bg-gorilla-purple text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
        >
            <span className={active ? 'opacity-100' : 'opacity-50'}>{icon}</span> {label}
        </button>
    )
}