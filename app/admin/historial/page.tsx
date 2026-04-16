'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, FileText, User, Car, Tag, Trash2, Calendar, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Rol, puedeCRUD } from '@/utils/roles'
import { useRouter } from 'next/navigation'
import { isoAFechaCol, fechaHoyCol } from '@/utils/colombia'

export const dynamic = 'force-dynamic'

export default function HistorialPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtroPago, setFiltroPago] = useState<'todos' | 'efectivo' | 'transferencia'>('todos')
  const [soloFinalizados, setSoloFinalizados] = useState(true)
  const [puedeEliminar, setPuedeEliminar] = useState(false)

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) { router.push('/login'); return }
    const rol: Rol = JSON.parse(userData).rol
    setPuedeEliminar(puedeCRUD(rol))
  }, [router])

  const fetchHistorial = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ordenes_servicio')
      .select(`*, cliente:clientes!cliente_id (nombre, telefono), empleado:perfiles!empleado_id (nombre)`)
      .order('creado_en', { ascending: false })
    if (error) console.error('Error en el historial:', error.message)
    else setOrdenes(data || [])
    setLoading(false)
  }, [])

  // Carga inicial
  useEffect(() => { fetchHistorial() }, [fetchHistorial])

  // Tiempo real: se actualiza cuando se crea, edita o elimina una orden
  useEffect(() => {
    const channel = supabase
      .channel('historial_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchHistorial())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchHistorial])

  const eliminarOrden = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio?\n\nEsta acción es irreversible.')) return
    await supabase.from('ordenes_servicio').delete().eq('id', id)
    // El realtime se encarga de refrescar automáticamente
  }

  const filtered = ordenes.filter(o => {
    const term = busqueda.toLowerCase()
    const matchBusqueda =
      o.placa.toLowerCase().includes(term) ||
      (o.cliente?.nombre || '').toLowerCase().includes(term) ||
      (o.cliente?.telefono || '').includes(term)
    const matchPago = filtroPago === 'todos' || o.metodo_pago === filtroPago
    const matchEstado = !soloFinalizados || o.estado === 'cobrado'
    return matchBusqueda && matchPago && matchEstado
  })

  // El total solo suma órdenes cobradas para que sea un número real de dinero
  const totalFiltrado = filtered
    .filter(o => o.estado === 'cobrado')
    .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)

  const agruparPorFecha = (lista: any[]) => {
    const grupos: { [key: string]: any[] } = {}
    const hoyStr = fechaHoyCol()
    const [y, m, d] = hoyStr.split('-').map(Number)
    const ayerDate = new Date(Date.UTC(y, m - 1, d - 1))
    const ayerStr = `${ayerDate.getUTCFullYear()}-${String(ayerDate.getUTCMonth() + 1).padStart(2, '0')}-${String(ayerDate.getUTCDate()).padStart(2, '0')}`

    lista.forEach(o => {
      const recordStr = isoAFechaCol(o.creado_en)
      const nombreGrupo =
        recordStr === hoyStr ? 'HOY' :
          recordStr === ayerStr ? 'AYER' :
            new Intl.DateTimeFormat('es-CO', {
              day: '2-digit', month: 'long', year: 'numeric',
              timeZone: 'America/Bogota'
            }).format(new Date(o.creado_en)).toUpperCase()
      if (!grupos[nombreGrupo]) grupos[nombreGrupo] = []
      grupos[nombreGrupo].push(o)
    })
    return grupos
  }

  const ordenesAgrupadas = agruparPorFecha(filtered)

  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:p-10 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10">

        {/* HEADER */}
        <header className="flex flex-col gap-5 border-b border-slate-200/60 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                Historial <span className="text-gorilla-orange">Total</span>
              </h1>
            </div>
            {/* Indicador tiempo real */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2 rounded-xl w-fit h-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Actualizando en vivo</span>
            </div>
          </div>

          {/* Filtros + buscador */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-sm shrink-0">
              {([
                { val: 'todos', label: 'Todos', active: 'bg-slate-900 text-white' },
                { val: 'efectivo', label: 'Efectivo', active: 'bg-green-500 text-white' },
                { val: 'transferencia', label: 'Transf.', active: 'bg-blue-600 text-white' },
              ] as const).map(f => (
                <button key={f.val} onClick={() => setFiltroPago(f.val)}
                  className={`px-3 sm:px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === f.val ? f.active + ' shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSoloFinalizados(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-3 rounded-[1.5rem] border text-[10px] font-black tracking-widest uppercase transition-all shrink-0 shadow-sm ${soloFinalizados ? 'bg-gorilla-orange text-white border-orange-400' : 'bg-white text-slate-500 border-slate-200/60 hover:text-slate-800'}`}>
              {soloFinalizados ? '✅ Solo cobrados' : '📋 Todas las órdenes'}
            </button>
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-orange transition-colors" size={16} />
              <input
                placeholder="Buscar placa, cliente o teléfono..."
                className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm font-bold uppercase text-xs placeholder:text-slate-300 text-slate-800"
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* LISTA */}
        <main className="space-y-10 pb-28">
          {loading ? (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando registros...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No se encontraron registros</p>
            </div>
          ) : (
            <AnimatePresence>
              {Object.keys(ordenesAgrupadas).map(fechaGrupo => (
                <div key={fechaGrupo} className="space-y-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-slate-900 text-white rounded-[1rem] shadow-lg shrink-0"><Calendar size={16} /></div>
                    <h2 className="text-base sm:text-lg font-black italic tracking-tight text-slate-800 uppercase">{fechaGrupo}</h2>
                    <div className="flex-1 h-px bg-slate-200/80 hidden sm:block" />
                  </div>

                  <div className="space-y-3 sm:pl-14">
                    {ordenesAgrupadas[fechaGrupo].map((o: any) => (
                      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={o.id}
                        className="bg-white border border-slate-200/60 p-4 sm:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">

                          {/* Vehículo + cliente */}
                          <div className="flex items-center gap-4 lg:w-1/3">
                            <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                              <Car size={22} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none mb-1">{o.placa}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                <User size={10} className="text-gorilla-purple shrink-0" />
                                <span className="truncate max-w-[120px]">{o.cliente?.nombre || 'General'}</span>
                                {o.cliente?.telefono && (
                                  <><span className="text-slate-300">·</span><Phone size={10} className="text-gorilla-purple shrink-0" /><span>{o.cliente.telefono}</span></>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Servicios */}
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <Tag size={13} className="text-slate-300 shrink-0 mt-0.5" />
                              <p className="text-xs font-bold text-slate-600 uppercase leading-snug line-clamp-2">{o.nombres_servicios}</p>
                            </div>
                          </div>

                          {/* Operador, pago, total, borrar */}
                          <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Op: <span className="text-slate-800">{o.empleado?.nombre || 'N/A'}</span>
                              </span>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border w-fit ${o.metodo_pago === 'efectivo'
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : o.metodo_pago === 'transferencia'
                                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                                  : o.estado === 'pendiente'
                                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                                    : o.estado === 'en_proceso'
                                      ? 'bg-blue-50 text-blue-500 border-blue-200'
                                      : o.estado === 'terminado'
                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                {o.metodo_pago
                                  ? o.metodo_pago
                                  : o.estado === 'pendiente' ? '⏳ En espera'
                                    : o.estado === 'en_proceso' ? '🔄 Lavando'
                                      : o.estado === 'terminado' ? '⏳ Sin cobrar'
                                        : o.estado}
                              </span>
                            </div>
                            <span className="text-xl sm:text-2xl font-black text-gorilla-orange tracking-tighter leading-none">
                              ${(parseFloat(o.total) || 0).toLocaleString('es-CO')}
                            </span>
                            {puedeEliminar && (
                              <button onClick={() => eliminarOrden(o.id)}
                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
                                <Trash2 size={17} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          )}
        </main>

        {/* TOTAL FLOTANTE */}
        {!loading && filtered.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 lg:right-8 z-40">
            <div className="bg-[#0E0C15] rounded-[1.5rem] sm:rounded-[2rem] px-5 sm:px-8 py-4 sm:py-5 shadow-2xl flex justify-between sm:gap-10 items-center text-white border border-slate-800">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{filtered.length} registros</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Total filtrado</p>
              </div>
              <p className="text-2xl sm:text-3xl font-black tracking-tighter text-gorilla-orange">
                ${totalFiltrado.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}