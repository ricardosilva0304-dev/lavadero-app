'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  FileText, Package, Clock, 
  Search, Printer, History
} from 'lucide-react'
import { motion } from 'framer-motion'

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
      (item.nombres_servicios?.toLowerCase().includes(textoBusqueda))
    )
  })

  // Cálculo de totales para el reporte impreso
  const totalMonto = dataFiltrada.reduce((acc, item) => acc + (Number(item.total || item.total_pagar || 0)), 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white text-slate-900 p-4 md:p-10 pb-20">
      
      {/* ESTILOS DE IMPRESIÓN (Inyectados para manejar márgenes de página) */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: auto;
          }
          body {
            background-color: white !important;
          }
          nav, .no-print, button, .search-bar {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .card-container {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        
        {/* ENCABEZADO DE PANTALLA (Se oculta en impresión) */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-12 bg-purple-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Data & Auditoría</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Reportes <span className="text-purple-600">Flash</span>
            </h1>
          </div>

          <div className="flex bg-white p-1.5 rounded-[2rem] shadow-xl border border-slate-100 w-full md:w-auto">
            <ReportTab label="Servicios" icon={<FileText size={16}/>} active={activeTab === 'ventas'} onClick={() => setActiveTab('ventas')} />
            <ReportTab label="Inventario" icon={<Package size={16}/>} active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
            <ReportTab label="Parqueo" icon={<Clock size={16}/>} active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} />
          </div>
        </header>

        {/* ENCABEZADO EXCLUSIVO PARA IMPRESIÓN */}
        <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">GORILLA FLASH - REPORTE</h1>
              <p className="text-sm font-bold text-slate-500 uppercase">Tipo: {activeTab} | Registros: {dataFiltrada.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-bold">Fecha de emisión</p>
              <p className="text-sm font-black">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA (Se oculta en impresión) */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 print:hidden">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                    placeholder="Filtrar por placa, servicio o producto..." 
                    className="w-full bg-white border border-slate-200 p-5 pl-14 rounded-3xl outline-none font-bold shadow-sm"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                />
            </div>
            <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white px-8 py-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all"
            >
                <Printer size={20}/> IMPRIMIR REPORTE
            </button>
        </div>

        {/* CONTENEDOR DE TABLA */}
        <main className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden card-container">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                            {activeTab === 'ventas' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Fecha/Placa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Servicios Realizados</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Operador</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right print:text-black">Total</th>
                                </>
                            )}
                            {activeTab === 'inventario' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Producto</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black text-center">Stock</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Categoría</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right print:text-black">Precio Venta</th>
                                </>
                            )}
                            {activeTab === 'parqueadero' && (
                                <>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Salida/Placa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Tipo Tarifa</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Pago</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right print:text-black">Total</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                        {loading ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black italic">Cargando base de datos...</td></tr>
                        ) : dataFiltrada.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase italic">No se encontraron resultados</td></tr>
                        ) : (
                            dataFiltrada.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                                    {activeTab === 'ventas' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none print:text-base">{item.placa}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 print:text-slate-600">{new Date(item.creado_en).toLocaleString()}</p>
                                            </td>
                                            <td className="p-6 text-xs font-bold text-slate-500 uppercase italic print:text-slate-700">{item.nombres_servicios}</td>
                                            <td className="p-6 text-xs font-black text-slate-900">{item.perfiles?.nombre || 'General'}</td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg print:text-base">${Number(item.total).toLocaleString()}</td>
                                        </>
                                    )}
                                    {activeTab === 'inventario' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none print:text-base">{item.nombre}</p>
                                                <p className={`text-[10px] font-bold uppercase mt-1 ${item.stock <= item.stock_minimo ? 'text-red-500' : 'text-slate-400'}`}>Stock Mín: {item.stock_minimo}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full font-black text-xs print:p-0 ${item.stock <= item.stock_minimo ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {item.stock} UNIDADES
                                                </span>
                                            </td>
                                            <td className="p-6 text-xs font-black text-slate-400 uppercase print:text-slate-700">{item.categoria}</td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg print:text-base">${Number(item.precio_venta).toLocaleString()}</td>
                                        </>
                                    )}
                                    {activeTab === 'parqueadero' && (
                                        <>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 text-lg tracking-tighter leading-none print:text-base">{item.placa}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 print:text-slate-600">{new Date(item.hora_salida).toLocaleString()}</p>
                                            </td>
                                            <td className="p-6 text-xs font-black text-slate-400 uppercase italic print:text-slate-700">{item.tipo_tarifa || 'HORA'}</td>
                                            <td className="p-6">
                                                <span className="text-[10px] font-black uppercase text-slate-900">
                                                    {item.metodo_pago}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right font-black text-slate-900 text-lg print:text-base">${Number(item.total_pagar).toLocaleString()}</td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* RESUMEN FINAL PARA LA IMPRESIÓN */}
            <div className="hidden print:flex justify-end p-8 bg-slate-50 border-t border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total del Reporte</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">${totalMonto.toLocaleString()}</p>
              </div>
            </div>
        </main>

        {/* SNAPSHOT RESUMEN INFERIOR (Solo pantalla) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Recuento de Filas</p>
                    <p className="text-3xl font-black text-slate-900">{dataFiltrada.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-400"><History size={24}/></div>
            </div>
            {/* Widget de total acumulado visible en pantalla también */}
            <div className="bg-purple-600 p-6 rounded-[2rem] shadow-lg flex items-center justify-between text-white">
                <div>
                    <p className="text-[10px] font-black opacity-80 uppercase">Total Seleccionado</p>
                    <p className="text-3xl font-black">${totalMonto.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl"><Printer size={24}/></div>
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
        ? 'bg-purple-600 text-white shadow-xl shadow-purple-200 translate-y-[-2px]' 
        : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon} {label}
    </button>
  )
}