'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, Package, Clock, Search, Printer, TrendingUp, Calendar, Tag, Car } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ReportesPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'ventas' | 'inventario' | 'parqueadero'>('ventas')
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('')

    useEffect(() => {
        fetchReporte()
    }, [activeTab])

    const fetchReporte = async () => {
        setLoading(true)
        let query;
        if (activeTab === 'ventas') {
            query = supabase.from('ordenes_servicio').select('*, perfiles(nombre)').order('creado_en', { ascending: false })
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
        const textoBusqueda = filtro.toLowerCase()
        return (
            (item.placa?.toLowerCase().includes(textoBusqueda)) ||
            (item.nombre?.toLowerCase().includes(textoBusqueda)) ||
            (item.nombres_servicios?.toLowerCase().includes(textoBusqueda)) ||
            (item.categoria?.toLowerCase().includes(textoBusqueda))
        )
    })

    const totalMonto = dataFiltrada.reduce((acc, item) => acc + (Number(item.total || item.total_pagar || item.precio_venta || 0)), 0)

    // Formateador de datos para unificar la vista de la tarjeta
    const formatItem = (item: any) => {
        if (activeTab === 'inventario') {
            return {
                titulo: item.nombre,
                subtitulo: item.categoria || 'Producto',
                detalle: `Stock actual: ${item.stock}`,
                isCritico: item.stock <= (item.stock_minimo || 0),
                valor: item.precio_venta,
                fecha: null,
                icon: <Package size={18} />
            }
        }
        if (activeTab === 'ventas') {
            return {
                titulo: item.placa,
                subtitulo: item.perfiles?.nombre || 'General',
                detalle: item.nombres_servicios,
                isCritico: false,
                valor: item.total,
                fecha: new Date(item.creado_en).toLocaleDateString('es-CO'),
                icon: <Car size={18} />
            }
        }
        // Parqueadero
        return {
            titulo: item.placa,
            subtitulo: 'Parqueo Finalizado',
            detalle: item.tipo_tarifa === 'dia' ? 'Cobro por Día' : 'Cobro por Mes',
            isCritico: false,
            valor: item.total_pagar,
            fecha: new Date(item.hora_salida).toLocaleDateString('es-CO'),
            icon: <Clock size={18} />
        }
    }

    return (
        // AQUÍ ESTÁ EL ARREGLO DEL PADDING (pt-24 lg:pt-10) PARA QUE NO QUEDE PEGADO AL TECHO
        <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-10 pb-32 overflow-x-hidden">
            <style jsx global>{`
                @media print {
                nav, .no-print, button, header { display: none !important; }
                .print-only { display: block !important; }
                body { background: white; }
                .print-card { break-inside: avoid; border: 1px solid #e2e8f0; box-shadow: none !important; }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="max-w-5xl mx-auto space-y-8">

                {/* ENCABEZADO Y TABS */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 no-print">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-1 w-8 bg-gorilla-purple rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                            Reportes <span className="text-gorilla-purple">Flash</span>
                        </h1>
                    </div>

                    {/* Scroll horizontal en móviles para evitar que se aplaste */}
                    <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200/60 w-full xl:w-auto overflow-x-auto no-scrollbar">
                        <ReportTab label="Servicios" icon={<FileText size={16} />} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
                        <ReportTab label="Inventario" icon={<Package size={16} />} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
                        <ReportTab label="Parqueo" icon={<Clock size={16} />} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
                    </div>
                </header>

                {/* BUSCADOR Y BOTÓN IMPRIMIR */}
                <div className="flex flex-col sm:flex-row gap-3 no-print">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-purple transition-colors" size={18} />
                        <input
                            placeholder="Buscar placa, producto o detalle..."
                            className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-[1.5rem] outline-none font-bold text-sm shadow-sm focus:ring-4 ring-purple-50 focus:border-gorilla-purple transition-all uppercase placeholder:text-slate-300"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-[1.5rem] font-black tracking-widest text-xs uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md shrink-0">
                        <Printer size={18} /> <span className="sm:hidden md:block">Imprimir</span>
                    </button>
                </div>

                {/* LISTADO DE RESULTADOS (SMART CARDS) */}
                <main className="space-y-3">
                    {loading ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 border-4 border-gorilla-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Generando Reporte...</p>
                        </div>
                    ) : dataFiltrada.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                            <FileText className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No se encontraron datos</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {dataFiltrada.map((item) => {
                                const info = formatItem(item);
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={item.id}
                                        className="print-card bg-white border border-slate-200/60 p-4 md:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-gorilla-purple/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                    >
                                        {/* Izquierda: Icono, Titulo y Subtitulo */}
                                        <div className="flex items-center gap-4 md:w-1/3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 group-hover:text-gorilla-purple transition-colors">
                                                {info.icon}
                                            </div>
                                            <div className="truncate">
                                                <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter leading-none mb-1.5 truncate">{info.titulo || 'N/A'}</h3>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                                    {info.fecha && <><Calendar size={10} /> {info.fecha} •</>}
                                                    <span className="truncate">{info.subtitulo}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Centro: Detalles */}
                                        <div className="flex-1 border-t md:border-none border-slate-100 pt-3 md:pt-0">
                                            <div className="flex items-center gap-2">
                                                <Tag size={14} className="text-slate-300 shrink-0" />
                                                <p className={`text-xs font-bold uppercase leading-snug line-clamp-1 ${info.isCritico ? 'text-red-500' : 'text-slate-500'}`}>
                                                    {info.detalle}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Derecha: Precio */}
                                        <div className="text-right border-t md:border-none border-slate-100 pt-3 md:pt-0 shrink-0">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 md:hidden">Valor Total</span>
                                            <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                                                ${Number(info.valor || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </main>

                {/* WIDGET TOTAL (Fijo abajo y súper elegante) */}
                {!loading && dataFiltrada.length > 0 && (
                    <div className="sticky bottom-6 bg-[#0E0C15] rounded-[2rem] p-6 shadow-2xl flex justify-between items-center text-white border border-slate-800 no-print z-40 overflow-hidden">
                        <div className="absolute left-0 top-0 w-2 h-full bg-gorilla-purple" />
                        <div className="flex items-center gap-4 pl-2">
                            <div className="p-3 bg-white/10 rounded-xl hidden sm:block"><TrendingUp size={24} className="text-gorilla-purple" /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de este reporte</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{dataFiltrada.length} Registros encontrados</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-none">${totalMonto.toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function ReportTab({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${active
                    ? 'bg-gorilla-purple text-white shadow-md'
                    : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
        >
            <span className={active ? 'opacity-100' : 'opacity-50'}>{icon}</span> {label}
        </button>
    )
}