'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  DollarSign, Car, Coffee, Clock, CreditCard, 
  Wallet, Activity, Zap, Target, ArrowUpRight
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResumenPage() {
  const supabase = createClient()
  const [data, setData] = useState({
    lavadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    parqueadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    inventario: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
  })

  useEffect(() => {
    fetchResumenHoy()
    const channels = ['ordenes_servicio', 'parqueadero_registros', 'ventas_productos'].map(table => 
      supabase.channel(`${table}_resumen`).on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchResumenHoy()).subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, [])

  const fetchResumenHoy = async () => {
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
  }

  const granTotal = data.lavadero.total + data.parqueadero.total + data.inventario.total
  const totalEfectivo = data.lavadero.efectivo + data.parqueadero.efectivo + data.inventario.efectivo
  const totalTransferencia = data.lavadero.transferencia + data.parqueadero.transferencia + data.inventario.transferencia

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-10 relative overflow-hidden">
      
      {/* Fondo decorativo sutil */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gorilla-orange/5 rounded-full blur-[100px] -z-10" />

      <main className="max-w-7xl mx-auto">
        
        {/* HERO: TOTAL GENERAL */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-gray-900">
              Balance <span className="text-gorilla-orange">Diario</span>
            </h1>
            <p className="text-gray-500 font-bold flex items-center gap-2 mt-2 uppercase tracking-[0.3em] text-[10px]">
              <Activity size={14} className="text-green-600 animate-pulse" /> Estado de ingresos de hoy
            </p>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-gray-200 p-8 rounded-[2rem] text-center md:text-right shadow-xl shadow-gray-200 min-w-[300px]"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">Caja Total</p>
            <p className="text-6xl font-black text-gray-900 tracking-tighter">
              ${granTotal.toLocaleString()}
            </p>
          </motion.div>
        </header>

        {/* METODOS DE PAGO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Tarjeta Efectivo */}
          <motion.div whileHover={{y:-5}} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-lg shadow-green-100 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-600 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Wallet size={16} /> Efectivo en Mano
                </p>
                <p className="text-5xl font-black text-gray-900">${totalEfectivo.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-2xl text-green-600">
                <DollarSign size={32} />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase tracking-widest">
              <Zap size={12} /> Actualizado al instante
            </div>
          </motion.div>

          {/* Tarjeta Transferencia */}
          <motion.div whileHover={{y:-5}} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-lg shadow-blue-100 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <CreditCard size={16} /> Bancos / Nequi
                </p>
                <p className="text-5xl font-black text-gray-900">${totalTransferencia.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
                <ArrowUpRight size={32} />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
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
        <footer className="mt-12 bg-white border border-gray-200 rounded-[3rem] p-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center shadow-md">
            <div className="space-y-1">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Servicios Realizados</p>
                <p className="text-4xl font-black text-gray-800">{data.lavadero.cantidad}</p>
            </div>
            <div className="space-y-1 border-y md:border-y-0 md:border-x border-gray-100 py-6 md:py-0">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vehículos en Patio</p>
                <p className="text-4xl font-black text-gray-800">{data.parqueadero.cantidad}</p>
            </div>
            <div className="space-y-1">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Productos Vendidos</p>
                <p className="text-4xl font-black text-gray-800">{data.inventario.cantidad}</p>
            </div>
        </footer>

      </main>
    </div>
  )
}

function ResumenCard({ titulo, icono, color, stats }: any) {
  const colorMap: any = {
    orange: 'bg-white text-gray-900 border-l-4 border-l-gorilla-orange',
    purple: 'bg-white text-gray-900 border-l-4 border-l-gorilla-purple',
    blue: 'bg-white text-gray-900 border-l-4 border-l-blue-500'
  }
  
  const iconBgMap: any = {
    orange: 'bg-orange-50 text-gorilla-orange',
    purple: 'bg-purple-50 text-gorilla-purple',
    blue: 'bg-blue-50 text-blue-500'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`p-8 rounded-[2rem] shadow-lg shadow-gray-200/50 ${colorMap[color]}`}
    >
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-4 rounded-2xl ${iconBgMap[color]}`}>{icono}</div>
        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-gray-800">{titulo}</h2>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-gray-100 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-black uppercase">Efectivo</span>
            <span className="font-bold text-gray-900 text-xl">${stats.efectivo.toLocaleString()}</span>
          </div>
          <Target size={14} className="opacity-20 text-gray-400" />
        </div>
        <div className="flex justify-between items-end border-b border-gray-100 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-black uppercase">Transferencia</span>
            <span className="font-bold text-gray-900 text-xl">${stats.transferencia.toLocaleString()}</span>
          </div>
          <Activity size={14} className="opacity-20 text-gray-400" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest bg-gray-100 px-3 py-1 rounded-full">Total</span>
          <span className="text-3xl font-black text-gray-900 tracking-tighter">${stats.total.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  )
}