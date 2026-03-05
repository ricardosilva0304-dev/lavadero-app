'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, Package, Clock, Search, Printer, TrendingUp } from 'lucide-react'

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

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-32">
            <style jsx global>{`
        @media print {
          nav, .no-print, button { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

            <div className="max-w-5xl mx-auto">

                {/* ENCABEZADO */}
                <header className="mb-8 flex flex-col gap-6 print:hidden">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900">
                            Reportes <span className="text-purple-600">Flash</span>
                        </h1>
                    </div>

                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full md:w-fit">
                        <ReportTab label="Servicios" icon={<FileText size={16} />} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
                        <ReportTab label="Inventario" icon={<Package size={16} />} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
                        <ReportTab label="Parqueo" icon={<Clock size={16} />} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
                    </div>
                </header>

                {/* BUSCADOR */}
                <div className="flex gap-3 mb-6 print:hidden">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="Buscar..."
                            className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl outline-none font-bold shadow-sm focus:ring-2 ring-purple-500/20"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 rounded-2xl font-black hover:bg-slate-800 transition-colors">
                        <Printer size={20} />
                    </button>
                </div>

                {/* LISTADO UNIFICADO (GRID) */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="hidden md:grid grid-cols-3 bg-slate-50 border-b border-slate-200 p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <span>{activeTab === 'inventario' ? 'Producto' : 'Fecha / Identificador'}</span>
                        <span>Detalle / Estado</span>
                        <span className="text-right">Valor</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-10 text-center font-bold text-slate-400 animate-pulse">CARGANDO DATOS...</div>
                        ) : dataFiltrada.length === 0 ? (
                            <div className="p-10 text-center font-bold text-slate-400">No se encontraron registros.</div>
                        ) : dataFiltrada.map((item) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 p-5 items-center gap-2 md:gap-4 hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="font-black text-slate-900 text-lg md:text-sm tracking-tighter truncate">
                                        {activeTab === 'inventario' ? item.nombre : (item.placa || 'N/A')}
                                    </p>
                                    <p className="md:hidden text-[10px] font-bold text-slate-400 uppercase">
                                        {activeTab === 'ventas' ? new Date(item.creado_en).toLocaleDateString() : 'Registro'}
                                    </p>
                                </div>
                                <div className="text-xs text-slate-500 font-medium truncate italic">
                                    {activeTab === 'ventas' && item.nombres_servicios}
                                    {activeTab === 'inventario' && (
                                        <span className={`px-2 py-1 rounded-md font-black text-[10px] ${item.stock <= (item.stock_minimo || 0) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            STOCK: {item.stock}
                                        </span>
                                    )}
                                    {activeTab === 'parqueadero' && item.tipo_tarifa}
                                </div>
                                <div className="text-left md:text-right font-black text-slate-900">
                                    ${Number(item.total || item.total_pagar || item.precio_venta || 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* WIDGET TOTAL */}
                <div className="mt-6 p-6 bg-purple-600 rounded-3xl shadow-lg shadow-purple-200 flex justify-between items-center text-white print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl"><TrendingUp size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">Total del Filtro</p>
                            <p className="text-xl font-black">${totalMonto.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ReportTab({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${active ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'
                }`}
        >
            {icon} <span>{label}</span>
        </button>
    )
}