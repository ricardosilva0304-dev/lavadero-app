'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, Phone, Edit3, Trash2, Users, Star, X, User, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Rol, puedeCRUD } from '@/utils/roles'

export default function BaseClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)
  const [puedeEditar, setPuedeEditar] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    const rol: Rol = userData ? JSON.parse(userData).rol : 'empleado'
    setPuedeEditar(puedeCRUD(rol))
  }, [])

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

  useEffect(() => { fetchClientes() }, [fetchClientes])

  useEffect(() => {
    const channel = supabase.channel('clientes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => fetchClientes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_servicio' }, () => fetchClientes())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchClientes])

  const eliminarCliente = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    setConfirmDelete(null)
  }

  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('clientes')
      .update({ nombre: editando.nombre, telefono: editando.telefono, cedula: editando.cedula })
      .eq('id', editando.id)
    if (!error) setEditando(null)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.cedula || '').includes(busqueda) ||
    (c.telefono || '').includes(busqueda)
  )

  const clientesVIP = clientes.filter(c => (c.ordenes_servicio?.[0]?.count || 0) >= 5).length

  return (
    <div className="min-h-screen pt-20 lg:pt-8 bg-[#F8FAFC] text-slate-900 pb-24 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Base de Datos</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
              Clientes <span className="text-gorilla-purple">Gorilla</span>
            </h1>
          </div>

          {/* Buscador */}
          <div className="w-full sm:w-80 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Nombre, CC o teléfono..."
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-gorilla-purple/20 focus:border-gorilla-purple transition-all shadow-sm placeholder:text-slate-300 placeholder:normal-case placeholder:tracking-normal"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest uppercase bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Users size={13} className="text-gorilla-purple" /> {clientes.length} Registrados
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-orange tracking-widest uppercase bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
            <Star size={13} fill="currentColor" /> {clientesVIP} VIP
          </span>
          <span className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">En vivo</span>
          </span>
        </div>

        {/* ── TABLA desktop / CARDS mobile ── */}
        {loading ? (
          <div className="space-y-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-white border border-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <Users size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No se encontraron clientes</p>
          </div>
        ) : (
          <>
            {/* Tabla — visible en md+ */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cédula</th>
                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Teléfono</th>
                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Visitas</th>
                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    {puedeEditar && <th className="px-4 py-4" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {clientesFiltrados.map((c) => {
                      const visitas = c.ordenes_servicio?.[0]?.count || 0
                      const esVIP = visitas >= 5
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Nombre */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm text-white ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`}>
                                {c.nombre?.[0]?.toUpperCase()}
                              </div>
                              <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{c.nombre}</span>
                            </div>
                          </td>
                          {/* Cédula */}
                          <td className="px-4 py-4">
                            <span className="text-xs font-bold text-slate-500 tabular-nums">{c.cedula || '—'}</span>
                          </td>
                          {/* Teléfono */}
                          <td className="px-4 py-4">
                            {c.telefono ? (
                              <a href={`tel:${c.telefono}`} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-gorilla-purple transition-colors">
                                <Phone size={11} className="text-slate-400" /> {c.telefono}
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300 font-bold">Sin registrar</span>
                            )}
                          </td>
                          {/* Visitas */}
                          <td className="px-4 py-4 text-center">
                            <span className="text-lg font-black text-slate-800 tabular-nums leading-none">{visitas}</span>
                          </td>
                          {/* VIP badge */}
                          <td className="px-4 py-4 text-center">
                            {esVIP ? (
                              <span className="inline-flex items-center gap-1 bg-orange-50 text-gorilla-orange text-[9px] font-black px-2.5 py-1 rounded-lg border border-orange-100 tracking-widest">
                                <Star size={9} fill="currentColor" /> VIP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 text-[9px] font-black px-2.5 py-1 rounded-lg border border-slate-100 tracking-widest">
                                Regular
                              </span>
                            )}
                          </td>
                          {/* Acciones */}
                          {puedeEditar && (
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditando(c)}
                                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-gorilla-purple hover:border-gorilla-purple transition-all shadow-sm">
                                  <Edit3 size={13} />
                                </button>
                                <button onClick={() => setConfirmDelete(c)}
                                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Cards — visible en mobile */}
            <div className="md:hidden space-y-3">
              <AnimatePresence>
                {clientesFiltrados.map((c) => {
                  const visitas = c.ordenes_servicio?.[0]?.count || 0
                  const esVIP = visitas >= 5
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`bg-white border rounded-2xl p-4 shadow-sm ${esVIP ? 'border-orange-200' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-base text-white ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`}>
                          {c.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-800 uppercase truncate">{c.nombre}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            <User size={8} className="inline mr-1" />CC: {c.cedula || 'N/A'}
                          </p>
                        </div>
                        {esVIP && (
                          <span className="flex items-center gap-1 bg-orange-50 text-gorilla-orange text-[9px] font-black px-2 py-1 rounded-lg border border-orange-100 tracking-widest shrink-0">
                            <Star size={9} fill="currentColor" /> VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          {c.telefono ? (
                            <a href={`tel:${c.telefono}`} className="flex items-center gap-1.5 hover:text-gorilla-purple transition-colors">
                              <Phone size={11} className="text-slate-400" /> {c.telefono}
                            </a>
                          ) : (
                            <span className="text-slate-300">Sin teléfono</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{visitas} visitas</span>
                          {puedeEditar && (
                            <>
                              <button onClick={() => setEditando(c)} className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => setConfirmDelete(c)} className="p-2 bg-red-50 rounded-lg text-red-400 border border-red-100">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </>
        )}

      </div>

      {/* ── MODAL EDITAR ── */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-gorilla-orange to-gorilla-purple" />
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-black italic uppercase text-slate-900 leading-none">Editar Cliente</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Actualización de datos</p>
                  </div>
                  <button onClick={() => setEditando(null)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={actualizarCliente} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-gorilla-purple focus:bg-white font-bold text-sm text-slate-900 transition-all uppercase"
                      value={editando.nombre}
                      onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cédula</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-gorilla-purple focus:bg-white font-bold text-sm text-slate-900 transition-all tabular-nums"
                        value={editando.cedula || ''}
                        onChange={e => setEditando({ ...editando, cedula: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-gorilla-purple focus:bg-white font-bold text-sm text-slate-900 transition-all tabular-nums"
                        value={editando.telefono || ''}
                        onChange={e => setEditando({ ...editando, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 mt-2">
                    Guardar Cambios
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL ELIMINAR ── */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-1 w-full bg-red-500" />
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h2 className="text-lg font-black italic uppercase text-slate-900 mb-1">¿Eliminar cliente?</h2>
                <p className="text-sm font-bold text-slate-600 mb-1">"{confirmDelete.nombre}"</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Esta acción es irreversible</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                  <button onClick={() => eliminarCliente(confirmDelete.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}