'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Car, Coffee, Clock, CreditCard,
  Wallet, TrendingUp, ArrowUpRight
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
  }, [range])

  const fetchResumen = async () => {
    let inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    let fin = new Date()
    fin.setHours(23, 59, 59, 999)

    if (range === 'ayer') {
      inicio.setDate(inicio.getDate() - 1)
      fin.setDate(fin.getDate() - 1)
      fin.setHours(23, 59, 59)
    } else if (range === 'semana') {
      inicio.setDate(inicio.getDate() - 7)
    } else if (range === 'mes') {
      inicio.setMonth(inicio.getMonth() - 1)
    } else if (range === 'siempre') {
      inicio = new Date(2020, 0, 1)
    }

    const inicioISO = inicio.toISOString()
    const finISO = fin.toISOString()

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
    <div className="min-h-screen pt-16 lg:pt-0 bg-[#F8FAFC] text-slate-900 p-4 md:p-8 lg:p-10 pb-24 overflow-x-hidden">
      <main className="max-w-7xl mx-auto space-y-8 lg:space-y-10">

        {/* HEADER CON SELECTOR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="w-full xl:w-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría y Métricas</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Balance <span className="text-gorilla-orange">Financiero</span>
            </h1>

            <div className="mt-6 flex flex-wrap bg-white p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-sm w-fit gap-1">
              {['hoy', 'ayer', 'semana', 'mes', 'siempre'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${range === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* TARJETA RECAUDO TOTAL (Se adapta al 100% en pantallas medianas) */}
          <motion.div
            key={granTotal}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full xl:w-auto bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-lg shadow-slate-200/40 text-left xl:text-right flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-4"
          >
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recaudo Periodo</p>
              <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">${granTotal.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-500 rounded-xl xl:hidden shrink-0">
              <TrendingUp size={24} />
            </div>
          </motion.div>
        </div>

        {/* METODOS DE PAGO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PaymentCard
            title="Efectivo en Mano"
            amount={totalEfectivo}
            icon={<Wallet size={24} />}
            color="green"
            desc="Dinero físico en caja"
          />
          <PaymentCard
            title="Bancos / Nequi"
            amount={totalTransferencia}
            icon={<CreditCard size={24} />}
            color="blue"
            desc="Confirmar en app bancaria"
          />
        </div>

        {/* CATEGORÍAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <CategoryCard
            titulo="Lavadero"
            icono={<Car size={24} />}
            color="orange"
            stats={data.lavadero}
            granTotal={granTotal}
          />
          <CategoryCard
            titulo="Parqueo"
            icono={<Clock size={24} />}
            color="purple"
            stats={data.parqueadero}
            granTotal={granTotal}
          />
          <CategoryCard
            titulo="Market"
            icono={<Coffee size={24} />}
            color="blue"
            stats={data.inventario}
            granTotal={granTotal}
          />
        </div>

        {/* FOOTER STATS OSCURO */}
        <div className="bg-[#0E0C15] rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gorilla-orange/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gorilla-purple/10 rounded-full blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <StatGroup label="Servicios" value={data.lavadero.cantidad} sub="Lavados facturados" className="pt-0" />
            <StatGroup label="Estancia" value={data.parqueadero.cantidad} sub="Vehículos" className="pt-8 md:pt-0" />
            <StatGroup label="Market" value={data.inventario.cantidad} sub="Ventas de mostrador" className="pt-8 md:pt-0" />
          </div>
        </div>

      </main>
    </div>
  )
}

// ---------------- SUB COMPONENTES ----------------

function PaymentCard({ title, amount, icon, color, desc }: any) {
  const isGreen = color === 'green'
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.04] transition-transform duration-500 group-hover:scale-150 ${isGreen ? 'bg-green-600' : 'bg-blue-600'}`} />

      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isGreen ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
            {icon}
          </div>
          <div>
            <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isGreen ? 'text-green-600' : 'text-blue-600'}`}>{title}</p>
            <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">${amount.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{desc}</p>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border ${isGreen ? 'border-green-100 text-green-500 bg-green-50' : 'border-blue-100 text-blue-500 bg-blue-50'}`}>
          <ArrowUpRight size={20} strokeWidth={3} />
        </div>
      </div>
    </motion.div>
  )
}

function CategoryCard({ titulo, icono, color, stats, granTotal }: any) {
  const porc = granTotal > 0 ? (stats.total / granTotal) * 100 : 0

  const colors: any = {
    orange: { bg: 'bg-orange-50', text: 'text-gorilla-orange', fill: 'bg-gorilla-orange' },
    purple: { bg: 'bg-purple-50', text: 'text-gorilla-purple', fill: 'bg-gorilla-purple' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-500', fill: 'bg-blue-500' }
  }
  const c = colors[color]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all"
    >
      <div>
        <div className="flex justify-between items-start mb-8">
          <div className={`p-3.5 rounded-xl ${c.bg} ${c.text} group-hover:scale-110 transition-transform`}>
            {icono}
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Participación</span>
            <p className="text-xl font-black text-slate-900 leading-none">{porc.toFixed(0)}%</p>
          </div>
        </div>

        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800 mb-6">{titulo}</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Efectivo</span>
            <span className="font-black text-sm text-slate-900">${stats.efectivo.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Transf.</span>
            <span className="font-black text-sm text-slate-900">${stats.transferencia.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Área</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">${stats.total.toLocaleString()}</span>
        </div>
        {/* Barra de progreso sutil */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${porc}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${c.fill} rounded-full`}
          />
        </div>
      </div>
    </motion.div>
  )
}

function StatGroup({ label, value, sub, className = '' }: any) {
  return (
    <div className={`text-center flex flex-col items-center justify-center ${className}`}>
      <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2">{label}</p>
      <p className="text-5xl font-black text-white tracking-tighter leading-none">{value}</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">{sub}</p>
    </div>
  )
}