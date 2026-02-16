'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Search, User, Phone, Edit, Trash2, Users, Star, 
  History, Smartphone, CreditCard, ChevronRight, X, Filter, Plus 
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

    if (!error) setClientes(data)
    setLoading(false)
  }

  const eliminarCliente = async (id: string) => {
    if (confirm('¿ELIMINAR CLIENTE? Esto borrará todo su historial del sistema.')) {
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
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 relative overflow-hidden">
      
      {/* Luces de fondo estilo Nebula */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-gorilla-purple/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[5%] left-[-5%] w-80 h-80 bg-gorilla-orange/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER CON DASHBOARD DE FIDELIDAD */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
              Comunidad <span className="text-gorilla-orange">Gorilla</span>
            </h1>
            <div className="flex items-center gap-3">
               <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
                 <Users size={12} className="text-gorilla-purple" /> {clientes.length} Registrados
               </span>
               <span className="flex items-center gap-1 text-[10px] font-bold text-gorilla-orange tracking-[0.2em] uppercase bg-gorilla-orange/10 px-3 py-1 rounded-full border border-gorilla-orange/20">
                 <Star size={12} fill="currentColor" /> {clientes.filter(c => c.ordenes_servicio[0].count >= 5).length} Clientes VIP
               </span>
            </div>
          </motion.div>

          <div className="w-full md:w-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gorilla-orange transition-colors" />
            <input 
              type="text"
              placeholder="BUSCAR CLIENTE POR CÉDULA O NOMBRE..."
              className="w-full md:w-[400px] bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 pl-12 rounded-[2rem] outline-none focus:ring-2 focus:ring-gorilla-orange/50 focus:border-gorilla-orange transition-all font-bold uppercase text-sm tracking-widest placeholder:text-gray-700"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL - GRID ANIMADO */}
        <AnimatePresence mode="popLayout">
          <motion.main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5" />
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
                    className={`bg-white/[0.03] backdrop-blur-md border ${esVIP ? 'border-gorilla-orange/30 shadow-[0_0_30px_rgba(244,127,32,0.1)]' : 'border-white/10'} rounded-[2.5rem] p-8 hover:bg-white/[0.06] transition-all group relative overflow-hidden`}
                  >
                    {/* Badge VIP flotante */}
                    {esVIP && (
                      <div className="absolute top-4 right-4 bg-gorilla-orange text-white text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-bounce">
                        <Star size={10} fill="white" /> VIP GORILLA
                      </div>
                    )}

                    <div className="flex items-center gap-5 mb-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl relative ${esVIP ? 'bg-gorilla-orange text-white' : 'bg-gorilla-purple/20 text-gorilla-purple'}`}>
                        {c.nombre[0].toUpperCase()}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0a0a0c] rounded-full flex items-center justify-center">
                            <div className={`w-3 h-3 rounded-full ${esVIP ? 'bg-gorilla-orange' : 'bg-gorilla-purple'}`} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-black text-xl leading-tight uppercase tracking-tighter italic">{c.nombre}</h3>
                        <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1">CC: {c.cedula}</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between p-3 bg-black/40 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <Smartphone size={16} className="text-gorilla-purple" /> {c.telefono || 'SIN TELÉFONO'}
                        </div>
                        <a href={`tel:${c.telefono}`} className="text-gorilla-purple hover:scale-110 transition-transform"><Plus size={16} className="rotate-45" /></a>
                      </div>
                      
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-gorilla-orange" />
                            <span className="text-xs font-black uppercase tracking-tighter">Historial</span>
                        </div>
                        <span className="text-xl font-black">{c.ordenes_servicio[0].count} <span className="text-[10px] text-gray-500">VISITAS</span></span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setEditando(c)}
                        className="flex-1 bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all text-xs border border-white/5"
                      >
                        <Edit size={14} /> EDITAR
                      </button>
                      <button 
                        onClick={() => eliminarCliente(c.id)}
                        className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20"
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

      {/* MODAL DE EDICIÓN GLASSMORPHISM */}
      <AnimatePresence>
        {editando && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#121216] border border-white/10 w-full max-w-lg p-10 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gorilla-orange to-gorilla-purple" />
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Actualizar <span className="text-gorilla-orange">Perfil</span></h2>
                <button onClick={() => setEditando(null)} className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
              </div>

              <form onSubmit={actualizarCliente} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 tracking-[0.2em]">Nombre Completo</label>
                  <input 
                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-gorilla-orange transition-all font-bold uppercase"
                    value={editando.nombre}
                    onChange={(e) => setEditando({...editando, nombre: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 tracking-[0.2em]">Cédula</label>
                        <input 
                            className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-gorilla-purple transition-all font-black tracking-widest"
                            value={editando.cedula}
                            onChange={(e) => setEditando({...editando, cedula: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase ml-2 tracking-[0.2em]">Teléfono</label>
                        <input 
                            className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-gorilla-purple transition-all font-bold"
                            value={editando.telefono}
                            onChange={(e) => setEditando({...editando, telefono: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-12">
                  <button 
                    type="submit"
                    className="flex-1 bg-gorilla-orange p-5 rounded-2xl font-black italic uppercase tracking-widest shadow-xl shadow-orange-900/20 hover:scale-[1.02] active:scale-95 transition-all"
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