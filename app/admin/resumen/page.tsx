'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  DollarSign, Car, Coffee, Clock, CreditCard, 
  Wallet, Activity, Zap, ArrowUpRight, TrendingUp, 
  Calendar as CalendarIcon, ChevronDown
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResumenPage() {
  const supabase = createClient()
  const [range, setRange] = useState('hoy') // hoy, ayer, semana, mes, siempre
  const [data, setData] = useState({
    lavadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    parqueadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    inventario: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
  })

  useEffect(() => {
    fetchResumen()
  }, [range]) // Se recarga cada vez que cambias el filtro

  const fetchResumen = async () => {
    let inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    let fin = new Date()
    fin.setHours(23, 59, 59, 999)

    if (range === 'ayer') {
      inicio.setDate(inicio.getDate() - 1)
      fin.setDate(fin.getDate() - 1)
      fin.setHours(23,59,59)
    } else if (range === 'semana') {
      inicio.setDate(inicio.getDate() - 7)
    } else if (range === 'mes') {
      inicio.setMonth(inicio.getMonth() - 1)
    } else if (range === 'siempre') {
      inicio = new Date(2020, 0, 1)
    }

    const inicioISO = inicio.toISOString()
    const finISO = fin.toISOString()

    // Consultas con rango dinámico
    const [lav, par, inv] = await Promise.all([
      supabase.from('ordenes_servicio').select('*').gte('creado_en', inicioISO).lte('creado_en', finISO),
      supabase.from('parqueadero_registros').select('*').eq('estado', 'finalizado').gte('hora_salida', inicioISO).lte('hora_salida', finISO),
      supabase.from('ventas_productos').select('*').gte('creado_en', inicioISO).lte('creado_en', finISO)
    ])

    const calcular = (lista: any[], campoTotal: string) => {
      return lista?.reduce((acc, curr) => {
        const monto = Number(curr[campoTotal] || 0)
        acc.total += monto
        if (curr.metodo_pago === 'efectivo') acc.efectivo += monto
        else acc.transferencia += monto
        acc.cantidad++
        return acc
      }, { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 })
    }

    setData({
      lavadero: calcular(lav.data || [], 'total'),
      parqueadero: calcular(par.data || [], 'total_pagar'),
      inventario: calcular(inv.data || [], 'total')
    })
  }

  const granTotal = data.lavadero.total + data.parqueadero.total + data.inventario.total
  const totalEfectivo = data.lavadero.efectivo + data.parqueadero.efectivo + data.inventario.efectivo
  const totalTransferencia = data.lavadero.transferencia + data.parqueadero.transferencia + data.inventario.transferencia

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-800 p-6 md:p-10">
      <main className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER CON SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase">
              Balance <span className="text-gorilla-orange italic">Financiero</span>
            </h1>
            <div className="mt-4 flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm w-fit">
               {['hoy', 'ayer', 'semana', 'mes', 'siempre'].map((r) => (
                 <button 
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${range === r ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   {r}
                 </button>
               ))}
            </div>
          </div>

          <motion.div 
            key={granTotal}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-gray-200 p-8 rounded-3xl shadow-2xl shadow-gray-200/50 text-right min-w-[280px]"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center md:text-right">Recaudo Periodo</p>
            <p className="text-5xl font-black text-gray-900 tracking-tighter">${granTotal.toLocaleString()}</p>
          </motion.div>
        </div>

        {/* METODOS DE PAGO - Estilo Neomorfista Suave */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PaymentCard 
            title="Efectivo en Mano" 
            amount={totalEfectivo} 
            icon={<Wallet />} 
            color="green" 
            desc="Dinero físico en caja"
          />
          <PaymentCard 
            title="Bancos / Nequi" 
            amount={totalTransferencia} 
            icon={<CreditCard />} 
            color="blue" 
            desc="Confirmar en app bancaria"
          />
        </div>

        {/* CATEGORÍAS - Con Barras de Porcentaje */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CategoryCard 
            titulo="Lavadero" 
            icono={<Car />} 
            color="orange" 
            stats={data.lavadero} 
            granTotal={granTotal}
          />
          <CategoryCard 
            titulo="Parqueo" 
            icono={<Clock />} 
            color="purple" 
            stats={data.parqueadero} 
            granTotal={granTotal}
          />
          <CategoryCard 
            titulo="Market" 
            icono={<Coffee />} 
            color="blue" 
            stats={data.inventario} 
            granTotal={granTotal}
          />
        </div>

        {/* FOOTER STATS */}
        <div className="bg-gray-900 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden">
          <div className="bg-white/5 backdrop-blur-md rounded-[2.3rem] p-10 flex flex-col md:flex-row justify-around items-center gap-8 border border-white/10">
            <StatGroup label="Servicios" value={data.lavadero.cantidad} sub="Lavados hoy" />
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <StatGroup label="Estancia" value={data.parqueadero.cantidad} sub="Vehículos" />
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <StatGroup label="Market" value={data.inventario.cantidad} sub="Ventas" />
          </div>
        </div>

      </main>
    </div>
  )
}

function PaymentCard({ title, amount, icon, color, desc }: any) {
  const isGreen = color === 'green'
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/40 relative group overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform group-hover:scale-110 ${isGreen ? 'bg-green-600' : 'bg-blue-600'}`} />
      
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isGreen ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
            {icon}
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-widest ${isGreen ? 'text-green-600' : 'text-blue-600'}`}>{title}</p>
            <p className="text-5xl font-black text-gray-900 tracking-tighter">${amount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">{desc}</p>
          </div>
        </div>
        <div className={`p-2 rounded-full border ${isGreen ? 'border-green-100 text-green-200' : 'border-blue-100 text-blue-200'}`}>
           <ArrowUpRight size={20} />
        </div>
      </div>
    </motion.div>
  )
}

function CategoryCard({ titulo, icono, color, stats, granTotal }: any) {
  const porc = granTotal > 0 ? (stats.total / granTotal) * 100 : 0
  
  const colors: any = {
    orange: 'text-gorilla-orange bg-orange-50 border-gorilla-orange',
    purple: 'text-gorilla-purple bg-purple-50 border-gorilla-purple',
    blue: 'text-blue-500 bg-blue-50 border-blue-500'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50 flex flex-col justify-between group"
    >
      <div>
        <div className="flex justify-between items-center mb-8">
          <div className={`p-4 rounded-[1.5rem] ${colors[color].split(' ').slice(0, 2).join(' ')} group-hover:scale-110 transition-transform`}>
            {icono}
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Participación</span>
            <p className="text-lg font-black text-gray-900">{porc.toFixed(0)}%</p>
          </div>
        </div>

        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-gray-800 mb-6">{titulo}</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Efectivo</span>
            <span className="font-bold text-gray-900">${stats.efectivo.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Transf.</span>
            <span className="font-bold text-gray-900">${stats.transferencia.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-50">
        <div className="flex justify-between items-end mb-2">
           <span className="text-[10px] font-black uppercase text-gray-400">Total Área</span>
           <span className="text-3xl font-black text-gray-900 tracking-tighter">${stats.total.toLocaleString()}</span>
        </div>
        {/* Barra de progreso sutil */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${porc}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${colors[color].split(' ')[1].replace('bg-', 'bg-').replace('-50', '-500')}`}
          />
        </div>
      </div>
    </motion.div>
  )
}

function StatGroup({ label, value, sub }: any) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-1">{label}</p>
      <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
      <p className="text-[9px] text-white/30 font-bold uppercase mt-1">{sub}</p>
    </div>
  )
}