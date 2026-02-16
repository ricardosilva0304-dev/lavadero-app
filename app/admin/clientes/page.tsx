'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Search, User, Phone, Edit, Trash2, Users, Star, 
  History, Smartphone, Plus, X 
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
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*, ordenes_servicio (count)')
      .order('nombre', { ascending: true })

    if (!error) setClientes(data || [])
    setLoading(false)
  }

  const eliminarCliente = async (id: string) => {
    if (confirm('¿ELIMINAR CLIENTE? Esto borrará todo su historial.')) {
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 relative overflow-hidden">
      
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gorilla-purple/5 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-gray-900">
              Comunidad <span className="text-gorilla-purple">Gorilla</span>
            </h1>
            <div className="flex items-center gap-3">
               <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                 <Users size={12} className="text-gorilla-purple" /> {clientes.length} Registrados
               </span>
               <span className="flex items-center gap-1 text-[10px] font-bold text-gorilla-orange tracking-[0.2em] uppercase bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                 <Star size={12} fill="currentColor" /> {clientes.filter(c => c.ordenes_servicio[0].count >= 5).length} VIP
               </span>
            </div>
          </motion.div>

          <div className="w-full md:w-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gorilla-purple transition-colors" />
            <input 
              type="text"
              placeholder="BUSCAR CLIENTE..."
              className="w-full md:w-[400px] bg-white border border-gray-200 p-5 pl-12 rounded-[2rem] outline-none focus:ring-2 focus:ring-gorilla-purple/20 focus:border-gorilla-purple transition-all font-bold uppercase text-sm tracking-widest text-gray-900 placeholder:text-gray-400 shadow-md"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <AnimatePresence mode="popLayout">
          <motion.main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-[2.5rem] animate-pulse" />
               ))
            ) : (
              clientesFiltrados.map((c) => {
                const esVIP = c.ordenes_servicio[0].count >= 5;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={c.id} 
                    className={`bg-white border ${esVIP ? 'border-orange-200 shadow-xl shadow-orange-100' : 'border-gray-100 shadow-lg shadow-gray-200/50'} rounded-[2.5rem] p-8 hover:border-gorilla-purple/50 transition-all group relative overflow-hidden`}
                  >
                    {esVIP && (
                      <div className="absolute top-4 right-4 bg-orange-50 text-gorilla-orange text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-orange-100">
                        <Star size={10} fill="currentColor" /> VIP
                      </div>
                    )}

                    <div className="flex items-center gap-5 mb-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl text-white relative shadow-md ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`}>
                        {c.nombre[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-xl leading-tight uppercase tracking-tighter italic text-gray-900">{c.nombre}</h3>
                        <p className="text-[10px] text-gray-400 font-mono tracking-widest mt-1">CC: {c.cedula}</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                            <Smartphone size={16} className="text-gorilla-purple" /> {c.telefono || '---'}
                        </div>
                        <a href={`tel:${c.telefono}`} className="text-gorilla-purple hover:scale-110 transition-transform bg-white p-2 rounded-full shadow-sm"><Phone size={14} /></a>
                      </div>
                      
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-gray-400" />
                            <span className="text-xs font-black uppercase tracking-tighter text-gray-500">Historial</span>
                        </div>
                        <span className="text-xl font-black text-gray-900">{c.ordenes_servicio[0].count} <span className="text-[10px] text-gray-400">VISITAS</span></span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setEditando(c)}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all text-xs border border-gray-200 text-gray-600"
                      >
                        <Edit size={14} /> EDITAR
                      </button>
                      <button 
                        onClick={() => eliminarCliente(c.id)}
                        className="p-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all border border-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* MODAL DE EDICIÓN */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white border border-gray-200 w-full max-w-lg p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gorilla-orange to-gorilla-purple" />
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900">Editar <span className="text-gorilla-orange">Cliente</span></h2>
                <button onClick={() => setEditando(null)} className="p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                    <X size={20} />
                </button>
              </div>

              <form onSubmit={actualizarCliente} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold uppercase ml-2 tracking-[0.2em]">Nombre</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-200 p-5 rounded-2xl outline-none focus:bg-white focus:border-gorilla-orange transition-all font-bold uppercase text-gray-900"
                    value={editando.nombre}
                    onChange={(e) => setEditando({...editando, nombre: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-bold uppercase ml-2 tracking-[0.2em]">Cédula</label>
                        <input 
                            className="w-full bg-gray-50 border border-gray-200 p-5 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-black tracking-widest text-gray-900"
                            value={editando.cedula}
                            onChange={(e) => setEditando({...editando, cedula: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-bold uppercase ml-2 tracking-[0.2em]">Teléfono</label>
                        <input 
                            className="w-full bg-gray-50 border border-gray-200 p-5 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold text-gray-900"
                            value={editando.telefono}
                            onChange={(e) => setEditando({...editando, telefono: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-12">
                  <button 
                    type="submit"
                    className="flex-1 bg-gray-900 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    GUARDAR CAMBIOS
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