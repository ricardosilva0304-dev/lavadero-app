'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Car, Coffee, Clock, CreditCard,
  Wallet, TrendingUp, ArrowUpRight, RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResumenPage() {
  const supabase = createClient()
  const [range, setRange] = useState('hoy')
  const [data, setData] = useState({
    lavadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    parqueadero: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 },
    inventario: { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // ── Utilidad: fecha local YYYY-MM-DD sin desfase UTC ──────────────────────
  const toLocalDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const fetchResumen = useCallback(async () => {
    setLoading(true)

    const hoy = new Date()
    let startDate = new Date(hoy)
    let endDate = new Date(hoy)

    if (range === 'ayer') {
      startDate.setDate(hoy.getDate() - 1)
      endDate.setDate(hoy.getDate() - 1)
    } else if (range === 'semana') {
      startDate.setDate(hoy.getDate() - 6)
    } else if (range === 'mes') {
      startDate.setDate(hoy.getDate() - 29)
    } else if (range === 'siempre') {
      startDate = new Date(2020, 0, 1)
      endDate = new Date(2099, 11, 31)
    }

    const inicioISO = `${toLocalDate(startDate)}T00:00:00`
    const finISO = `${toLocalDate(endDate)}T23:59:59`

    const [lav, par, inv] = await Promise.all([
      supabase.from('ordenes_servicio')
        .select('total, metodo_pago')
        .gte('creado_en', inicioISO).lte('creado_en', finISO),
      supabase.from('parqueadero_registros')
        .select('total_pagar, metodo_pago')
        .eq('estado', 'finalizado')
        .gte('hora_salida', inicioISO).lte('hora_salida', finISO),
      supabase.from('ventas_productos')
        .select('total, metodo_pago')
        .gte('creado_en', inicioISO).lte('creado_en', finISO)
    ])

    const calcular = (lista: any[] | null, campo: string) => {
      if (!lista || lista.length === 0)
        return { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
      return lista.reduce(
        (acc, curr) => {
          const monto = parseFloat(curr[campo]) || 0
          acc.total += monto
          if (curr.metodo_pago === 'efectivo') acc.efectivo += monto
          else if (curr.metodo_pago === 'transferencia') acc.transferencia += monto
          acc.cantidad++
          return acc
        },
        { total: 0, efectivo: 0, transferencia: 0, cantidad: 0 }
      )
    }

    setData({
      lavadero: calcular(lav.data, 'total'),
      parqueadero: calcular(par.data, 'total_pagar'),
      inventario: calcular(inv.data, 'total')
    })
    setLastUpdate(new Date())
    setLoading(false)
  }, [range])

  // ── Carga inicial y cuando cambia el rango ────────────────────────────────
  useEffect(() => { fetchResumen() }, [fetchResumen])

  // ── Tiempo real: escucha las 3 tablas relevantes ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('resumen_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchResumen())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parqueadero_registros' }, () => fetchResumen())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_productos' }, () => fetchResumen())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchResumen])

  // ── Totales globales ──────────────────────────────────────────────────────
  const granTotal = data.lavadero.total + data.parqueadero.total + data.inventario.total
  const totalEfectivo = data.lavadero.efectivo + data.parqueadero.efectivo + data.inventario.efectivo
  const totalTransferencia = data.lavadero.transferencia + data.parqueadero.transferencia + data.inventario.transferencia

  const rangeLabels: Record<string, string> = {
    hoy: 'Hoy', ayer: 'Ayer', semana: 'Últimos 7 días',
    mes: 'Últimos 30 días', siempre: 'Todo el tiempo'
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:px-10 pb-24 overflow-x-hidden">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <main className="max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10">

        {/* HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría y Métricas</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                Balance <span className="text-gorilla-orange">Financiero</span>
              </h1>
            </div>

            {/* Indicador de tiempo real + botón refresh manual */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">En vivo</span>
              </div>
              <button
                onClick={fetchResumen}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                title="Actualizar ahora"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filtros de rango */}
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar bg-white p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-sm gap-1 w-full">
            {(['hoy', 'ayer', 'semana', 'mes', 'siempre'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`shrink-0 px-4 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${range === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* GRAN TOTAL ──────────────────────────────────────────────────────── */}
        <motion.div
          key={granTotal}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#0E0C15] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden border border-slate-800 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gorilla-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gorilla-purple/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Recaudo · {rangeLabels[range]}
              </p>
              {loading ? (
                <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse" />
              ) : (
                <p className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  ${granTotal.toLocaleString('es-CO')}
                </p>
              )}
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">
                Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl w-fit">
              <TrendingUp size={28} />
            </div>
          </div>
        </motion.div>

        {/* MÉTODOS DE PAGO ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <PaymentCard title="Efectivo en Mano" amount={totalEfectivo} icon={<Wallet size={24} />} color="green" desc="Dinero físico en caja" loading={loading} />
          <PaymentCard title="Bancos / Nequi" amount={totalTransferencia} icon={<CreditCard size={24} />} color="blue" desc="Confirmar en app bancaria" loading={loading} />
        </div>

        {/* CATEGORÍAS ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <CategoryCard titulo="Lavadero" icono={<Car size={22} />} color="orange" stats={data.lavadero} granTotal={granTotal} loading={loading} />
          <CategoryCard titulo="Parqueo" icono={<Clock size={22} />} color="purple" stats={data.parqueadero} granTotal={granTotal} loading={loading} />
          <CategoryCard titulo="Market" icono={<Coffee size={22} />} color="blue" stats={data.inventario} granTotal={granTotal} loading={loading} />
        </div>

        {/* FOOTER STATS ────────────────────────────────────────────────────── */}
        <div className="bg-[#0E0C15] rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gorilla-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            <StatGroup label="Servicios" value={data.lavadero.cantidad} sub="Lavados facturados" />
            <StatGroup label="Estancia" value={data.parqueadero.cantidad} sub="Vehículos parqueados" />
            <StatGroup label="Market" value={data.inventario.cantidad} sub="Ventas de mostrador" />
          </div>
        </div>

      </main>
    </div>
  )
}

// ── SUB COMPONENTES ──────────────────────────────────────────────────────────

function PaymentCard({ title, amount, icon, color, desc, loading }: any) {
  const isGreen = color === 'green'
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white border border-slate-200/60 p-6 sm:p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.04] transition-transform duration-500 group-hover:scale-150 ${isGreen ? 'bg-green-600' : 'bg-blue-600'}`} />
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isGreen ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{icon}</div>
          <div>
            <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isGreen ? 'text-green-600' : 'text-blue-600'}`}>{title}</p>
            {loading
              ? <div className="h-10 w-32 bg-slate-100 rounded-lg animate-pulse" />
              : <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">${amount.toLocaleString('es-CO')}</p>
            }
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{desc}</p>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border shrink-0 ${isGreen ? 'border-green-100 text-green-500 bg-green-50' : 'border-blue-100 text-blue-500 bg-blue-50'}`}>
          <ArrowUpRight size={20} strokeWidth={3} />
        </div>
      </div>
    </motion.div>
  )
}

function CategoryCard({ titulo, icono, color, stats, granTotal, loading }: any) {
  const porc = granTotal > 0 ? Math.round((stats.total / granTotal) * 100) : 0
  const colors: any = {
    orange: { bg: 'bg-orange-50', text: 'text-gorilla-orange', fill: 'bg-gorilla-orange' },
    purple: { bg: 'bg-purple-50', text: 'text-gorilla-purple', fill: 'bg-gorilla-purple' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-500', fill: 'bg-blue-500' }
  }
  const c = colors[color]
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200/60 p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-xl ${c.bg} ${c.text} group-hover:scale-110 transition-transform shrink-0`}>{icono}</div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Participación</span>
            <p className="text-xl font-black text-slate-900 leading-none">{porc}%</p>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-slate-800 mb-5">{titulo}</h2>
        <div className="space-y-2.5">
          {[['Efectivo', stats.efectivo], ['Transferencia', stats.transferencia]].map(([label, val]: any) => (
            <div key={label} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{label}</span>
              {loading
                ? <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                : <span className="font-black text-sm text-slate-900">${val.toLocaleString('es-CO')}</span>
              }
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Área</span>
          {loading
            ? <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
            : <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none">${stats.total.toLocaleString('es-CO')}</span>
          }
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${porc}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full ${c.fill} rounded-full`} />
        </div>
      </div>
    </motion.div>
  )
}

function StatGroup({ label, value, sub }: any) {
  return (
    <div className="text-center flex flex-col items-center justify-center py-2 sm:py-0 sm:px-6">
      <p className="text-[10px] font-black text-gorilla-orange uppercase tracking-[0.3em] mb-2">{label}</p>
      <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">{value}</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">{sub}</p>
    </div>
  )
}