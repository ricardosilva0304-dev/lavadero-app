'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Settings, Users, Car, Bike, Trash2, Plus,
  ShieldCheck, Smartphone, DollarSign, Briefcase,
  UserPlus, Layers, Save, X, Edit3, Clock, Check, Info, Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('servicios')
  const [loading, setLoading] = useState(true)

  // Datos de la DB
  const [servicios, setServicios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any>({
    carro: { precio_dia: 0, precio_mes: 0 },
    moto: { precio_dia: 0, precio_mes: 0 }
  })

  // Estados de Edición
  const [editandoUser, setEditandoUser] = useState<string | null>(null)

  // Formularios
  const [formServicio, setFormServicio] = useState({ nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
  const [formUsuario, setFormUsuario] = useState({ nombre: '', cedula: '', telefono: '', rol: 'empleado' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: srv } = await supabase.from('servicios').select('*').order('creado_en')
    const { data: usr } = await supabase.from('perfiles').select('*').order('nombre')
    const { data: trf } = await supabase.from('config_parqueadero').select('*')

    setServicios(srv || [])
    setUsuarios(usr || [])

    if (trf) {
      const carData = trf.find(t => t.tipo_vehiculo === 'carro') || { precio_dia: 0, precio_mes: 0 }
      const motoData = trf.find(t => t.tipo_vehiculo === 'moto') || { precio_dia: 0, precio_mes: 0 }
      setTarifas({ carro: carData, moto: motoData })
    }
    setLoading(false)
  }

  const guardarServicio = async () => {
    if (!formServicio.nombre) return
    await supabase.from('servicios').insert([formServicio])
    setFormServicio({ nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
    fetchData()
  }

  const seleccionarUsuarioParaEditar = (u: any) => {
    setEditandoUser(u.id)
    setFormUsuario({ nombre: u.nombre, cedula: u.cedula, telefono: u.telefono || '', rol: u.rol })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardarOActualizarUsuario = async () => {
    if (!formUsuario.cedula) return
    if (editandoUser) {
      await supabase.from('perfiles').update(formUsuario).eq('id', editandoUser)
      setEditandoUser(null)
    } else {
      await supabase.from('perfiles').insert([formUsuario])
    }
    setFormUsuario({ nombre: '', cedula: '', telefono: '', rol: 'empleado' })
    fetchData()
  }

  const actualizarTarifa = async (tipo: 'carro' | 'moto', precios: any) => {
    const datosActualizados = {
      precio_dia: Number(precios.dia || 0),
      precio_mes: Number(precios.mes || 0),
      actualizado_en: new Date().toISOString()
    }
    const { error } = await supabase.from('config_parqueadero').update(datosActualizados).eq('tipo_vehiculo', tipo)
    if (!error) fetchData()
  }

  const eliminarDato = async (tabla: string, id: string) => {
    if (confirm('¿Confirmas la eliminación definitiva?')) {
      await supabase.from(tabla).delete().eq('id', id)
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-8 lg:p-10 pb-32">

      <header className="max-w-7xl mx-auto mb-8 lg:mb-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 md:gap-6">
          <div className="p-4 md:p-5 bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 text-gorilla-orange">
            <Settings className="w-6 h-6 md:w-10 md:h-10 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Control System</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                Central <span className="text-gorilla-orange">Core</span>
            </h1>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

        {/* NAVEGACIÓN */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 no-scrollbar sticky top-0 z-30 -mx-4 px-4 lg:mx-0 lg:px-0">
          <TabButton active={activeTab === 'servicios'} onClick={() => setActiveTab('servicios')} icon={<Layers size={20} />} label="Servicios" color="orange" />
          <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon={<UserPlus size={20} />} label="Personal" color="purple" />
          <TabButton active={activeTab === 'parqueadero'} onClick={() => setActiveTab('parqueadero')} icon={<Clock size={20} />} label="Tarifas" color="orange" />
        </nav>

        {/* CONTENIDO */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-slate-200 rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 lg:p-12 shadow-2xl shadow-slate-200/40 border-white"
            >

              {/* SERVICIOS */}
              {activeTab === 'servicios' && (
                <div className="space-y-12">
                  <div className="bg-slate-50 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-inner">
                    <h2 className="text-xl font-black text-slate-800 mb-8 italic uppercase tracking-tighter flex items-center gap-3">
                        <Plus className="text-gorilla-orange" /> Nuevo Servicio Comercial
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <FormInput label="Nombre del servicio" placeholder="Ej: Lavado Full" value={formServicio.nombre} onChange={(e: any) => setFormServicio({ ...formServicio, nombre: e.target.value })} />
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Aplica a</label>
                        <select className="w-full bg-white border-2 border-slate-100 p-4 md:p-5 rounded-3xl outline-none font-bold text-slate-600 appearance-none cursor-pointer"
                          value={formServicio.aplica_a} onChange={(e: any) => setFormServicio({ ...formServicio, aplica_a: e.target.value })}>
                          <option value="carro">Solo Carros</option>
                          <option value="moto">Solo Motos</option>
                          <option value="ambos">Ambos Vehículos</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 md:gap-8 mt-8">
                      {(formServicio.aplica_a === 'carro' || formServicio.aplica_a === 'ambos') && (
                        <FormInput label="Tarifa Carro" type="number" icon={<DollarSign size={16} />} onChange={(e: any) => setFormServicio({ ...formServicio, precio_carro: Number(e.target.value) })} />
                      )}
                      {(formServicio.aplica_a === 'moto' || formServicio.aplica_a === 'ambos') && (
                        <FormInput label="Tarifa Moto" type="number" icon={<DollarSign size={16} />} onChange={(e: any) => setFormServicio({ ...formServicio, precio_moto: Number(e.target.value) })} />
                      )}
                    </div>
                    <button onClick={guardarServicio} className="mt-10 w-full bg-slate-900 hover:bg-black text-white p-6 rounded-[2rem] font-black italic uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                      Registrar en Catálogo
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-4">Servicios Actuales</h3>
                    {servicios.map(s => (
                      <div key={s.id} className="group bg-white p-5 rounded-[2rem] flex justify-between items-center border border-slate-100 hover:border-gorilla-orange shadow-sm transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-gorilla-orange shadow-sm">
                            {s.aplica_a === 'carro' ? <Car size={24} /> : s.aplica_a === 'moto' ? <Bike size={24} /> : <Briefcase size={24} />}
                          </div>
                          <div>
                            <h3 className="font-black text-lg uppercase italic text-slate-800 leading-none">{s.nombre}</h3>
                            <div className="flex gap-3 mt-2">
                              {s.precio_carro > 0 && <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase italic">Car: ${s.precio_carro.toLocaleString()}</span>}
                              {s.precio_moto > 0 && <span className="bg-gorilla-orange text-white text-[8px] font-black px-3 py-1 rounded-full uppercase italic">Mot: ${s.precio_moto.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => eliminarDato('servicios', s.id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PERSONAL (CRUD) */}
              {activeTab === 'usuarios' && (
                <div className="space-y-12">
                  <div className={`p-8 md:p-12 rounded-[3.5rem] shadow-2xl transition-all relative overflow-hidden ${editandoUser ? 'bg-gorilla-orange/10 border-gorilla-orange/20' : 'bg-slate-900'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-white"><Users size={120} /></div>
                    <h2 className="text-xl font-black mb-8 flex items-center gap-3 uppercase italic text-white relative z-10">
                      {editandoUser ? <Edit3 size={24} /> : <UserPlus size={24} />}
                      {editandoUser ? 'Modificar Usuario' : 'Nueva Vinculación'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <FormInput dark label="Nombre Completo" value={formUsuario.nombre} onChange={(e: any) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} />
                      <FormInput dark label="Cédula" value={formUsuario.cedula} onChange={(e: any) => setFormUsuario({ ...formUsuario, cedula: e.target.value })} />
                      <FormInput dark label="WhatsApp" value={formUsuario.telefono} onChange={(e: any) => setFormUsuario({ ...formUsuario, telefono: e.target.value })} />
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Rol asignado</label>
                        <select className="w-full bg-white/10 border border-white/10 p-5 rounded-[1.5rem] text-white font-bold outline-none cursor-pointer appearance-none"
                          value={formUsuario.rol} onChange={(e: any) => setFormUsuario({ ...formUsuario, rol: e.target.value })}>
                          <option value="empleado" className="text-slate-900">Operador Lavado</option>
                          <option value="administrador" className="text-slate-900">Administrador</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-10 relative z-10">
                      {editandoUser && (
                        <button onClick={() => { setEditandoUser(null); setFormUsuario({ nombre: '', cedula: '', telefono: '', rol: 'empleado' }) }} className="flex-1 bg-white/10 text-white p-6 rounded-3xl font-black uppercase text-xs">Cancelar</button>
                      )}
                      <button onClick={guardarOActualizarUsuario} className={`flex-[2] p-6 rounded-3xl font-black italic uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${editandoUser ? 'bg-white text-gorilla-orange' : 'bg-gorilla-purple text-white shadow-purple-900/40'}`}>
                        {editandoUser ? 'Actualizar Perfil' : 'Dar de Alta Personal'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {usuarios.map(u => (
                      <div key={u.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${u.rol === 'administrador' ? 'bg-orange-100 text-gorilla-orange' : 'bg-purple-100 text-gorilla-purple'}`}>
                            {u.nombre[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-lg uppercase italic text-slate-800 leading-tight">{u.nombre}</h3>
                            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-1">{u.rol} • CC: {u.cedula}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => seleccionarUsuarioParaEditar(u)} className="p-3 text-slate-300 hover:text-gorilla-purple hover:bg-purple-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                          <button onClick={() => eliminarDato('perfiles', u.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TARIFAS PARQUEO (SOLO DIA Y MES) */}
              {activeTab === 'parqueadero' && (
                <div className="space-y-12">
                    <header className="px-4">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3 mb-2">
                            <Clock className="text-gorilla-orange" /> Tarifas de Estancia
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Configura los precios únicos para servicios de día completo y mensualidad.</p>
                    </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <TarifaCard
                      tipo="carro"
                      icono={<Car size={40} />}
                      valores={tarifas.carro}
                      onSave={(tipo: any, v: any) => actualizarTarifa('carro', v)}
                    />
                    <TarifaCard
                      tipo="moto"
                      icono={<Bike size={40} />}
                      valores={tarifas.moto}
                      onSave={(tipo: any, v: any) => actualizarTarifa('moto', v)}
                    />
                  </div>
                  
                  <div className="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-start gap-4">
                     <Info className="text-gorilla-orange shrink-0 mt-1" size={20}/>
                     <p className="text-xs font-bold text-orange-800 leading-relaxed uppercase italic">Nota: Al actualizar estas tarifas, el sistema de parqueadero reflejará los nuevos precios automáticamente para los próximos registros.</p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-gorilla-orange { background-color: #FF6B00; }
        .text-gorilla-orange { color: #FF6B00; }
        .border-gorilla-orange { border-color: #FF6B00; }
        .bg-gorilla-purple { background-color: #8B5CF6; }
      `}</style>
    </div>
  )
}

// --- COMPONENTES AUXILIARES ---

function FormInput({ label, dark, icon, ...props }: any) {
  return (
    <div className="space-y-2 flex-1">
      <label className={`text-[9px] font-black uppercase ml-2 tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gorilla-orange">{icon}</div>}
        <input
          {...props}
          className={`w-full border-2 p-5 rounded-[1.5rem] outline-none transition-all font-bold text-sm ${dark
            ? 'bg-white/10 border-white/10 text-white focus:bg-white focus:text-slate-900 focus:border-white'
            : 'bg-white border-slate-100 text-slate-900 focus:border-gorilla-orange shadow-sm'
            } ${icon ? 'pl-12' : ''}`}
        />
      </div>
    </div>
  )
}

function TarifaCard({ tipo, icono, valores, onSave }: any) {
  const [vals, setVals] = useState({ dia: 0, mes: 0 })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setVals({
      dia: valores?.precio_dia || 0,
      mes: valores?.precio_mes || 0
    })
  }, [valores])

  return (
    <div className="bg-white border-2 border-slate-100 p-10 rounded-[3.5rem] shadow-xl hover:shadow-2xl transition-all group border-white">
      <div className="flex justify-between items-start mb-10">
        <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-lg group-hover:scale-110 transition-transform">
          {icono}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</p>
          <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">{tipo}</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <MiniInput label="Precio por Día" value={vals.dia} onChange={(v: any) => setVals({...vals, dia: v})} />
        <MiniInput label="Precio por Mes" value={vals.mes} onChange={(v: any) => setVals({...vals, mes: v})} />
      </div>

      <button 
        onClick={() => {onSave(tipo, vals); setSaved(true); setTimeout(() => setSaved(false), 2000)}}
        className={`w-full mt-10 p-6 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${saved ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-900 text-white hover:bg-black'}`}
      >
        {saved ? <><Check size={20} strokeWidth={4}/> Actualizado</> : <><Save size={20}/> Guardar Tarifas</>}
      </button>
    </div>
  )
}

function MiniInput({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>
      <div className="relative">
        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gorilla-orange" size={20} />
        <input
          type="number"
          value={value}
          onChange={(e: any) => onChange(Number(e.target.value))}
          className="w-full bg-slate-50 border-none p-5 pl-10 rounded-2xl text-2xl font-black outline-none focus:ring-4 focus:ring-orange-500/10 text-slate-900 shadow-inner"
        />
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, color }: any) {
  const activeStyles = color === 'orange'
    ? 'bg-white text-gorilla-orange border-gorilla-orange shadow-[0_20px_40px_rgba(244,127,32,0.15)] ring-4 ring-orange-50'
    : 'bg-white text-gorilla-purple border-gorilla-purple shadow-[0_20px_40px_rgba(139,92,246,0.15)] ring-4 ring-purple-50'

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-8 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all duration-500 whitespace-nowrap border-2 ${active
        ? `${activeStyles} translate-x-2`
        : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
      <span className={active ? 'scale-125' : 'opacity-40'}>{icon}</span>
      {label}
    </button>
  )
}