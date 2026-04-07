'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Package, TrendingUp, Car, Bike, BarChart3, RefreshCw, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { puedeCRUD } from '@/utils/roles'

export const dynamic = 'force-dynamic'

export default function ServiciosPage() {
    const supabase = createClient()
    const router = useRouter()
    const [servicios, setServicios] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState<'todos' | 'carro' | 'moto'>('todos')

    useEffect(() => {
        const userData = sessionStorage.getItem('gorilla_user')
        if (!userData) { router.push('/login'); return }
        const { rol } = JSON.parse(userData)
        if (!puedeCRUD(rol)) { router.push('/admin/resumen'); return }
        fetchServicios()
    }, [])

    const fetchServicios = useCallback(async () => {
        setLoading(true)
        try {
            // Traer servicios con conteo real desde ordenes_servicio usando servicios_ids (array)
            const { data: srv } = await supabase.from('servicios').select('*').order('nombre')
            const { data: ordenes } = await supabase
                .from('ordenes_servicio')
                .select('servicios_ids, tipo_vehiculo')
                .eq('estado', 'terminado')

            if (srv && ordenes) {
                const stats = srv.map(s => {
                    const coincidencias = ordenes.filter(o =>
                        Array.isArray(o.servicios_ids) && o.servicios_ids.includes(s.id)
                    )
                    const carros = coincidencias.filter(o => o.tipo_vehiculo === 'carro').length
                    const motos = coincidencias.filter(o => o.tipo_vehiculo !== 'carro').length
                    const total = coincidencias.length
                    return { ...s, total, carros, motos }
                })

                // Ordenar por más vendido
                stats.sort((a, b) => b.total - a.total)
                setServicios(stats)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    const filtrados = servicios.filter(s => {
        if (filtro === 'carro') return s.aplica_a === 'carro' || s.aplica_a === 'ambos'
        if (filtro === 'moto') return s.aplica_a === 'moto' || s.aplica_a === 'ambos'
        return true
    })

    const maxTotal = Math.max(...filtrados.map(s => s.total), 1)
    const totalVentas = filtrados.reduce((acc, s) => acc + s.total, 0)

    return (
        <div className="min-h-screen pt-20 lg:pt-8 bg-[#F8FAFC] text-slate-900 pb-24 overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">

                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Análisis de Ventas</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                            Popularidad <span className="text-gorilla-orange">Servicios</span>
                        </h1>
                    </div>
                    <button
                        onClick={fetchServicios}
                        className="self-start sm:self-auto p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* ── STATS GLOBALES ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#0E0C15] text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-gorilla-orange/10 rounded-full blur-2xl pointer-events-none" />
                        <p className="text-[9px] font-black text-gorilla-orange uppercase tracking-widest mb-1 relative z-10">Total vendidos</p>
                        <p className="text-4xl font-black tracking-tighter leading-none relative z-10">{totalVentas}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 relative z-10">servicios completados</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tipos de servicio</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{servicios.length}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-gorilla-orange shrink-0">
                            <Star size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Más popular</p>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight truncate">
                                {servicios[0]?.nombre || '—'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── FILTROS ── */}
                <div className="flex gap-2">
                    {(['todos', 'carro', 'moto'] as const).map(f => (
                        <button key={f} onClick={() => setFiltro(f)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filtro === f
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}>
                            {f === 'todos' ? <BarChart3 size={12} /> : f === 'carro' ? <Car size={12} /> : <Bike size={12} />}
                            {f === 'todos' ? 'Todos' : f === 'carro' ? 'Carros' : 'Motos'}
                        </button>
                    ))}
                </div>

                {/* ── LISTA DE SERVICIOS ── */}
                {loading ? (
                    <div className="space-y-3">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                        <Package size={40} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay servicios registrados</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtrados.map((s, idx) => {
                            const pct = maxTotal > 0 ? Math.round((s.total / maxTotal) * 100) : 0
                            const esMasPopular = idx === 0 && s.total > 0
                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${esMasPopular ? 'border-gorilla-orange/40 shadow-orange-50' : 'border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Posición */}
                                        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-gorilla-orange text-white' :
                                                idx === 1 ? 'bg-slate-700 text-white' :
                                                    idx === 2 ? 'bg-amber-600 text-white' :
                                                        'bg-slate-100 text-slate-500'
                                            }`}>
                                            {idx + 1}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className="font-black text-sm text-slate-800 uppercase truncate">{s.nombre}</p>
                                                    {esMasPopular && (
                                                        <span className="shrink-0 flex items-center gap-1 bg-orange-50 text-gorilla-orange text-[8px] font-black px-2 py-0.5 rounded-lg border border-orange-100 tracking-widest">
                                                            <TrendingUp size={8} /> TOP
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-black text-lg text-slate-900 tabular-nums shrink-0">{s.total}</span>
                                            </div>

                                            {/* Barra de progreso */}
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                                                    className={`h-full rounded-full ${esMasPopular ? 'bg-gorilla-orange' : 'bg-slate-400'}`}
                                                />
                                            </div>

                                            {/* Detalle */}
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                                                    <Car size={10} /> {s.carros} carros
                                                </span>
                                                <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase tracking-widest">
                                                    <Bike size={10} /> {s.motos} motos
                                                </span>
                                                <span className="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {pct}% del máx
                                                </span>
                                                {/* Precios */}
                                                <div className="hidden sm:flex items-center gap-2">
                                                    {(s.aplica_a === 'carro' || s.aplica_a === 'ambos') && (
                                                        <span className="text-[9px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                                                            <Car size={8} className="inline mr-1" />${Number(s.precio_carro || 0).toLocaleString('es-CO')}
                                                        </span>
                                                    )}
                                                    {(s.aplica_a === 'moto' || s.aplica_a === 'ambos') && (
                                                        <span className="text-[9px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                                                            <Bike size={8} className="inline mr-1" />${Number(s.precio_moto || 0).toLocaleString('es-CO')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}

            </div>
        </div>
    )
}