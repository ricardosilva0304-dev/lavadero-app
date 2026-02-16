'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  FileText, Package, Clock, BarChart3, 
  Search, Printer, ChevronRight, DollarSign,
  Car, Coffee, History, Filter
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

  // Filtro inteligente según la placa o nombre del producto
  const dataFiltrada = data.filter(item => {
    const textoBusqueda = filtro.toLowerCase()
    return (
      (item.placa?.toLowerCase().includes(textoBusqueda)) ||
      (item.nombre?.toLowerCase().includes(textoBusqueda)) ||
      (item.nombres_servicios?.toLowerCase().includes(textoBusqueda))
    )
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-12 bg-gorilla-purple rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Data & Auditoría</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Reportes <span className="text-gorilla-purple">Flash</span>
            </h1>
          </div>

          <div className="flex bg-white p-1.5 rounded-[2rem] shadow-xl border border-slate-100 w-full md:w-auto">
            <ReportTab label="Servicios" icon={<FileText size={16}/>} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
            <ReportTab label="Inventario" icon={<Package size={16}/>} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
            <ReportTab label="Parqueo" icon={<Clock size={16}/>} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
          </div>
        </header>

        {/* BARRA DE BÚSQUEDA Y ACCIONES */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-gorilla-purple transition-colors" size={20} />
                <input 
                    placeholder="Filtrar por placa, servicio o producto..." 
                    className="w-full bg-white border border-slate-200 p-5 pl-14 rounded-3xl outline-none focus:ring-4 focus:ring-purple-500/10 font-bold shadow-sm transition-all"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                />
            </div>
            <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-8 py-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95"
            >
                <Printer size={20}/> IMPRIMIR VISTA
            </button>
        </div>

        {/* VISTA PREVIA DE DATOS */}
        <main className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            {activeTab === 'ventas' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha/Placa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicios Realizados</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Operador</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                                </>
                            )}
                            {activeTab === 'inventario' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Producto</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stock</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Precio Venta</th>
                                </>
                            )}
                            {activeTab === 'parqueadero' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Salida/Placa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo Tarifa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pago</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black italic animate-pulse">Cargando base de datos...</td></tr>
                        ) : dataFiltrada.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase italic">No se encontraron resultados</td></tr>
                        ) : (
                            dataFiltrada.map((item) => (
                                <motion.tr 
                                    initial={{opacity:0}} animate={{opacity:1}}
                                    key={item.id} className="hover:bg-slate-50 transition-colors group"
                                >
                                    {activeTab === 'ventas' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none">{item.placa}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(item.creado_en).toLocaleString()}</p>
                                            </td>
                                            <td className="p-6 text-xs font-bold text-slate-500 uppercase italic">{item.nombres_servicios}</td>
                                            <td className="p-6 text-xs font-black text-slate-900">{item.perfiles?.nombre || 'General'}</td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg">${Number(item.total).toLocaleString()}</td>
                                        </>
                                    )}
                                    {activeTab === 'inventario' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none">{item.nombre}</p>
                                                <p className={`text-[10px] font-bold uppercase mt-1 ${item.stock <= item.stock_minimo ? 'text-red-500' : 'text-slate-400'}`}>Stock Mín: {item.stock_minimo}</p>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-4 py-1.5 rounded-full font-black text-xs ${item.stock <= item.stock_minimo ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                    {item.stock} UNIDADES
                                                </span>
                                            </td>
                                            <td className="p-6 text-xs font-black text-slate-400 uppercase">{item.categoria}</td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg">${Number(item.precio_venta).toLocaleString()}</td>
                                        </>
                                    )}
                                    {activeTab === 'parqueadero' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none">{item.placa}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(item.hora_salida).toLocaleString()}</p>
                                            </td>
                                            <td className="p-6 text-xs font-black text-slate-400 uppercase italic">{item.tipo_tarifa || 'HORA'}</td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.metodo_pago === 'efectivo' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {item.metodo_pago}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg">${Number(item.total_pagar).toLocaleString()}</td>
                                        </>
                                    )}
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </main>

        {/* SNAPSHOT RESUMEN INFERIOR */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Recuento de Filas</p>
                    <p className="text-3xl font-black text-slate-900">{dataFiltrada.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-400"><History size={24}/></div>
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
      className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${
        active 
        ? 'bg-gorilla-purple text-white shadow-xl shadow-purple-200 translate-y-[-2px]' 
        : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon} {label}
    </button>
  )
}