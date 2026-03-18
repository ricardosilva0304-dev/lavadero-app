'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, User, Check, Zap, ShieldCheck, CheckCircle2, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounce, ToastContainer, toast, ToastOptions } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export const dynamic = 'force-dynamic'

// ─── Utilidades ─────────────────────────────────────────────────────────────
const formatearPrecio = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)

// Devuelve YYYY-MM-DD en hora LOCAL (sin desfase UTC)
const getFechaLocal = () => {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = String(hoy.getMonth() + 1).padStart(2, '0')
  const d = String(hoy.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Convierte "YYYY-MM-DD" a ISO string en hora local (evita el salto de día por UTC)
const fechaLocalAISO = (fechaStr: string) => {
  const [y, mo, d] = fechaStr.split('-').map(Number)
  // Usamos mediodía local para que nunca haya salto de día por zona horaria
  const local = new Date(y, mo - 1, d, 12, 0, 0)
  return local.toISOString()
}

const Notification = ({
  title, description, type
}: { title: string; description: string; type: 'success' | 'error' | 'info' }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-xl ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white shadow-lg shrink-0`}>
      {type === 'success' ? <Check size={18} strokeWidth={3} /> : <Zap size={18} />}
    </div>
    <div>
      <p className="font-black text-[10px] uppercase tracking-wider leading-none mb-1">{title}</p>
      <p className="text-[11px] opacity-80 font-medium uppercase">{description}</p>
    </div>
  </div>
)

export default function NuevoServicioPage() {
  const supabase = createClient()
  const [serviciosDB, setServiciosDB] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [ordenFinalizada, setOrdenFinalizada] = useState(false)

  const [fechaServicio, setFechaServicio] = useState(getFechaLocal())
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto'>('carro')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<any[]>([])
  const [placa, setPlaca] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [empleadoAsignado, setEmpleadoAsignado] = useState('')

  const [busquedaTelefono, setBusquedaTelefono] = useState('')
  const [cliente, setCliente] = useState<any>(null)
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchMaestros() }, [])

  const fetchMaestros = async () => {
    const { data: srv } = await supabase.from('servicios').select('*')
    const { data: emp } = await supabase.from('perfiles').select('*').eq('rol', 'empleado')
    setServiciosDB(srv || [])
    setEmpleados(emp || [])
  }

  const toastOptions: ToastOptions = {
    position: 'top-center', autoClose: 2000,
    transition: Bounce, hideProgressBar: true, theme: 'light'
  }

  const buscarCliente = async () => {
    if (!busquedaTelefono) return
    setLoading(true)
    try {
      const { data } = await supabase.from('clientes').select('*').eq('telefono', busquedaTelefono).maybeSingle()
      if (data) {
        setCliente(data)
        setNombreNuevoCliente(data.nombre)
        toast.success(<Notification title="Cliente Encontrado" description="Datos cargados correctamente" type="success" />, toastOptions)
      } else {
        setCliente({ nuevo: true })
        setNombreNuevoCliente('')
        toast.info(<Notification title="Nuevo Registro" description="Cliente no encontrado, ingresa el nombre" type="info" />, toastOptions)
      }
    } finally { setLoading(false) }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(
      existe
        ? serviciosSeleccionados.filter(s => s.id !== srv.id)
        : [...serviciosSeleccionados, srv]
    )
  }

  // CORRECCIÓN: parseFloat para evitar NaN que rompe la suma total
  const totalOrden = serviciosSeleccionados.reduce((acc, s) => {
    const precio = parseFloat(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto) || 0
    return acc + precio
  }, 0)

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaTelefono) {
      toast.error(<Notification title="ERROR" description="Faltan datos obligatorios" type="error" />, toastOptions)
      return
    }
    setLoading(true)
    try {
      let fId = null
      const { data: ex } = await supabase.from('clientes').select('id').eq('telefono', busquedaTelefono).maybeSingle()

      if (ex) {
        fId = ex.id
      } else {
        // CORRECCIÓN: cedula ya no se llena con el teléfono
        const { data: n, error: errCliente } = await supabase.from('clientes').insert([{
          telefono: busquedaTelefono,
          cedula: '', // vacío, no mezclar con teléfono
          nombre: nombreNuevoCliente || 'Cliente Nuevo'
        }]).select().single()

        if (errCliente) { setLoading(false); return }
        fId = n?.id
      }

      // CORRECCIÓN: fecha local a ISO usando mediodía local para evitar salto de día
      const { data: ord, error } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: fId,
        placa: placa.toUpperCase(),
        tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id),
        nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden,
        metodo_pago: metodoPago,
        empleado_id: empleadoAsignado,
        estado: 'pendiente',
        creado_en: fechaLocalAISO(fechaServicio) // ← sin desfase UTC
      }]).select().single()

      if (!error && ord) {
        setOrdenFinalizada(true)
        toast.success(<Notification title="ÉXITO" description="Servicio registrado" type="success" />, toastOptions)
      }
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  const serviciosFiltrados = serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos')

  return (
    <div className="min-h-screen pt-16 lg:pt-0 bg-[#F8FAFC] text-slate-900 font-sans relative">
      <ToastContainer />

      <div className="flex flex-col xl:flex-row min-h-screen">

        {/* ── IZQUIERDA: ZONA DE TRABAJO ──────────────────────────────────── */}
        <div className="flex-1 xl:mr-[400px] 2xl:mr-[450px] p-4 sm:p-6 md:p-8 lg:p-10 pb-8">

          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Punto de Venta</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Nuevo <span className="text-gorilla-orange">Servicio</span>
            </h1>
          </header>

          <div className="max-w-3xl mx-auto xl:max-w-none space-y-8">

            {/* 1. VEHÍCULO + PLACA */}
            <section className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-3 sm:w-auto">
                {(['carro', 'moto'] as const).map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => { setTipoVehiculo(tipo); setServiciosSeleccionados([]) }}
                    className={`flex-1 sm:flex-none sm:w-32 py-4 px-4 rounded-[1.5rem] border transition-all flex flex-col items-center justify-center gap-2 ${tipoVehiculo === tipo
                        ? 'bg-white border-gorilla-orange shadow-md'
                        : 'bg-white border-slate-200/60 hover:border-slate-300'
                      }`}
                  >
                    {tipo === 'carro'
                      ? <Car size={24} className={tipoVehiculo === tipo ? 'text-gorilla-orange' : 'text-slate-400'} />
                      : <Bike size={24} className={tipoVehiculo === tipo ? 'text-gorilla-orange' : 'text-slate-400'} />
                    }
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${tipoVehiculo === tipo ? 'text-slate-900' : 'text-slate-400'}`}>
                      {tipo}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative group flex-1">
                <div className="absolute top-3 left-5 bg-slate-100/80 text-slate-500 text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest z-10">Placa</div>
                <input
                  placeholder="ABC 123"
                  className="w-full bg-white border border-slate-200/60 p-4 pt-8 rounded-[1.5rem] text-3xl sm:text-4xl md:text-5xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm placeholder:text-slate-100"
                  value={placa}
                  onChange={e => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
            </section>

            {/* 2. CATÁLOGO DE SERVICIOS */}
            <section>
              <div className="flex justify-between items-end mb-5 px-1">
                <h2 className="text-base sm:text-lg font-black italic uppercase text-slate-800 tracking-tight">Servicios Disponibles</h2>
                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-200/50 px-3 py-1 rounded-full">
                  {serviciosFiltrados.length} Opciones
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviciosFiltrados.map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  const precio = parseFloat(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto) || 0
                  return (
                    <button
                      key={srv.id}
                      onClick={() => toggleServicio(srv)}
                      className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-200 border ${sel
                          ? 'bg-slate-900 border-slate-900 shadow-md'
                          : 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center transition-all shrink-0 ${sel ? 'bg-white border-white text-slate-900' : 'border-slate-300 text-transparent'
                          }`}>
                          <Check size={12} strokeWidth={4} />
                        </div>
                        <span className={`font-bold uppercase text-[11px] tracking-wide text-left leading-tight ${sel ? 'text-white' : 'text-slate-600'}`}>
                          {srv.nombre}
                        </span>
                      </div>
                      <span className={`font-black text-sm shrink-0 ml-2 ${sel ? 'text-gorilla-orange' : 'text-slate-400'}`}>
                        ${precio.toLocaleString('es-CO')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

          </div>
        </div>

        {/* ── DERECHA: PANEL DE PAGO ───────────────────────────────────────── */}
        {/* En móvil: se muestra debajo. En xl+: fijo a la derecha */}
        <div className="w-full xl:w-[400px] 2xl:w-[450px] bg-[#0E0C15] text-white shadow-2xl z-40 flex flex-col xl:fixed xl:right-0 xl:top-0 xl:bottom-0">

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 flex flex-col gap-6 custom-scrollbar">

            {/* RESUMEN */}
            <div className="space-y-3 mt-1 sm:mt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 opacity-60">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Resumen</span>
                </div>
                <span className="text-lg font-black xl:hidden">${totalOrden.toLocaleString('es-CO')}</span>
              </div>

              <div className="max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {serviciosSeleccionados.length === 0 ? (
                  <div className="py-6 border-2 border-dashed border-white/5 rounded-2xl text-center text-gray-600 font-bold uppercase text-xs">
                    Ningún servicio seleccionado
                  </div>
                ) : (
                  serviciosSeleccionados.map((s, i) => {
                    const precio = parseFloat(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto) || 0
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5"
                      >
                        <span className="text-[11px] font-black uppercase tracking-tight text-gray-300 truncate mr-2">{s.nombre}</span>
                        <span className="text-gorilla-orange font-bold text-xs shrink-0">${precio.toLocaleString('es-CO')}</span>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div className="bg-white/5 p-4 sm:p-5 rounded-[1.5rem] border border-white/10">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User size={14} /> Datos del Cliente
              </label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    placeholder="Teléfono"
                    type="tel"
                    className="w-full bg-white/5 border border-white/10 p-3.5 pl-11 rounded-xl outline-none focus:border-gorilla-orange transition-all font-bold text-white placeholder:text-gray-500 text-sm"
                    value={busquedaTelefono}
                    onChange={e => setBusquedaTelefono(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarCliente()}
                  />
                </div>
                <button
                  onClick={buscarCliente}
                  className="bg-gorilla-orange text-white p-3.5 rounded-xl shadow-lg hover:bg-orange-600 transition-all shrink-0"
                >
                  <Search size={20} />
                </button>
              </div>
              <AnimatePresence>
                {cliente && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden pt-2">
                    <input
                      placeholder="Nombre Completo"
                      className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl outline-none font-bold uppercase text-xs focus:border-gorilla-orange text-white placeholder:text-gray-500 transition-all"
                      value={nombreNuevoCliente}
                      onChange={e => setNombreNuevoCliente(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FECHA */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Fecha del Servicio</label>
              <input
                type="date"
                max={getFechaLocal()}
                className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white font-bold text-sm outline-none focus:border-gorilla-orange transition-all"
                value={fechaServicio}
                onChange={e => setFechaServicio(e.target.value)}
              />
            </div>

            {/* LAVADOR Y MÉTODO DE PAGO */}
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Lavador Asignado</label>
                <select
                  className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white font-bold text-sm outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
                  value={empleadoAsignado}
                  onChange={e => setEmpleadoAsignado(e.target.value)}
                >
                  <option value="" className="text-slate-900">Seleccionar lavador...</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id} className="text-slate-900">{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['efectivo', 'transferencia'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMetodoPago(m)}
                    className={`py-4 rounded-xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === m
                        ? m === 'efectivo' ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                  >
                    {m === 'efectivo' ? 'EFECTIVO' : 'TRANSF.'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PIE FIJO: TOTAL + BOTÓN */}
          <div className="p-5 sm:p-6 lg:p-8 border-t border-white/10 bg-[#0E0C15] shrink-0">
            <div className="hidden xl:flex justify-between items-end mb-4">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Final</span>
              <span className="text-4xl xl:text-5xl font-black text-white tracking-tighter">
                ${totalOrden.toLocaleString('es-CO')}
              </span>
            </div>
            <button
              onClick={crearOrden}
              disabled={loading}
              className="w-full bg-gorilla-orange hover:bg-orange-600 text-white py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg italic uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? 'Procesando...' : <><span>REGISTRAR VENTA</span> <CheckCircle2 size={22} /></>}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-10 sm:p-12 rounded-[2.5rem] text-center max-w-sm w-full shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <Check size={40} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-4">
                Servicio<br />Registrado
              </h2>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all"
              >
                Nueva Orden
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}