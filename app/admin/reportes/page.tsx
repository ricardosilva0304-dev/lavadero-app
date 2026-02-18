'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  FileText, Package, Clock, 
  Search, Printer, History, TrendingUp, ChevronRight
} from 'lucide-react'
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

  const totalMonto = dataFiltrada.reduce((acc, item) => acc + (Number(item.total || item.total_pagar || 0)), 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white text-slate-900 p-4 md:p-10 pb-32">
      
      {/* ESTILOS DE IMPRESIÓN MEJORADOS */}
      <style jsx global>{`
        @media print {
          @page { margin: 1cm; size: portrait; }
          nav, .no-print, button, .search-bar, .tabs-container { display: none !important; }
          .print-only { display: block !important; }
          .card-container { border: 1px solid #e2e8f0 !important; border-radius: 0 !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { background-color: #f8fafc !important; color: black !important; -webkit-print-color-adjust: exact; }
          td, th { border: 1px solid #e2e8f0 !important; padding: 8px !important; font-size: 10px !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        
        {/* ENCABEZADO RESPONSIVO */}
        <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
          <div className="w-full lg:w-auto">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-8 md:w-12 bg-purple-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Reportes <span className="text-purple-600">Flash</span>
            </h1>
          </div>

          {/* Tabs con Scroll Horizontal en Móvil */}
          <div className="tabs-container w-full lg:w-auto overflow-x-auto no-scrollbar">
            <div className="flex bg-white p-1.5 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 min-w-[340px]">
              <ReportTab label="Servicios" icon={<FileText size={16}/>} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
              <ReportTab label="Inventario" icon={<Package size={16}/>} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
              <ReportTab label="Parqueo" icon={<Clock size={16}/>} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
            </div>
          </div>
        </header>

        {/* ENCABEZADO IMPRESIÓN */}
        <div className="hidden print:block mb-6 text-center border-b-4 border-slate-900 pb-4">
          <h1 className="text-2xl font-black uppercase tracking-tighter">GORILLA FLASH - ESTADÍSTICAS</h1>
          <p className="text-xs font-bold uppercase text-slate-500">
            Reporte de {activeTab} • {new Date().toLocaleDateString()} • {dataFiltrada.length} Registros
          </p>
        </div>

        {/* BUSCADOR Y ACCIONES */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 print:hidden">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                <input 
                    placeholder="Buscar placa, producto o categoría..." 
                    className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl outline-none font-bold shadow-sm focus:ring-2 ring-purple-500/10 focus:border-purple-500 transition-all text-sm"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                />
            </div>
            <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
            >
                <Printer size={18}/> <span className="hidden md:inline">IMPRIMIR REPORTE</span><span className="md:hidden">IMPRIMIR</span>
            </button>
        </div>

        {/* VISTA DE DATOS (TABLA PC / CARDS MOVIL) */}
        <main className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden card-container">
            
            {/* TABLA: Visible solo en Tablet y PC */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            {activeTab === 'ventas' && (
                                <>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha/Placa</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicios Realizados</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                                </>
                            )}
                            {activeTab === 'inventario' && (
                                <>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Producto</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Stock</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Precio</th>
                                </>
                            )}
                            {activeTab === 'parqueadero' && (
                                <>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Salida/Placa</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                                    <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                           <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold animate-pulse">CARGANDO...</td></tr>
                        ) : dataFiltrada.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                {activeTab === 'ventas' && (
                                    <>
                                        <td className="p-5">
                                            <p className="font-black text-slate-900 tracking-tighter leading-none">{item.placa}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(item.creado_en).toLocaleString()}</p>
                                        </td>
                                        <td className="p-5 text-xs font-medium text-slate-500 uppercase italic">{item.nombres_servicios}</td>
                                        <td className="p-5 text-right font-black text-slate-900">${Number(item.total).toLocaleString()}</td>
                                    </>
                                )}
                                {activeTab === 'inventario' && (
                                    <>
                                        <td className="p-5">
                                            <p className="font-black text-slate-900 tracking-tighter leading-none">{item.nombre}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{item.categoria}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg font-black text-[10px] ${item.stock <= item.stock_minimo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {item.stock} UNIDADES
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-black text-slate-900">${Number(item.precio_venta).toLocaleString()}</td>
                                    </>
                                )}
                                {activeTab === 'parqueadero' && (
                                    <>
                                        <td className="p-5">
                                            <p className="font-black text-slate-900 tracking-tighter leading-none">{item.placa}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">{new Date(item.hora_salida).toLocaleString()}</p>
                                        </td>
                                        <td className="p-5 text-[10px] font-black text-slate-400 uppercase italic">{item.tipo_tarifa}</td>
                                        <td className="p-5 text-right font-black text-slate-900">${Number(item.total_pagar).toLocaleString()}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CARDS: Visible solo en móviles */}
            <div className="md:hidden divide-y divide-slate-100">
                {loading ? (
                    <div className="p-10 text-center font-black text-slate-300 animate-pulse uppercase text-xs">Obteniendo registros...</div>
                ) : dataFiltrada.map((item) => (
                    <div key={item.id} className="p-5 flex justify-between items-center">
                        <div>
                            <p className="font-black text-slate-900 text-lg tracking-tighter">
                                {activeTab === 'inventario' ? item.nombre : item.placa}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {activeTab === 'ventas' && item.nombres_servicios?.slice(0, 30) + '...'}
                                {activeTab === 'inventario' && item.categoria}
                                {activeTab === 'parqueadero' && `Salida: ${new Date(item.hora_salida).toLocaleTimeString()}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-slate-900">
                                ${Number(item.total || item.total_pagar || item.precio_venta).toLocaleString()}
                            </p>
                            {activeTab === 'inventario' && (
                                <p className={`text-[9px] font-black ${item.stock <= item.stock_minimo ? 'text-red-500' : 'text-green-500'}`}>
                                    STOCK: {item.stock}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* RESUMEN FINAL IMPRESIÓN */}
            <div className="hidden print:block p-4 border-t-2 border-slate-900 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-black uppercase text-sm">Gran Total Reportado:</span>
                <span className="text-xl font-black">${totalMonto.toLocaleString()}</span>
              </div>
            </div>
        </main>

        {/* WIDGETS INFERIORES RESPONSIVOS */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                    <History size={20}/>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{dataFiltrada.length}</p>
                </div>
            </div>
            
            <div className="bg-purple-600 p-5 rounded-3xl shadow-lg shadow-purple-200 flex items-center gap-4 text-white sm:col-span-1 lg:col-span-1">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={20}/>
                </div>
                <div>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Total Filtro</p>
                    <p className="text-2xl font-black leading-none">${totalMonto.toLocaleString()}</p>
                </div>
            </div>

            {/* Botón flotante opcional para móvil */}
            <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%]">
                <button 
                  onClick={() => window.print()}
                  className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <Printer size={20}/> GENERAR PDF / IMPRIMIR
                </button>
            </div>
        </div>

      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

function ReportTab({ label, icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-100 translate-y-[-1px]' 
        : 'text-slate-400 hover:bg-slate-50'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  )
}