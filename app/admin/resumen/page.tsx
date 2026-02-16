'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  DollarSign, Car, Coffee, Clock, CreditCard, 
  Wallet, TrendingUp, Calendar as CalendarIcon, 
  ArrowUpRight, Target, Activity, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResumenPage() {
  const supabase = createClient()
  const [data, setData] = useState({
    lavadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    parqueadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    inventario: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResumenHoy()
    const channels = ['ordenes_servicio', 'parqueadero_registros', 'ventas_productos'].map(table => 
      supabase.channel(`${table}_resumen`).on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchResumenHoy()).subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, [])

  const fetchResumenHoy = async () => {
    setLoading(true)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyISO = hoy.toISOString()

    const [lav, par, inv] = await Promise.all([
      supabase.from('ordenes_servicio').select('*').gte('creado_en', hoyISO),
      supabase.from('parqueadero_registros').select('*').eq('estado', 'finalizado').gte('hora_salida', hoyISO),
      supabase.from('ventas_productos').select('*').gte('creado_en', hoyISO)
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
    setLoading(false)
  }

  const granTotal = data.lavadero.total + data.parqueadero.total + data.inventario.total
  const totalEfectivo = data.lavadero.efectivo + data.parqueadero.efectivo + data.inventario.efectivo
  const totalTransferencia = data.lavadero.transferencia + data.parqueadero.transferencia + data.inventario.transferencia

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-gorilla-orange/10 rounded-full blur-[150px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-gorilla-purple/10 rounded-full blur-[120px] -z-10" />

      <main className="max-w-7xl mx-auto">
        
        {/* HERO: TOTAL GENERAL */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              Balance <span className="text-gorilla-orange text-6xl">Realtime</span>
            </h1>
            <p className="text-gray-500 font-bold flex items-center gap-2 mt-2 uppercase tracking-[0.3em] text-[10px]">
              <Activity size={14} className="text-green-500 animate-pulse" /> Estado de ingresos de hoy
            </p>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] text-center md:text-right relative overflow-hidden group min-w-[300px]"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-gorilla-orange/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">Caja Total</p>
            <p className="text-6xl font-black text-white tracking-tighter">
              ${granTotal.toLocaleString()}
            </p>
          </motion.div>
        </header>

        {/* METODOS DE PAGO: DISEÑO NEÓN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div whileHover={{y:-5}} className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-500 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Wallet size={16} /> Efectivo en Mano
                </p>
                <p className="text-5xl font-black">${totalEfectivo.toLocaleString()}</p>
              </div>
              <div className="bg-green-500/20 p-4 rounded-2xl text-green-500">
                <DollarSign size={32} />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-green-500/60 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={12} /> Actualizado al instante
            </div>
          </motion.div>

          <motion.div whileHover={{y:-5}} className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <CreditCard size={16} /> Bancos / Transferencias
                </p>
                <p className="text-5xl font-black">${totalTransferencia.toLocaleString()}</p>
              </div>
              <div className="bg-blue-500/20 p-4 rounded-2xl text-blue-400">
                <ArrowUpRight size={32} />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-blue-400/60 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={12} /> Confirmado vía Web
            </div>
          </motion.div>
        </div>

        {/* DETALLE POR UNIDAD DE NEGOCIO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ResumenCard titulo="Lavadero" icono={<Car />} color="orange" stats={data.lavadero} />
          <ResumenCard titulo="Parqueo" icono={<Clock />} color="purple" stats={data.parqueadero} />
          <ResumenCard titulo="Market" icono={<Coffee />} color="blue" stats={data.inventario} />
        </div>

        {/* CONTADORES DE VOLUMEN */}
        <footer className="mt-12 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-1">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Servicios Realizados</p>
                <p className="text-4xl font-black text-white">{data.lavadero.cantidad}</p>
            </div>
            <div className="space-y-1 border-y md:border-y-0 md:border-x border-white/5 py-6 md:py-0">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Vehículos en Patio</p>
                <p className="text-4xl font-black text-white">{data.parqueadero.cantidad}</p>
            </div>
            <div className="space-y-1">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Productos Vendidos</p>
                <p className="text-4xl font-black text-white">{data.inventario.cantidad}</p>
            </div>
        </footer>

      </main>
    </div>
  )
}

function ResumenCard({ titulo, icono, color, stats }: any) {
  const colorMap: any = {
    orange: 'from-gorilla-orange/20 to-transparent border-gorilla-orange/20 text-gorilla-orange',
    purple: 'from-gorilla-purple/20 to-transparent border-gorilla-purple/20 text-gorilla-purple',
    blue: 'from-blue-500/20 to-transparent border-blue-500/20 text-blue-400'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-b border p-8 rounded-[2.5rem] relative overflow-hidden group ${colorMap[color]}`}
    >
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">{icono}</div>
        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">{titulo}</h2>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-black uppercase">Efectivo</span>
            <span className="font-bold text-white text-xl">${stats.efectivo.toLocaleString()}</span>
          </div>
          <Target size={14} className="opacity-20" />
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-black uppercase">Transferencia</span>
            <span className="font-bold text-white text-xl">${stats.transferencia.toLocaleString()}</span>
          </div>
          <Activity size={14} className="opacity-20" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-[10px] font-black uppercase text-white tracking-widest bg-white/5 px-3 py-1 rounded-full">Subtotal Area</span>
          <span className="text-3xl font-black text-white tracking-tighter">${stats.total.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  )
}