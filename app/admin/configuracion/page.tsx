'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Settings, Users, Car, Bike, Trash2, Plus, 
  ShieldCheck, Smartphone, DollarSign, Briefcase, 
  ChevronRight, UserPlus, Layers, Info
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 relative">
      
      <header className="max-w-7xl mx-auto mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-gorilla-orange">
            <Settings className="w-10 h-10 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Sistema Core</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900">Configuración <span className="text-gorilla-orange">General</span></h1>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* NAVEGACIÓN LATERAL */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
          <TabButton active={activeTab === 'servicios'} onClick={() => setActiveTab('servicios')} icon={<Layers size={20}/>} label="Servicios" color="orange" />
          <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon={<UserPlus size={20}/>} label="Personal" color="purple" />
          <TabButton active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} icon={<Car size={20}/>} label="Tarifas" color="orange" />
        </nav>

        {/* ÁREA DE CONTENIDO */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/60"
            >
              
              {/* VISTA SERVICIOS */}
              {activeTab === 'servicios' && (
                <div className="space-y-12">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <h2 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-widest">
                        <Plus size={18} className="text-gorilla-orange" /> Crear nuevo servicio comercial
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Nombre del servicio</label>
                        <input placeholder="Ej: Lavado de Motor" className="w-full bg-white border border-slate-200 p-5 rounded-2xl focus:border-gorilla-orange outline-none transition-all font-bold text-slate-900" 
                            value={formServicio.nombre} onChange={e => setFormServicio({...formServicio, nombre: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tipo de Vehículo</label>
                        <select className="w-full bg-white border border-slate-200 p-5 rounded-2xl focus:border-gorilla-orange outline-none font-bold text-slate-600 appearance-none cursor-pointer"
                            value={formServicio.aplica_a} onChange={e => setFormServicio({...formServicio, aplica_a: e.target.value})}>
                            <option value="carro">Solo Carros</option>
                            <option value="moto">Solo Motos</option>
                            <option value="ambos">Ambos (Carro y Moto)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-6 col-span-full">
                        {(formServicio.aplica_a === 'carro' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tarifa Carro</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-5 text-gorilla-orange" size={20}/>
                                    <input type="number" className="w-full bg-white border border-slate-200 p-5 pl-10 rounded-2xl outline-none font-black text-slate-900"
                                        onChange={e => setFormServicio({...formServicio, precio_carro: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                        {(formServicio.aplica_a === 'moto' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tarifa Moto</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-5 text-gorilla-orange" size={20}/>
                                    <input type="number" className="w-full bg-white border border-slate-200 p-5 pl-10 rounded-2xl outline-none font-black text-slate-900"
                                        onChange={e => setFormServicio({...formServicio, precio_moto: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                      </div>
                    </div>
                    <button onClick={guardarServicio} className="mt-8 w-full bg-slate-900 hover:bg-black text-white p-6 rounded-3xl font-black italic uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">
                      Dar de Alta Servicio
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Portafolio Actual</h3>
                    <div className="grid gap-3">
                      {servicios.map(s => (
                        <div key={s.id} className="group bg-white p-6 rounded-[2rem] flex justify-between items-center border border-slate-100 hover:border-gorilla-orange/30 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-gorilla-orange group-hover:scale-110 transition-transform border border-slate-100">
                              {s.aplica_a === 'carro' ? <Car size={28}/> : s.aplica_a === 'moto' ? <Bike size={28}/> : <Briefcase size={28}/>}
                            </div>
                            <div>
                              <h3 className="font-black text-lg tracking-tight uppercase text-slate-800 italic">{s.nombre}</h3>
                              <div className="flex gap-4 mt-1">
                                  {s.precio_carro > 0 && <span className="text-[9px] bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-black uppercase">Carro: ${s.precio_carro.toLocaleString()}</span>}
                                  {s.precio_moto > 0 && <span className="text-[9px] bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-black uppercase">Moto: ${s.precio_moto.toLocaleString()}</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => eliminarDato('servicios', s.id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <Trash2 size={20}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA USUARIOS */}
              {activeTab === 'usuarios' && (
                <div className="space-y-12">
                  <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-white">
                        <UserPlus size={100} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3 uppercase italic relative z-10">
                        <ShieldCheck size={24} className="text-gorilla-purple" /> Vinculación de Personal
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 ml-2 uppercase tracking-widest">Nombre Completo</label>
                        <input className="w-full bg-white/10 border border-white/10 p-5 rounded-2xl outline-none focus:bg-white focus:text-slate-900 transition-all font-bold text-white uppercase"
                            value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 ml-2 uppercase tracking-widest">Documento (Cédula)</label>
                        <input className="w-full bg-white/10 border border-white/10 p-5 rounded-2xl outline-none focus:bg-white focus:text-slate-900 transition-all font-black tracking-widest text-white"
                            value={formUsuario.cedula} onChange={e => setFormUsuario({...formUsuario, cedula: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 ml-2 uppercase tracking-widest">Teléfono de Contacto</label>
                        <input className="w-full bg-white/10 border border-white/10 p-5 rounded-2xl outline-none focus:bg-white focus:text-slate-900 transition-all font-bold text-white"
                                value={formUsuario.telefono} onChange={e => setFormUsuario({...formUsuario, telefono: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 ml-2 uppercase tracking-widest">Perfil de Acceso</label>
                        <select className="w-full bg-white/10 border border-white/10 p-5 rounded-2xl outline-none font-bold text-white cursor-pointer appearance-none"
                            value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}>
                            <option value="empleado" className="text-slate-900">Operador Operativo (Celular)</option>
                            <option value="administrador" className="text-slate-900">Gerente / Administrador (PC)</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={guardarUsuario} className="mt-10 w-full bg-gorilla-purple hover:bg-violet-600 text-white p-6 rounded-3xl font-black italic uppercase tracking-[0.2em] shadow-xl shadow-purple-900/40 transition-all active:scale-95">
                      Registrar en Plantilla
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usuarios.map(u => (
                      <div key={u.id} className="bg-white border border-slate-200 p-6 rounded-[2.5rem] flex items-center justify-between group hover:shadow-lg transition-all">
                        <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center font-black text-xl shadow-inner ${u.rol === 'administrador' ? 'bg-orange-100 text-gorilla-orange' : 'bg-purple-100 text-gorilla-purple'}`}>
                                {u.nombre[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-lg uppercase italic text-slate-800">{u.nombre}</h3>
                                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Rol: {u.rol} • CC: {u.cedula}</p>
                            </div>
                        </div>
                        <button onClick={() => eliminarDato('perfiles', u.id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <Trash2 size={20}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PARQUEADERO PLACEHOLDER */}
              {activeTab === 'parqueadero' && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="relative mb-8">
                    <motion.div animate={{ scale: [1, 1.2, 1], rotate: 360 }} transition={{ duration: 10, repeat: Infinity }} className="absolute -inset-8 border-2 border-dashed border-slate-100 rounded-full" />
                    <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center shadow-inner">
                        <Car className="text-slate-200 w-16 h-16" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black italic uppercase text-slate-300 tracking-tighter">Módulo en Desarrollo</h2>
                  <p className="text-slate-400 max-w-sm mt-4 font-medium leading-relaxed uppercase text-[10px] tracking-widest">Estamos ajustando los algoritmos de cobro por tiempo para esta sección.</p>
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
    ? 'bg-white text-gorilla-orange border-gorilla-orange shadow-[0_15px_30px_rgba(244,127,32,0.15)] ring-4 ring-orange-50' 
    : 'bg-white text-gorilla-purple border-gorilla-purple shadow-[0_15px_30px_rgba(139,92,246,0.15)] ring-4 ring-purple-50'

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-8 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all duration-300 whitespace-nowrap border-2 ${
        active 
        ? `${activeStyles} translate-x-2` 
        : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <span className={active ? 'scale-125' : 'opacity-50'}>{icon}</span>
      {label}
    </button>
  )
}