'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Settings, Users, Car, Bike, Trash2, Plus, X, Edit3, Clock, Check, Info,
  UserPlus, DollarSign, Layers, ArrowRight, ShieldOff, AlertTriangle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { puedeVerConfiguracion, ETIQUETA_ROL } from '@/utils/roles'

export const dynamic = 'force-dynamic'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accesoDenegado, setAccesoDenegado] = useState(false)

  // --- DATOS ---
  const [servicios, setServicios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any>({
    carro: { precio_dia: 0, precio_mes: 0 },
    moto: { precio_dia: 0, precio_mes: 0 }
  })

  // --- MODALES CRUD ---
  const [modalServicio, setModalServicio] = useState(false)
  const [modalUsuario, setModalUsuario] = useState(false)

  // --- FORMULARIOS ---
  const [formServicio, setFormServicio] = useState({ id: null as any, nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
  const [formUsuario, setFormUsuario] = useState({ id: null as any, nombre: '', cedula: '', telefono: '', rol: 'empleado' })
  const [errorGuardar, setErrorGuardar] = useState('')

  // --- MODAL CONFIRMACIÓN BORRADO ---
  const [modalConfirm, setModalConfirm] = useState<{ tabla: string; id: string; nombre: string; tipo: 'servicio' | 'usuario' } | null>(null)
  const [errorEliminar, setErrorEliminar] = useState('')
  const [loadingEliminar, setLoadingEliminar] = useState(false)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) {
      router.push('/login')
      return
    }
    const rol = JSON.parse(userData).rol
    if (!puedeVerConfiguracion(rol)) {
      setAccesoDenegado(true)
      setLoading(false)
      return
    }
    fetchData()
  }, [router])

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    const [{ data: srv }, { data: usr }, { data: trf }] = await Promise.all([
      supabase.from('servicios').select('*').order('creado_en'),
      supabase.from('perfiles').select('*').order('nombre'),
      supabase.from('config_parqueadero').select('*'),
    ])
    setServicios(srv || [])
    setUsuarios(usr || [])
    if (trf) {
      const carData = trf.find(t => t.tipo_vehiculo === 'carro') || { precio_dia: 0, precio_mes: 0 }
      const motoData = trf.find(t => t.tipo_vehiculo === 'moto') || { precio_dia: 0, precio_mes: 0 }
      setTarifas({ carro: carData, moto: motoData })
    }
    setLoading(false)
  }

  // ── Servicios ───────────────────────────────────────────────────────────────
  const abrirModalNuevoServicio = () => {
    setFormServicio({ id: null, nombre: '', aplica_a: 'ambos', precio_carro: 0, precio_moto: 0 })
    setErrorGuardar('')
    setModalServicio(true)
  }
  const abrirModalEditarServicio = (s: any) => {
    setFormServicio(s)
    setErrorGuardar('')
    setModalServicio(true)
  }
  const guardarServicio = async () => {
    if (!formServicio.nombre.trim()) { setErrorGuardar('El nombre del servicio es obligatorio.'); return }
    setErrorGuardar('')
    const { id, ...payload } = formServicio
    const { error } = id
      ? await supabase.from('servicios').update(payload).eq('id', id)
      : await supabase.from('servicios').insert([payload])
    if (error) { setErrorGuardar(`Error al guardar: ${error.message}`); return }
    setModalServicio(false)
    fetchData()
  }

  // ── Usuarios ────────────────────────────────────────────────────────────────
  const abrirModalNuevoUsuario = () => {
    setFormUsuario({ id: null, nombre: '', cedula: '', telefono: '', rol: 'empleado' })
    setErrorGuardar('')
    setModalUsuario(true)
  }
  const abrirModalEditarUsuario = (u: any) => {
    setFormUsuario({ id: u.id, nombre: u.nombre, cedula: u.cedula, telefono: u.telefono || '', rol: u.rol })
    setErrorGuardar('')
    setModalUsuario(true)
  }
  const guardarUsuario = async () => {
    if (!formUsuario.cedula.trim()) { setErrorGuardar('La cédula es obligatoria.'); return }
    if (!formUsuario.nombre.trim()) { setErrorGuardar('El nombre es obligatorio.'); return }
    setErrorGuardar('')
    const { id, ...payload } = formUsuario
    const { error } = id
      ? await supabase.from('perfiles').update(payload).eq('id', id)
      : await supabase.from('perfiles').insert([payload])
    if (error) {
      if (error.code === '23505') setErrorGuardar('Ya existe un usuario con esa cédula.')
      else setErrorGuardar(`Error al guardar: ${error.message}`)
      return
    }
    setModalUsuario(false)
    fetchData()
  }

  // ── Eliminar (con modal propio — sin window.confirm) ────────────────────────
  const pedirConfirmacion = (tabla: string, id: string, nombre: string, tipo: 'servicio' | 'usuario') => {
    setErrorEliminar('')
    setModalConfirm({ tabla, id, nombre, tipo })
  }

  const confirmarEliminar = async () => {
    if (!modalConfirm) return
    setLoadingEliminar(true)
    setErrorEliminar('')

    const { error } = await supabase.from(modalConfirm.tabla).delete().eq('id', modalConfirm.id)

    if (error) {
      // FK constraint: el empleado tiene órdenes asociadas en otras tablas
      if (error.code === '23503' || error.message?.toLowerCase().includes('foreign key') || error.message?.toLowerCase().includes('violates')) {
        setErrorEliminar(
          modalConfirm.tipo === 'usuario'
            ? 'No se puede eliminar este empleado porque tiene servicios registrados en el historial. Puedes editarlo y cambiarle el rol en su lugar.'
            : 'No se puede eliminar este servicio porque está vinculado a órdenes existentes.'
        )
      } else {
        setErrorEliminar(`Error inesperado: ${error.message}`)
      }
      setLoadingEliminar(false)
      return
    }

    setModalConfirm(null)
    setLoadingEliminar(false)
    fetchData()
  }

  // ── Tarifas ─────────────────────────────────────────────────────────────────
  const actualizarTarifa = async (tipo: 'carro' | 'moto', precios: any) => {
    await supabase.from('config_parqueadero')
      .update({ precio_dia: Number(precios.dia || 0), precio_mes: Number(precios.mes || 0), actualizado_en: new Date().toISOString() })
      .eq('tipo_vehiculo', tipo)
    fetchData()
  }

  // ── Acceso denegado ─────────────────────────────────────────────────────────
  if (accesoDenegado) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-red-100 rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="text-red-400" size={32} />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
            Acceso <span className="text-red-500">Restringido</span>
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-8">
            Solo el coordinador puede acceder a Configuración.
          </p>
          <button onClick={() => router.back()}
            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">
            Volver
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Render principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 md:px-8 lg:px-10 pb-32 overflow-x-hidden">

      {/* HEADER */}
      <header className="max-w-5xl mx-auto mb-10 sm:mb-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xl text-gorilla-orange shrink-0">
            <Settings className="w-8 h-8 md:w-10 md:h-10" />
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

      <main className="max-w-5xl mx-auto space-y-12 sm:space-y-16">

        {/* ── SERVICIOS ── */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
                <Layers className="text-gorilla-orange" /> Catálogo de Servicios
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} configurado{servicios.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={abrirModalNuevoServicio}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 w-fit active:scale-95">
              <Plus size={16} /> Nuevo Servicio
            </button>
          </div>

          {servicios.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sin servicios configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servicios.map(s => (
                <div key={s.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
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
                      <button onClick={() => abrirModalEditarServicio(s)}
                        className="p-2.5 text-slate-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-xl transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => pedirConfirmacion('servicios', s.id, s.nombre, 'servicio')}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divisor */}
        <div className="flex items-center gap-4 opacity-40">
          <div className="h-px bg-slate-300 flex-1" />
          <Users size={16} className="text-slate-400" />
          <div className="h-px bg-slate-300 flex-1" />
        </div>

        {/* ── PERSONAL ── */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
                <Users className="text-gorilla-purple" /> Gestión de Personal
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={abrirModalNuevoUsuario}
              className="bg-gorilla-purple hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-purple-200 flex items-center gap-2 w-fit active:scale-95">
              <UserPlus size={16} /> Nuevo Personal
            </button>
          </div>

          {usuarios.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sin usuarios registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.map(u => (
                <div key={u.id} className="bg-slate-50 border border-slate-100 p-4 rounded-[1.5rem] flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden pr-2 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${u.rol === 'coordinador' ? 'bg-orange-100 text-gorilla-orange' :
                      u.rol === 'vendedor' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-gorilla-purple'
                      }`}>
                      {u.nombre?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="truncate min-w-0">
                      <h3 className="font-black text-sm uppercase italic text-slate-800 leading-tight truncate">{u.nombre}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
                        CC: {u.cedula} • {ETIQUETA_ROL[u.rol as keyof typeof ETIQUETA_ROL] ?? u.rol}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => abrirModalEditarUsuario(u)}
                      className="p-2.5 text-slate-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-xl transition-all">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => pedirConfirmacion('perfiles', u.id, u.nombre, 'usuario')}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divisor */}
        <div className="flex items-center gap-4 opacity-40">
          <div className="h-px bg-slate-300 flex-1" />
          <Clock size={16} className="text-slate-400" />
          <div className="h-px bg-slate-300 flex-1" />
        </div>

        {/* ── TARIFAS PARQUEO ── */}
        <section className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="mb-8">
            <h2 className="text-xl font-black flex items-center gap-3 uppercase italic text-slate-800 tracking-tight">
              <Clock className="text-blue-500" /> Tarifas de Parqueo
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Costos base por vehículo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <TarifaCard tipo="carro" icono={<Car size={24} />} valores={tarifas.carro} onSave={(_: any, v: any) => actualizarTarifa('carro', v)} />
            <TarifaCard tipo="moto" icono={<Bike size={24} />} valores={tarifas.moto} onSave={(_: any, v: any) => actualizarTarifa('moto', v)} />
          </div>
          <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex items-start gap-4">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-widest">
              Nota: Las tarifas actualizadas se aplican a nuevos ingresos. Las liquidaciones anteriores no se verán afectadas.
            </p>
          </div>
        </section>
      </main>

      {/* ═══════════════ MODALES ═══════════════ */}

      {/* MODAL SERVICIOS */}
      <AnimatePresence>
        {modalServicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gorilla-orange" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tight">
                  {formServicio.id ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h2>
                <button onClick={() => setModalServicio(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <FormInput label="Nombre del Servicio" value={formServicio.nombre}
                  onChange={(e: any) => setFormServicio({ ...formServicio, nombre: e.target.value })} />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Aplica a</label>
                  <select className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl outline-none font-bold text-sm"
                    value={formServicio.aplica_a}
                    onChange={(e: any) => setFormServicio({ ...formServicio, aplica_a: e.target.value })}>
                    <option value="carro">Solo Carros</option>
                    <option value="moto">Solo Motos</option>
                    <option value="ambos">Ambos Vehículos</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Precio Carro" type="number" icon={<DollarSign size={14} />}
                    value={formServicio.precio_carro}
                    onChange={(e: any) => setFormServicio({ ...formServicio, precio_carro: Number(e.target.value) })} />
                  <FormInput label="Precio Moto" type="number" icon={<DollarSign size={14} />}
                    value={formServicio.precio_moto}
                    onChange={(e: any) => setFormServicio({ ...formServicio, precio_moto: Number(e.target.value) })} />
                </div>
                {errorGuardar && (
                  <p className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errorGuardar}</p>
                )}
                <button onClick={guardarServicio}
                  className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gorilla-purple" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tight">
                  {formUsuario.id ? 'Editar Personal' : 'Vincular Personal'}
                </h2>
                <button onClick={() => setModalUsuario(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <FormInput label="Nombre Completo" value={formUsuario.nombre}
                  onChange={(e: any) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Cédula" value={formUsuario.cedula}
                    onChange={(e: any) => setFormUsuario({ ...formUsuario, cedula: e.target.value })} />
                  <FormInput label="Teléfono" value={formUsuario.telefono}
                    onChange={(e: any) => setFormUsuario({ ...formUsuario, telefono: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Rol del Sistema</label>
                  <select className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl outline-none font-bold text-sm"
                    value={formUsuario.rol}
                    onChange={(e: any) => setFormUsuario({ ...formUsuario, rol: e.target.value })}>
                    <option value="empleado">Operador Lavado</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="coordinador">Coordinador</option>
                  </select>
                  <p className="text-[9px] text-slate-400 font-bold ml-1 mt-1 leading-relaxed">
                    {formUsuario.rol === 'empleado' && '→ Panel de tareas únicamente'}
                    {formUsuario.rol === 'vendedor' && '→ Inventario (ventas), Nuevo Servicio y Parqueadero'}
                    {formUsuario.rol === 'coordinador' && '→ Acceso total al sistema'}
                  </p>
                </div>
                {errorGuardar && (
                  <p className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errorGuardar}</p>
                )}
                <button onClick={guardarUsuario}
                  className="w-full bg-gorilla-purple hover:bg-purple-700 text-white p-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all">
                  Guardar <Check size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMACIÓN BORRADO */}
      <AnimatePresence>
        {modalConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-7 sm:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />

              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                  <Trash2 className="text-red-500" size={26} />
                </div>
                <h2 className="text-lg font-black italic uppercase text-slate-900 leading-tight">
                  ¿Eliminar {modalConfirm.tipo === 'usuario' ? 'empleado' : 'servicio'}?
                </h2>
                <p className="text-sm font-bold text-slate-600 mt-1">"{modalConfirm.nombre}"</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Esta acción es irreversible</p>
              </div>

              <AnimatePresence>
                {errorEliminar && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs font-bold leading-relaxed">{errorEliminar}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!errorEliminar ? (
                <div className="flex gap-3">
                  <button onClick={() => setModalConfirm(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                  <button onClick={confirmarEliminar} disabled={loadingEliminar}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                    {loadingEliminar
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Eliminando...</>
                      : <><Trash2 size={14} /> Sí, eliminar</>}
                  </button>
                </div>
              ) : (
                <button onClick={() => { setModalConfirm(null); setErrorEliminar('') }}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                  Entendido
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

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

  useEffect(() => {
    setVals({ dia: valores?.precio_dia || 0, mes: valores?.precio_mes || 0 })
  }, [valores])

  return (
    <div className="bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm">{icono}</div>
        <h3 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">{tipo}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MiniInput label="Día" value={vals.dia} onChange={(v: number) => setVals({ ...vals, dia: v })} />
        <MiniInput label="Mes" value={vals.mes} onChange={(v: number) => setVals({ ...vals, mes: v })} />
      </div>
      <button
        onClick={() => { onSave(tipo, vals); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className={`w-full mt-5 p-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white'
          }`}>
        {saved ? <><Check size={16} /> Guardado</> : 'Actualizar tarifa'}
      </button>
    </div>
  )
}

function MiniInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input type="number" min={0} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full bg-white border border-slate-200 p-3 pl-8 rounded-lg text-sm font-black outline-none focus:border-gorilla-orange text-slate-900 transition-colors" />
      </div>
    </div>
  )
}