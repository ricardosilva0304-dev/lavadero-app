'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Settings, Users, Car, Bike, Trash2, Plus, 
  ShieldCheck, Smartphone, DollarSign, Briefcase 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    if(confirm('¿Eliminar definitivamente?')) {
      await supabase.from(tabla).delete().eq('id', id)
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 relative">
      
      <header className="max-w-6xl mx-auto mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-md">
            <Settings className="w-8 h-8 text-gorilla-orange animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-gray-900">Panel de <span className="text-gorilla-orange">Control</span></h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Configuración del Sistema</p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* NAVEGACIÓN */}
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
              className="bg-white border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-gray-200/50"
            >
              
              {/* SERVICIOS */}
              {activeTab === 'servicios' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <div className="space-y-4 col-span-full">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase italic">
                            <Plus size={24} className="text-gorilla-orange"/> Nuevo Servicio
                        </h2>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Nombre</label>
                        <input placeholder="Ej: Lavado Premium" className="w-full bg-white border border-gray-200 p-4 rounded-2xl focus:border-gorilla-orange outline-none transition-all text-gray-900" 
                            value={formServicio.nombre} onChange={e => setFormServicio({...formServicio, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Aplica a:</label>
                        <select className="w-full bg-white border border-gray-200 p-4 rounded-2xl focus:border-gorilla-orange outline-none text-gray-600"
                            value={formServicio.aplica_a} onChange={e => setFormServicio({...formServicio, aplica_a: e.target.value})}>
                            <option value="carro">Solo Carros</option>
                            <option value="moto">Solo Motos</option>
                            <option value="ambos">Ambos Vehículos</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4 col-span-full">
                        {(formServicio.aplica_a === 'carro' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Precio Carro</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-4 text-gorilla-orange" size={16}/>
                                    <input type="number" className="w-full bg-white border border-gray-200 p-4 pl-10 rounded-2xl outline-none text-gray-900"
                                        onChange={e => setFormServicio({...formServicio, precio_carro: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                        {(formServicio.aplica_a === 'moto' || formServicio.aplica_a === 'ambos') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Precio Moto</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-4 text-gorilla-orange" size={16}/>
                                    <input type="number" className="w-full bg-white border border-gray-200 p-4 pl-10 rounded-2xl outline-none text-gray-900"
                                        onChange={e => setFormServicio({...formServicio, precio_moto: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={guardarServicio} className="col-span-full bg-gorilla-orange hover:bg-orange-600 p-5 rounded-2xl font-black text-white shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-3">
                      GUARDAR SERVICIO
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest px-2">Servicios Activos</h3>
                    {servicios.map(s => (
                      <div key={s.id} className="group bg-white p-5 rounded-[2rem] flex justify-between items-center border border-gray-100 hover:border-gray-300 shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gorilla-orange group-hover:scale-110 transition-transform">
                            {s.aplica_a === 'carro' ? <Car size={24}/> : s.aplica_a === 'moto' ? <Bike size={24}/> : <ShieldCheck size={24}/>}
                          </div>
                          <div>
                            <h3 className="font-black text-lg tracking-tight uppercase text-gray-900">{s.nombre}</h3>
                            <div className="flex gap-4 mt-1">
                                {s.precio_carro > 0 && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-bold">CARRO: ${s.precio_carro.toLocaleString()}</span>}
                                {s.precio_moto > 0 && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-lg font-bold">MOTO: ${s.precio_moto.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => eliminarDato('servicios', s.id)} className="p-4 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* USUARIOS */}
              {activeTab === 'usuarios' && (
                <div className="space-y-8">
                  <div className="bg-purple-50 p-8 rounded-[2rem] border border-purple-100">
                    <h2 className="text-xl font-black text-gorilla-purple mb-6 flex items-center gap-2 uppercase italic">
                        <Users size={24}/> Nuevo Personal
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">NOMBRE COMPLETO</label>
                        <input className="w-full bg-white border border-purple-100 p-4 rounded-2xl outline-none focus:border-gorilla-purple text-gray-900"
                            value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">CÉDULA (LOGIN)</label>
                        <input className="w-full bg-white border border-purple-100 p-4 rounded-2xl outline-none font-black tracking-widest text-gray-900"
                            value={formUsuario.cedula} onChange={e => setFormUsuario({...formUsuario, cedula: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">CELULAR</label>
                        <input className="w-full bg-white border border-purple-100 p-4 rounded-2xl outline-none text-gray-900"
                                value={formUsuario.telefono} onChange={e => setFormUsuario({...formUsuario, telefono: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2">ROL</label>
                        <select className="w-full bg-white border border-purple-100 p-4 rounded-2xl outline-none text-gray-600"
                            value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}>
                            <option value="empleado">Operador (Celular)</option>
                            <option value="administrador">Administrador (PC)</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={guardarUsuario} className="mt-6 w-full bg-gorilla-purple hover:bg-violet-700 text-white p-5 rounded-2xl font-black shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-3">
                      REGISTRAR USUARIO
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usuarios.map(u => (
                      <div key={u.id} className="bg-white border border-gray-200 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${u.rol === 'administrador' ? 'bg-orange-50 text-gorilla-orange' : 'bg-purple-50 text-gorilla-purple'}`}>
                                {u.nombre[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight uppercase text-gray-900">{u.nombre}</h3>
                                <p className="text-[10px] text-gray-400 font-mono tracking-widest">ID: {u.cedula}</p>
                            </div>
                        </div>
                        <button onClick={() => eliminarDato('perfiles', u.id)} className="p-3 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PARQUEADERO PLACEHOLDER */}
              {activeTab === 'parqueadero' && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <Car className="text-gray-300 w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-gray-400">Configuración Pendiente</h2>
                  <p className="text-gray-400 max-w-sm mt-2 font-medium">Próximamente podrás ajustar tarifas automáticas aquí.</p>
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
    ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-200' 
    : 'bg-gorilla-purple text-white shadow-lg shadow-purple-200'

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all duration-300 whitespace-nowrap border ${
        active 
        ? `${activeStyles} border-transparent translate-x-1` 
        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'
      }`}
    >
      <span className={active ? 'scale-110' : ''}>{icon}</span>
      {label}
    </button>
  )
}