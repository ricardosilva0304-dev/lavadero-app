'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, FileText, Calendar, User, Car, DollarSign, Tag } from 'lucide-react'
import { motion } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function HistorialPage() {
  const supabase = createClient()
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchHistorial()
  }, [])

  const fetchHistorial = async () => {
    // Traemos las ordenes incluyendo el nombre del cliente y del empleado
    const { data } = await supabase
      .from('ordenes_servicio')
      .select(`
        *,
        clientes (nombre),
        perfiles (nombre)
      `)
      .order('creado_en', { ascending: false })
    
    setOrdenes(data || [])
  }

  const filtered = ordenes.filter(o => o.placa.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black italic uppercase text-gray-900">
          Historial <span className="text-gorilla-orange">Total</span>
        </h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            placeholder="BUSCAR POR PLACA..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gorilla-orange shadow-sm font-bold uppercase"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-4">
        {filtered.map((o) => (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            key={o.id} 
            className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-4 gap-6 items-center"
          >
            <div className="flex items-center gap-4 border-r border-gray-100 pr-4">
              <div className="bg-orange-50 p-3 rounded-2xl text-gorilla-orange"><Car size={24}/></div>
              <div>
                <p className="text-2xl font-black tracking-tighter text-gray-900 leading-none">{o.placa}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                  {new Date(o.creado_en).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase">
                <User size={14} className="text-gorilla-purple" /> {o.clientes?.nombre || 'General'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                <Tag size={14} /> {o.nombres_servicios}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                Operador: <span className="text-gray-900">{o.perfiles?.nombre || '---'}</span>
              </div>
              <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${o.metodo_pago === 'efectivo' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                {o.metodo_pago}
              </span>
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-2xl font-black text-gray-900 leading-none">${Number(o.total).toLocaleString()}</p>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Pagado</span>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  )
}