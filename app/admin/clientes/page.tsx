'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Phone, Edit, Trash2, Users, Star,
  History, Plus, X, User, ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BaseClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          cedula,
          nombre,
          telefono,
          creado_en,
          ordenes_servicio!ordenes_servicio_cliente_id_fkey (count)
        `)
        .order('nombre', { ascending: true });

      if (error) {
        console.error("Error SQL detallado:", error);
        const { data: fallbackData } = await supabase.from('clientes').select('*');
        if (fallbackData) {
          setClientes(fallbackData.map(c => ({ ...c, ordenes_servicio: [{ count: 0 }] })));
        }
      } else {
        setClientes(data || []);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  const eliminarCliente = async (id: string) => {
    if (confirm('¿ELIMINAR CLIENTE? Esto borrará todo su historial y es irreversible.')) {
      await supabase.from('clientes').delete().eq('id', id)
      fetchClientes()
    }
  }

  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: editando.nombre,
        telefono: editando.telefono,
        cedula: editando.cedula
      })
      .eq('id', editando.id)

    if (!error) {
      setEditando(null)
      fetchClientes()
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.cedula.includes(busqueda)
  )

  const clientesVIP = clientes.filter(c => (c.ordenes_servicio?.[0]?.count || 0) >= 5).length;

  return (
    <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-6 py-6 md:p-10 lg:p-10 relative overflow-x-hidden">

      <div className="max-w-7xl mx-auto space-y-8 lg:space-y-10">

        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full xl:w-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Base de Datos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-4 text-slate-900 leading-none">
              Comunidad <span className="text-gorilla-purple">Gorilla</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-widest uppercase bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                <Users size={14} className="text-gorilla-purple" /> {clientes.length} Registrados
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-gorilla-orange tracking-widest uppercase bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
                <Star size={14} fill="currentColor" /> {clientesVIP} VIP
              </span>
            </div>
          </motion.div>

          {/* Buscador */}
          <div className="w-full xl:w-[400px] relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-purple transition-colors" size={18} />
            <input
              type="text"
              placeholder="BUSCAR CLIENTE (NOMBRE O CC)..."
              className="w-full bg-white border border-slate-200/60 p-5 pl-12 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-50 focus:border-gorilla-purple transition-all font-bold uppercase text-xs tracking-widest text-slate-900 placeholder:text-slate-300 shadow-sm"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL - GRID INTELIGENTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 lg:gap-6">
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
              {clientesFiltrados.map((c) => {
                const visitas = c.ordenes_servicio?.[0]?.count || 0;
                const esVIP = visitas >= 5;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={c.id}
                    className={`bg-white border p-6 rounded-[1.5rem] transition-all group relative flex flex-col justify-between ${esVIP
                        ? 'border-orange-200 shadow-md shadow-orange-100/50 hover:border-gorilla-orange/50'
                        : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-gorilla-purple/40'
                      }`}
                  >
                    {/* Estado VIP */}
                    {esVIP && (
                      <div className="absolute top-5 right-5 bg-orange-50 text-gorilla-orange text-[9px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 border border-orange-100 tracking-widest">
                        <Star size={10} fill="currentColor" /> VIP
                      </div>
                    )}

                    {/* Encabezado: Avatar y Nombre */}
                    <div className="flex items-center gap-4 mb-6 pr-14">
                      <div className={`w-12 h-12 shrink-0 rounded-[1rem] flex items-center justify-center font-black text-xl text-white shadow-inner ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`}>
                        {c.nombre[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate">{c.nombre}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <User size={10} /> CC: {c.cedula || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Datos de Contacto y Visitas */}
                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold truncate">
                          <Phone size={14} className="text-gorilla-purple shrink-0" />
                          <span className="truncate">{c.telefono || 'Sin registrar'}</span>
                        </div>
                        {c.telefono && (
                          <a href={`tel:${c.telefono}`} className="text-gorilla-purple hover:bg-white p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0">
                            <ChevronRight size={16} />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <History size={14} /> Historial
                        </div>
                        <span className="text-lg font-black text-slate-800 leading-none">
                          {visitas} <span className="text-[9px] text-slate-400">VISITAS</span>
                        </span>
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditando(c)}
                        className="flex-1 bg-slate-50 hover:bg-gorilla-purple hover:text-white p-3.5 rounded-xl flex items-center justify-center gap-2 font-black transition-all text-[10px] uppercase tracking-widest border border-slate-200 hover:border-gorilla-purple text-slate-500"
                      >
                        <Edit size={14} /> Editar
                      </button>
                      <button
                        onClick={() => eliminarCliente(c.id)}
                        className="w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 hover:border-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

      </div>

      {/* MODAL DE EDICIÓN */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-slate-200 w-full max-w-md p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gorilla-orange to-gorilla-purple" />

              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                    Editar <span className="text-gorilla-orange">Cliente</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Actualización de datos</p>
                </div>
                <button onClick={() => setEditando(null)} className="p-2.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={actualizarCliente} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      className="w-full bg-slate-50 border border-slate-200/60 p-4 pl-12 rounded-xl outline-none focus:bg-white focus:border-gorilla-orange transition-all font-bold uppercase text-xs text-slate-900"
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Cédula</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-black text-xs tracking-widest text-slate-900"
                      value={editando.cedula}
                      onChange={(e) => setEditando({ ...editando, cedula: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Teléfono / Celular</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold text-xs text-slate-900"
                      value={editando.telefono}
                      onChange={(e) => setEditando({ ...editando, telefono: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white p-4 rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all text-sm"
                  >
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