'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, Download, Package, AlertTriangle, 
  TrendingUp, ArrowDownCircle, FileSpreadsheet, Printer
} from 'lucide-react'
import { motion } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ReportesPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<any[]>([])
  const [stats, setStats] = useState({ valorInventario: 0, itemsBajos: 0 })

  useEffect(() => {
    fetchInventoryReport()
  }, [])

  const fetchInventoryReport = async () => {
    const { data } = await supabase.from('productos').select('*').order('stock')
    if (data) {
      const valor = data.reduce((acc, p) => acc + (p.precio_venta * p.stock), 0)
      const bajos = data.filter(p => p.stock <= p.stock_minimo).length
      setProductos(data)
      setStats({ valorInventario: valor, itemsBajos: bajos })
    }
  }

  const exportarCSV = () => {
    const encabezados = ["Producto", "Stock", "Precio Venta", "Valor Total"]
    const filas = productos.map(p => [p.nombre, p.stock, p.precio_venta, p.stock * p.precio_venta])
    const csvContent = "data:text/csv;charset=utf-8," + [encabezados, ...filas].map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `inventario_gorilla_${new Date().toLocaleDateString()}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase text-gray-900 tracking-tighter">
              Auditoría & <span className="text-gorilla-purple">Reportes</span>
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Control de activos e inventario</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 shadow-sm transition-all"
          >
            <Printer size={16}/> Imprimir Snapshot
          </button>
        </header>

        {/* RESUMEN DE INVENTARIO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-gorilla-purple mb-4">
              <Package size={24}/>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor en Estantería</p>
            <p className="text-4xl font-black text-gray-900">${stats.valorInventario.toLocaleString()}</p>
          </motion.div>

          <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.1}} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle size={24}/>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items por Agotarse</p>
            <p className="text-4xl font-black text-gray-900">{stats.itemsBajos}</p>
          </motion.div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={exportarCSV}
              className="flex-1 bg-gray-900 text-white rounded-[2rem] p-6 flex items-center justify-center gap-4 hover:bg-black transition-all shadow-xl group"
            >
              <div className="bg-white/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={24}/>
              </div>
              <div className="text-left">
                <p className="font-black italic uppercase leading-none">Exportar CSV</p>
                <p className="text-[9px] text-gray-400 uppercase font-bold mt-1 tracking-widest">Excel / Google Sheets</p>
              </div>
            </button>
          </div>
        </div>

        {/* TABLA DE INVENTARIO ACTUAL */}
        <div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-black italic uppercase tracking-tighter text-gray-800 flex items-center gap-2 text-xl">
              <BarChart3 size={20} className="text-gorilla-purple" /> Estado de Existencias
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Producto</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Stock Actual</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Precio Venta</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Estado</th>
                  <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Inversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6">
                      <p className="font-black text-gray-800 uppercase text-xs italic">{p.nombre}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{p.categoria}</p>
                    </td>
                    <td className="p-6 font-black text-sm">{p.stock}</td>
                    <td className="p-6 font-bold text-gray-500 text-sm">${p.precio_venta.toLocaleString()}</td>
                    <td className="p-6">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${p.stock <= p.stock_minimo ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                         {p.stock <= p.stock_minimo ? 'Comprar' : 'Ok'}
                       </span>
                    </td>
                    <td className="p-6 font-black text-gray-900 text-sm">${(p.precio_venta * p.stock).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}