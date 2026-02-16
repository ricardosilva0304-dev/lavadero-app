'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Settings, Users, Car, Bike, Trash2, Edit3, Plus, 
  ShieldCheck, Smartphone, DollarSign, Briefcase, ChevronRight 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
export const dynamic = 'force-dynamic'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('servicios')
  const [servicios, setServicios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [formServicio, setFormServicio] = useState({ nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
  const [formUsuario, setFormUsuario] = useState({ nombre: '', cedula: '', telefono: '', rol: 'empleado' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: srv } = await supabase.from('servicios').select('*').order('creado_en')
    const { data: usr } = await supabase.from('perfiles').select('*').order('nombre')
    setServicios(srv || [])
    setUsuarios(usr || [])
    setLoading(false)
  }

  const guardarServicio = async () => {
    if (!formServicio.nombre) return
    await supabase.from('servicios').insert([formServicio])
    setFormServicio({ nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
    fetchData()
  }

  const guardarUsuario = async () => {
    if (!formUsuario.cedula) return
    await supabase.from('perfiles').insert([formUsuario])
    setFormUsuario({ nombre: '', cedula: '', telefono: '', rol: 'empleado' })
    fetchData()
  }

  const eliminarDato = async (tabla: string, id: string) => {
    if(confirm('¿Confirmas la eliminación definitiva?')) {
      await supabase.from(tabla).delete().eq('id', id)
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 relative">
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gorilla-orange/5 rounded-full blur-[120px] -z-10" />
      
      <header className="max-w-6xl mx-auto mb-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 bg-gorilla-orange/10 rounded-2xl border border-gorilla-orange/20">
            <Settings className="w-8 h-8 text-gorilla-orange animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Panel de <span className="text-gorilla-orange">Control</span></h1>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Configuración del Sistema Gorilla</p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* NAVEGACIÓN - Optimizado para móvil (scroll horizontal) */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
          <TabButton active={activeTab === 'servicios'} onClick={() => setActiveTab('servicios')} icon={<Briefcase size={20}/>} label="Servicios" color="orange" />
          <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon={<Users size={20}/>} label="Personal" color="purple" />
          <TabButton active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} icon={<Car size={20}/>} label="Parqueo" color="orange" />
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl"
            >
              
              {/* VISTA SERVICIOS */}
              {activeTab === 'servicios' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                    <div className="space-y-4 col-span-full">
                        <h2 className="text-xl font-black text-gorilla-orange flex items-center gap-2">
                            <Plus size={24}/> DEFINIR NUEVO SERVICIO
                        </h2>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Nombre del Servicio</label>
                        <input placeholder="Ej: Lavado Premium" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-gorilla-orange outline-none transition-all" 
                            value={formServicio.nombre} onChange={e => setFormServicio({...formServicio, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Aplica a:</label>
                        <select className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-gorilla-orange outline-none text-gray-400"
                            value={formServicio.aplica_a} onChange={e => setFormServicio({...formServicio, aplica_a: e.target.value})}>
                            <option value="carro">Solo Carros</option>
                            <option value="moto">Solo Motos</option>
                            <option value="ambos">Ambos Vehículos</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4 col-span-full">
                        {(formServicio.aplica_a === 'carro' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Precio Carro</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-4 text-gorilla-orange" size={16}/>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 p-4 pl-10 rounded-2xl outline-none"
                                        onChange={e => setFormServicio({...formServicio, precio_carro: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                        {(formServicio.aplica_a === 'moto' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Precio Moto</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-4 text-gorilla-orange" size={16}/>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 p-4 pl-10 rounded-2xl outline-none"
                                        onChange={e => setFormServicio({...formServicio, precio_moto: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={guardarServicio} className="col-span-full bg-gorilla-orange hover:bg-orange-600 p-5 rounded-2xl font-black text-white shadow-lg shadow-orange-900/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                      <Plus size={20}/> CREAR SERVICIO
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest px-2">Servicios Activos</h3>
                    {servicios.map(s => (
                      <motion.div layout key={s.id} className="group bg-white/5 p-5 rounded-[2rem] flex justify-between items-center border border-white/5 hover:border-gorilla-orange/40 hover:bg-white/[0.07] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center text-gorilla-orange group-hover:scale-110 transition-transform">
                            {s.aplica_a === 'carro' ? <Car size={24}/> : s.aplica_a === 'moto' ? <Bike size={24}/> : <ShieldCheck size={24}/>}
                          </div>
                          <div>
                            <h3 className="font-black text-lg tracking-tight uppercase">{s.nombre}</h3>
                            <div className="flex gap-4 mt-1">
                                {s.precio_carro > 0 && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded-lg font-bold">CARRO: ${s.precio_carro.toLocaleString()}</span>}
                                {s.precio_moto > 0 && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg font-bold">MOTO: ${s.precio_moto.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => eliminarDato('servicios', s.id)} className="p-4 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={20}/></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA USUARIOS */}
              {activeTab === 'usuarios' && (
                <div className="space-y-8">
                  <div className="bg-gorilla-purple/5 p-8 rounded-[2rem] border border-gorilla-purple/20">
                    <h2 className="text-xl font-black text-gorilla-purple mb-6 flex items-center gap-2">
                        <Users size={24}/> REGISTRO DE PERSONAL
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">NOMBRE COMPLETO</label>
                        <input className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none"
                            value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">CÉDULA (LOGIN)</label>
                        <input className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none font-black tracking-widest"
                            value={formUsuario.cedula} onChange={e => setFormUsuario({...formUsuario, cedula: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">CELULAR</label>
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-4 text-gray-600" size={16}/>
                            <input className="w-full bg-black/40 border border-white/10 p-4 pl-10 rounded-2xl outline-none"
                                value={formUsuario.telefono} onChange={e => setFormUsuario({...formUsuario, telefono: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">ROL ASIGNADO</label>
                        <select className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none text-gray-400"
                            value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}>
                            <option value="empleado">Operador (Celular)</option>
                            <option value="administrador">Administrador (PC)</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={guardarUsuario} className="mt-6 w-full bg-gorilla-purple hover:bg-violet-600 p-5 rounded-2xl font-black shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-3">
                      <ShieldCheck size={20}/> VINCULAR AL EQUIPO
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usuarios.map(u => (
                      <div key={u.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${u.rol === 'administrador' ? 'bg-gorilla-orange/20 text-gorilla-orange' : 'bg-gorilla-purple/20 text-gorilla-purple'}`}>
                                {u.nombre[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight uppercase">{u.nombre}</h3>
                                <p className="text-[10px] text-gray-500 font-mono tracking-widest">ID: {u.cedula}</p>
                            </div>
                        </div>
                        <button onClick={() => eliminarDato('perfiles', u.id)} className="p-3 text-red-500/20 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA PARQUEADERO (ULTRA DISEÑO) */}
              {activeTab === 'parqueadero' && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative mb-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="absolute -inset-6 border-2 border-dashed border-gorilla-orange/20 rounded-full" />
                    <div className="w-24 h-24 bg-gorilla-orange/10 rounded-full flex items-center justify-center border border-gorilla-orange/30">
                        <Car className="text-gorilla-orange w-12 h-12" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Módulo de <span className="text-gorilla-orange">Estancia</span></h2>
                  <p className="text-gray-500 max-w-sm font-medium leading-relaxed">Estamos puliendo los sensores. Pronto podrás configurar cobros automáticos por tiempo para vehículos.</p>
                  
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md opacity-20 filter blur-[1px]">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">---</div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">---</div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, color }: any) {
  const activeStyles = color === 'orange' 
    ? 'bg-gorilla-orange text-white shadow-[0_10px_20px_rgba(244,127,32,0.3)] translate-x-1 lg:translate-x-2' 
    : 'bg-gorilla-purple text-white shadow-[0_10px_20px_rgba(139,92,246,0.3)] translate-x-1 lg:translate-x-2'

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all duration-300 whitespace-nowrap border border-white/5 ${
        active 
        ? activeStyles 
        : 'bg-white/[0.03] text-gray-500 hover:bg-white/10 hover:text-gray-300'
      }`}
    >
      <span className={active ? 'scale-110' : ''}>{icon}</span>
      {label}
    </button>
  )
}