'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Settings, Users, Car, Bike, Trash2, Plus, Save, X, Edit3, Clock, Check, Info, UserPlus, DollarSign, Layers, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // --- DATOS ---
  const [servicios, setServicios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any>({
    carro: { precio_dia: 0, precio_mes: 0 },
    moto: { precio_dia: 0, precio_mes: 0 }
  })

  // --- ESTADOS DE MODALES ---
  const [modalServicio, setModalServicio] = useState(false)
  const [modalUsuario, setModalUsuario] = useState(false)

  // --- FORMULARIOS ---
  const [formServicio, setFormServicio] = useState({ id: null, nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
  const [formUsuario, setFormUsuario] = useState({ id: null, nombre: '', cedula: '', telefono: '', rol: 'empleado' })

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

  // --- LÓGICA DE SERVICIOS ---
  const abrirModalNuevoServicio = () => {
    setFormServicio({ id: null, nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
    setModalServicio(true)
  }
  const abrirModalEditarServicio = (s: any) => {
    setFormServicio(s)
    setModalServicio(true)
  }
  const guardarServicio = async () => {
    if (!formServicio.nombre) return
    if (formServicio.id) {
      await supabase.from('servicios').update(formServicio).eq('id', formServicio.id)
    } else {
      await supabase.from('servicios').insert([formServicio])
    }
    setModalServicio(false)
    fetchData()
  }

  // --- LÓGICA DE USUARIOS ---
  const abrirModalNuevoUsuario = () => {
    setFormUsuario({ id: null, nombre: '', cedula: '', telefono: '', rol: 'empleado' })
    setModalUsuario(true)
  }
  const abrirModalEditarUsuario = (u: any) => {
    setFormUsuario({ id: u.id, nombre: u.nombre, cedula: u.cedula, telefono: u.telefono || '', rol: u.rol })
    setModalUsuario(true)
  }
  const guardarUsuario = async () => {
    if (!formUsuario.cedula) return
    if (formUsuario.id) {
      await supabase.from('perfiles').update(formUsuario).eq('id', formUsuario.id)
    } else {
      await supabase.from('perfiles').insert([formUsuario])
    }
    setModalUsuario(false)
    fetchData()
  }

  // --- FUNCIONES GLOBALES ---
  const eliminarDato = async (tabla: string, id: string) => {
    if (confirm('¿Confirmas la eliminación definitiva? Esto no se puede deshacer.')) {
      await supabase.from(tabla).delete().eq('id', id)
      fetchData()
    }
  }
  const actualizarTarifa = async (tipo: 'carro' | 'moto', precios: any) => {
    const datosActualizados = { precio_dia: Number(precios.dia || 0), precio_mes: Number(precios.mes || 0), actualizado_en: new Date().toISOString() }
    await supabase.from('config_parqueadero').update(datosActualizados).eq('tipo_vehiculo', tipo)
    fetchData()
  }

  return (
    <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 md:px-8 lg:px-10 pb-32 overflow-x-hidden">

      {/* HEADER */}
      <header className="max-w-5xl mx-auto mb-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6">
          <div className="p-4 md:p-5 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 text-gorilla-orange">
            <Settings className="w-8 h-8 md:w-10 md:h-10 animate-spin-slow" />
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

      <main className="max-w-5xl mx-auto space-y-16">

        {/* ---------------- SECCIÓN: SERVICIOS ---------------- */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
                <Layers className="text-gorilla-orange" /> Catálogo de Servicios
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configura las opciones de lavado</p>
            </div>
            <button onClick={abrirModalNuevoServicio} className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 w-fit">
              <Plus size={16} /> Nuevo Servicio
            </button>
          </div>

          <div className="space-y-3">
            {servicios.map(s => (
              <div key={s.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                    {s.aplica_a === 'carro' ? <Car size={18} /> : s.aplica_a === 'moto' ? <Bike size={18} /> : <Layers size={18} />}
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase text-slate-800 leading-tight">{s.nombre}</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Aplica a: {s.aplica_a}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-none border-slate-200 pt-3 md:pt-0">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-[10px] font-black text-gorilla-orange tracking-widest">CARRO: ${s.precio_carro.toLocaleString()}</span>
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">MOTO: ${s.precio_moto.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModalEditarServicio(s)} className="p-2 text-slate-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-lg transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => eliminarDato('servicios', s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LÍNEA DIVISORIA */}
        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-px bg-slate-300 flex-1"></div>
          <Users size={16} className="text-slate-400" />
          <div className="h-px bg-slate-300 flex-1"></div>
        </div>

        {/* ---------------- SECCIÓN: PERSONAL ---------------- */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
                <Users className="text-gorilla-purple" /> Gestión de Personal
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Administra los accesos al sistema</p>
            </div>
            <button onClick={abrirModalNuevoUsuario} className="bg-gorilla-purple hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-purple-200 flex items-center gap-2 w-fit">
              <UserPlus size={16} /> Nuevo Personal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usuarios.map(u => (
              <div key={u.id} className="bg-slate-50 border border-slate-100 p-4 rounded-[1.5rem] flex items-center justify-between group hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-4 overflow-hidden pr-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${u.rol === 'administrador' ? 'bg-orange-100 text-gorilla-orange' : 'bg-purple-100 text-gorilla-purple'}`}>
                    {u.nombre[0].toUpperCase()}
                  </div>
                  <div className="truncate">
                    <h3 className="font-black text-sm uppercase italic text-slate-800 leading-tight truncate">{u.nombre}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">CC: {u.cedula} • {u.rol}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => abrirModalEditarUsuario(u)} className="p-2.5 text-slate-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-lg transition-all"><Edit3 size={16} /></button>
                  <button onClick={() => eliminarDato('perfiles', u.id)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LÍNEA DIVISORIA */}
        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-px bg-slate-300 flex-1"></div>
          <Clock size={16} className="text-slate-400" />
          <div className="h-px bg-slate-300 flex-1"></div>
        </div>

        {/* ---------------- SECCIÓN: TARIFAS PARQUEO ---------------- */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="mb-8">
            <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
              <Clock className="text-blue-500" /> Tarifas de Parqueo
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Costos base por vehículo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <TarifaCard tipo="carro" icono={<Car size={24} />} valores={tarifas.carro} onSave={(tipo: any, v: any) => actualizarTarifa('carro', v)} />
            <TarifaCard tipo="moto" icono={<Bike size={24} />} valores={tarifas.moto} onSave={(tipo: any, v: any) => actualizarTarifa('moto', v)} />
          </div>

          <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex items-start gap-4">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-widest">Nota: Las tarifas actualizadas se aplicarán a los nuevos ingresos de vehículos en el patio. Las liquidaciones anteriores no se verán afectadas.</p>
          </div>
        </section>
      </main>

      {/* ================= MODALES FLOTANTES ================= */}

      {/* MODAL SERVICIOS */}
      <AnimatePresence>
        {modalServicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gorilla-orange" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tight">{formServicio.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <button onClick={() => setModalServicio(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <FormInput label="Nombre del Servicio" value={formServicio.nombre} onChange={(e: any) => setFormServicio({ ...formServicio, nombre: e.target.value })} />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Aplica a</label>
                  <select className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl outline-none font-bold text-sm" value={formServicio.aplica_a} onChange={(e: any) => setFormServicio({ ...formServicio, aplica_a: e.target.value })}>
                    <option value="carro">Solo Carros</option><option value="moto">Solo Motos</option><option value="ambos">Ambos Vehículos</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Precio Carro" type="number" icon={<DollarSign size={14} />} value={formServicio.precio_carro} onChange={(e: any) => setFormServicio({ ...formServicio, precio_carro: Number(e.target.value) })} />
                  <FormInput label="Precio Moto" type="number" icon={<DollarSign size={14} />} value={formServicio.precio_moto} onChange={(e: any) => setFormServicio({ ...formServicio, precio_moto: Number(e.target.value) })} />
                </div>
                <button onClick={guardarServicio} className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  Guardar <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL USUARIOS */}
      <AnimatePresence>
        {modalUsuario && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gorilla-purple" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tight">{formUsuario.id ? 'Editar Personal' : 'Vincular Personal'}</h2>
                <button onClick={() => setModalUsuario(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <FormInput label="Nombre Completo" value={formUsuario.nombre} onChange={(e: any) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Cédula" value={formUsuario.cedula} onChange={(e: any) => setFormUsuario({ ...formUsuario, cedula: e.target.value })} />
                  <FormInput label="Teléfono" value={formUsuario.telefono} onChange={(e: any) => setFormUsuario({ ...formUsuario, telefono: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Rol del Sistema</label>
                  <select className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl outline-none font-bold text-sm" value={formUsuario.rol} onChange={(e: any) => setFormUsuario({ ...formUsuario, rol: e.target.value })}>
                    <option value="empleado">Operador Lavado</option><option value="administrador">Administrador</option>
                  </select>
                </div>
                <button onClick={guardarUsuario} className="w-full bg-gorilla-purple text-white p-4 rounded-xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all">
                  Guardar <Check size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

// --- COMPONENTES AUXILIARES ---

function FormInput({ label, icon, ...props }: any) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[9px] font-black uppercase ml-1 tracking-widest text-slate-400">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input {...props} className={`w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl outline-none focus:border-gorilla-orange focus:bg-white font-bold text-sm transition-all ${icon ? 'pl-9' : ''}`} />
      </div>
    </div>
  )
}

function TarifaCard({ tipo, icono, valores, onSave }: any) {
  const [vals, setVals] = useState({ dia: 0, mes: 0 })
  const [saved, setSaved] = useState(false)

  useEffect(() => { setVals({ dia: valores?.precio_dia || 0, mes: valores?.precio_mes || 0 }) }, [valores])

  return (
    <div className="bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] relative overflow-hidden group hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm">{icono}</div>
        <h3 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">{tipo}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MiniInput label="Día" value={vals.dia} onChange={(v: any) => setVals({ ...vals, dia: v })} />
        <MiniInput label="Mes" value={vals.mes} onChange={(v: any) => setVals({ ...vals, mes: v })} />
      </div>
      <button onClick={() => { onSave(tipo, vals); setSaved(true); setTimeout(() => setSaved(false), 2000) }} className={`w-full mt-5 p-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white'}`}>
        {saved ? <><Check size={16} /> Listo</> : 'Actualizar'}
      </button>
    </div>
  )
}

function MiniInput({ label, value, onChange }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input type="number" value={value} onChange={(e: any) => onChange(Number(e.target.value))} className="w-full bg-white border border-slate-200 p-3 pl-8 rounded-lg text-sm font-black outline-none focus:border-gorilla-orange text-slate-900 transition-colors" />
      </div>
    </div>
  )
}