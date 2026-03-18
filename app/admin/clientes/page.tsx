'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, Phone, Edit, Trash2, Users, Star, History, User, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BaseClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`id, cedula, nombre, telefono, creado_en, ordenes_servicio!ordenes_servicio_cliente_id_fkey (count)`)
        .order('nombre', { ascending: true })

      if (error) {
        const { data: fallback } = await supabase.from('clientes').select('*')
        if (fallback) setClientes(fallback.map(c => ({ ...c, ordenes_servicio: [{ count: 0 }] })))
      } else {
        setClientes(data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => { fetchClientes() }, [fetchClientes])

  // Tiempo real: clientes y órdenes (el conteo de visitas cambia cuando hay nueva orden)
  useEffect(() => {
    const channel = supabase
      .channel('clientes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => fetchClientes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchClientes())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchClientes])

  const eliminarCliente = async (id: string) => {
    if (confirm('¿ELIMINAR CLIENTE? Esto borrará todo su historial y es irreversible.')) {
      await supabase.from('clientes').delete().eq('id', id)
      // El realtime recarga automáticamente
    }
  }

  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('clientes')
      .update({ nombre: editando.nombre, telefono: editando.telefono, cedula: editando.cedula })
      .eq('id', editando.id)
    if (!error) setEditando(null)
    // El realtime recarga automáticamente
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.cedula || '').includes(busqueda)
  )

  const clientesVIP = clientes.filter(c => (c.ordenes_servicio?.[0]?.count || 0) >= 5).length

  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:px-10 py-6 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full xl:w-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Base de Datos</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-4 text-slate-900 leading-none">
              Comunidad <span className="text-gorilla-purple">Gorilla</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest uppercase bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                <Users size={14} className="text-gorilla-purple" /> {clientes.length} Registrados
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-orange tracking-widest uppercase bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
                <Star size={14} fill="currentColor" /> {clientesVIP} VIP
              </span>
              {/* Indicador tiempo real */}
              <span className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">En vivo</span>
              </span>
            </div>
          </motion.div>

          <div className="w-full xl:w-[400px] relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-purple transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente (nombre o CC)..."
              className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-50 focus:border-gorilla-purple transition-all font-bold uppercase text-xs tracking-widest text-slate-900 placeholder:text-slate-300 shadow-sm"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </header>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-56 bg-white border border-slate-100 rounded-[1.5rem] animate-pulse shadow-sm" />
            ))
          ) : clientesFiltrados.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
              <Users size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No se encontraron clientes</p>
            </div>
          ) : (
            <AnimatePresence>
              {clientesFiltrados.map(c => {
                const visitas = c.ordenes_servicio?.[0]?.count || 0
                const esVIP = visitas >= 5
                return (
                  <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={c.id}
                    className={`bg-white border p-5 sm:p-6 rounded-[1.5rem] transition-all group relative flex flex-col justify-between ${esVIP ? 'border-orange-200 shadow-md shadow-orange-100/50 hover:border-gorilla-orange/50'
                        : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-gorilla-purple/40'
                      }`}>

                    {esVIP && (
                      <div className="absolute top-4 right-4 bg-orange-50 text-gorilla-orange text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 border border-orange-100 tracking-widest">
                        <Star size={10} fill="currentColor" /> VIP
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-5 pr-12">
                      <div className={`w-11 h-11 shrink-0 rounded-[1rem] flex items-center justify-center font-black text-lg text-white shadow-inner ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`}>
                        {c.nombre[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate">{c.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <User size={10} /> CC: {c.cedula || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-5 flex-1">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold truncate">
                          <Phone size={13} className="text-gorilla-purple shrink-0" />
                          <span className="truncate">{c.telefono || 'Sin registrar'}</span>
                        </div>
                        {c.telefono && (
                          <a href={`tel:${c.telefono}`} className="text-gorilla-purple hover:bg-white p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0">
                            <ChevronRight size={15} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <History size={13} /> Historial
                        </div>
                        <span className="text-lg font-black text-slate-800 leading-none">
                          {visitas} <span className="text-[9px] text-slate-400">VISITAS</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditando(c)}
                        className="flex-1 bg-slate-50 hover:bg-gorilla-purple hover:text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all text-[10px] uppercase tracking-widest border border-slate-200 hover:border-gorilla-purple text-slate-500">
                        <Edit size={13} /> Editar
                      </button>
                      <button onClick={() => eliminarCliente(c.id)}
                        className="w-11 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 hover:border-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* MODAL EDICIÓN */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-slate-200 w-full max-w-md p-6 sm:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gorilla-orange to-gorilla-purple" />
              <div className="flex justify-between items-center mb-7">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                    Editar <span className="text-gorilla-orange">Cliente</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Actualización de datos</p>
                </div>
                <button onClick={() => setEditando(null)} className="p-2.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={actualizarCliente} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input className="w-full bg-slate-50 border border-slate-200/60 p-4 pl-11 rounded-xl outline-none focus:bg-white focus:border-gorilla-orange transition-all font-bold uppercase text-xs text-slate-900"
                      value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Cédula</label>
                    <input className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-black text-xs tracking-widest text-slate-900"
                      value={editando.cedula} onChange={e => setEditando({ ...editando, cedula: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Teléfono</label>
                    <input className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold text-xs text-slate-900"
                      value={editando.telefono} onChange={e => setEditando({ ...editando, telefono: e.target.value })} />
                  </div>
                </div>
                <div className="pt-3">
                  <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all text-sm">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}