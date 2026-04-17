'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Car, Bike, User, Check, Zap, ShieldCheck, CheckCircle2, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, ToastContainer, Bounce, type ToastOptions } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ahoraISO } from '@/utils/colombia'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const Notif = ({ title, desc, type }: { title: string; desc: string; type: 'success' | 'error' | 'info' }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-xl shrink-0 text-white ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
      {type === 'success' ? <Check size={16} strokeWidth={3} /> : <Zap size={16} />}
    </div>
    <div>
      <p className="font-black text-[10px] uppercase tracking-wider leading-none mb-0.5">{title}</p>
      <p className="text-[11px] opacity-70 font-medium">{desc}</p>
    </div>
  </div>
)

export default function NuevoServicioPage() {
  const supabase = createClient()
  const router = useRouter()

  // Maestros
  const [serviciosDB, setServiciosDB] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])

  // Formulario
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto'>('carro')
  const [placa, setPlaca] = useState('')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<any[]>([])
  const [empleadoAsignado, setEmpleadoAsignado] = useState('')

  // Cliente — guardamos el id del cliente encontrado para no re-buscarlo al crear la orden
  const [telefono, setTelefono] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [clienteBuscado, setClienteBuscado] = useState(false)
  const [clienteIdCacheado, setClienteIdCacheado] = useState<string | null>(null)

  // UI
  const [loading, setLoading] = useState(false)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [ordenFinalizada, setOrdenFinalizada] = useState(false)

  const toastOpts: ToastOptions = { position: 'top-center', autoClose: 2000, transition: Bounce, hideProgressBar: true, theme: 'light' }

  // Auth guard
  useEffect(() => {
    if (!sessionStorage.getItem('gorilla_user')) router.push('/login')
  }, [router])

  useEffect(() => {
    const fetchMaestros = async () => {
      const { data: srv } = await supabase.from('servicios').select('*').order('nombre')
      const { data: emp } = await supabase.from('perfiles').select('*').eq('rol', 'empleado')
      setServiciosDB(srv || [])
      setEmpleados(emp || [])
    }
    fetchMaestros()
  }, [])

  const buscarCliente = useCallback(async () => {
    if (!telefono.trim()) return
    setBuscandoCliente(true)
    try {
      const { data } = await supabase
        .from('clientes').select('id, nombre').eq('telefono', telefono.trim()).maybeSingle()
      setClienteBuscado(true)
      if (data) {
        setNombreCliente(data.nombre)
        setClienteEncontrado(true)
        setClienteIdCacheado(data.id)
        toast.success(<Notif title="Cliente encontrado" desc={data.nombre} type="success" />, toastOpts)
      } else {
        setNombreCliente('')
        setClienteEncontrado(false)
        setClienteIdCacheado(null)
        toast.info(<Notif title="Cliente nuevo" desc="Ingresa el nombre" type="info" />, toastOpts)
      }
    } finally {
      setBuscandoCliente(false)
    }
  }, [telefono])

  // Búsqueda automática con debounce — dispara sola al escribir el teléfono
  useEffect(() => {
    // Solo buscar cuando hay al menos 7 dígitos (número colombiano mínimo)
    if (telefono.trim().length < 7) {
      setClienteBuscado(false)
      setClienteEncontrado(false)
      setNombreCliente('')
      setClienteIdCacheado(null)
      return
    }
    const timer = setTimeout(() => {
      buscarCliente()
    }, 600)
    return () => clearTimeout(timer)
  }, [telefono, buscarCliente])

  const toggleServicio = (srv: any) => {
    setServiciosSeleccionados(prev =>
      prev.find(s => s.id === srv.id) ? prev.filter(s => s.id !== srv.id) : [...prev, srv]
    )
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) =>
    acc + (parseFloat(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto) || 0), 0)

  const crearOrden = async () => {
    if (!placa.trim())
      return toast.error(<Notif title="Error" desc="Ingresa la placa" type="error" />, toastOpts)
    if (serviciosSeleccionados.length === 0)
      return toast.error(<Notif title="Error" desc="Selecciona al menos un servicio" type="error" />, toastOpts)
    if (!empleadoAsignado)
      return toast.error(<Notif title="Error" desc="Asigna un lavador" type="error" />, toastOpts)
    if (!telefono.trim())
      return toast.error(<Notif title="Error" desc="Ingresa el teléfono del cliente" type="error" />, toastOpts)
    if (!clienteBuscado)
      return toast.error(<Notif title="Error" desc="Busca primero el cliente" type="error" />, toastOpts)
    if (!clienteEncontrado && !nombreCliente.trim())
      return toast.error(<Notif title="Error" desc="Ingresa el nombre del cliente nuevo" type="error" />, toastOpts)

    setLoading(true)
    try {
      let clienteId: string

      if (clienteIdCacheado) {
        // Cliente ya existía — usar el id cacheado, actualizar nombre si cambió
        clienteId = clienteIdCacheado
        if (nombreCliente.trim())
          await supabase.from('clientes').update({ nombre: nombreCliente.trim() }).eq('id', clienteId)
      } else {
        // Cliente nuevo — crear
        const { data: nuevo, error: errC } = await supabase
          .from('clientes')
          .insert([{ telefono: telefono.trim(), nombre: nombreCliente.trim() }])
          .select('id').single()
        if (errC || !nuevo) {
          toast.error(<Notif title="Error" desc="No se pudo crear el cliente" type="error" />, toastOpts)
          setLoading(false)
          return
        }
        clienteId = nuevo.id
      }

      // 2. Crear orden — sin metodo_pago, se asigna al cobrar
      const { error: errO } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: clienteId,
        placa: placa.toUpperCase().trim(),
        tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id),
        nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden,
        empleado_id: empleadoAsignado,
        estado: 'pendiente',
        creado_en: ahoraISO(),
      }])

      if (!errO) {
        setOrdenFinalizada(true)
      } else {
        toast.error(<Notif title="Error" desc="No se pudo crear la orden" type="error" />, toastOpts)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTipoVehiculo('carro')
    setPlaca('')
    setServiciosSeleccionados([])
    setEmpleadoAsignado('')
    setTelefono('')
    setNombreCliente('')
    setClienteEncontrado(false)
    setClienteBuscado(false)
    setClienteIdCacheado(null)
    setOrdenFinalizada(false)
  }

  const serviciosFiltrados = serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos')

  return (
    <div className="min-h-screen pt-16 lg:pt-0 bg-[#F8FAFC] text-slate-900 font-sans">
      <ToastContainer />

      <div className="flex flex-col xl:flex-row min-h-screen">

        {/* ── IZQUIERDA: DATOS DEL SERVICIO ─────────────────────────────── */}
        <div className="flex-1 xl:mr-[420px] 2xl:mr-[460px] p-4 sm:p-6 md:p-8 lg:p-10">

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Registro de Servicio</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Nuevo <span className="text-gorilla-orange">Servicio</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
              El pago se registra al finalizar el lavado
            </p>
          </header>

          <div className="max-w-3xl mx-auto xl:max-w-none space-y-6">

            {/* 1. VEHÍCULO + PLACA */}
            <section className="flex flex-col sm:flex-row gap-3">
              {/* Tipo vehículo */}
              <div className="flex gap-3 shrink-0">
                {(['carro', 'moto'] as const).map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => { setTipoVehiculo(tipo); setServiciosSeleccionados([]) }}
                    className={`w-28 sm:w-32 py-4 px-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${tipoVehiculo === tipo
                      ? 'bg-white border-gorilla-orange shadow-md shadow-orange-100'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {tipo === 'carro'
                      ? <Car size={22} className={tipoVehiculo === tipo ? 'text-gorilla-orange' : 'text-slate-400'} />
                      : <Bike size={22} className={tipoVehiculo === tipo ? 'text-gorilla-orange' : 'text-slate-400'} />
                    }
                    <span className={`text-[10px] font-black uppercase tracking-widest ${tipoVehiculo === tipo ? 'text-slate-900' : 'text-slate-400'}`}>
                      {tipo}
                    </span>
                  </button>
                ))}
              </div>

              {/* Placa */}
              <div className="relative flex-1 group">
                <div className="absolute top-3 left-5 text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Placa</div>
                <input
                  placeholder="ABC 123"
                  maxLength={7}
                  className="w-full h-full bg-white border-2 border-slate-200 focus:border-gorilla-orange p-4 pt-8 rounded-2xl text-3xl sm:text-4xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none transition-all shadow-sm placeholder:text-slate-200 focus:ring-4 focus:ring-orange-50"
                  value={placa}
                  onChange={e => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
            </section>

            {/* 2. SERVICIOS */}
            <section className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-black uppercase italic text-slate-800 tracking-tight flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gorilla-orange" />
                  Servicios — {tipoVehiculo === 'carro' ? 'Carro' : 'Moto'}
                </h2>
                {serviciosSeleccionados.length > 0 && (
                  <span className="bg-gorilla-orange text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                    {serviciosSeleccionados.length} selec.
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {serviciosFiltrados.map(srv => {
                  const sel = !!serviciosSeleccionados.find(s => s.id === srv.id)
                  const precio = parseFloat(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto) || 0
                  return (
                    <button
                      key={srv.id}
                      onClick={() => toggleServicio(srv)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${sel ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-transparent hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-gorilla-orange border-gorilla-orange' : 'border-slate-300'}`}>
                          {sel && <Check size={10} strokeWidth={4} className="text-white" />}
                        </div>
                        <span className={`font-bold text-[11px] uppercase tracking-wide text-left leading-tight ${sel ? 'text-white' : 'text-slate-600'}`}>
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

            {/* 3. CLIENTE */}
            <section className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase italic text-slate-800 tracking-tight flex items-center gap-2 mb-4">
                <User size={16} className="text-gorilla-orange" /> Cliente
              </h2>

              {/* Teléfono con indicador de estado integrado */}
              <div className="relative mb-3">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  className={`w-full bg-slate-50 border-2 p-3.5 pl-11 pr-12 rounded-xl outline-none font-bold text-slate-900 text-sm placeholder:text-slate-300 transition-all ${clienteEncontrado ? 'border-green-400 bg-green-50/30' :
                      clienteBuscado && !clienteEncontrado ? 'border-blue-300 bg-blue-50/20' :
                        'border-slate-200 focus:border-gorilla-orange'
                    }`}
                  value={telefono}
                  onChange={e => {
                    setTelefono(e.target.value)
                    setClienteBuscado(false)
                    setClienteEncontrado(false)
                    setNombreCliente('')
                    setClienteIdCacheado(null)
                  }}
                />
                {/* Indicador de estado a la derecha del input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {buscandoCliente && (
                    <div className="w-5 h-5 border-2 border-gorilla-orange border-t-transparent rounded-full animate-spin" />
                  )}
                  {!buscandoCliente && clienteEncontrado && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={12} strokeWidth={3} className="text-white" />
                    </div>
                  )}
                  {!buscandoCliente && clienteBuscado && !clienteEncontrado && (
                    <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                      <User size={11} className="text-white" />
                    </div>
                  )}
                  {!buscandoCliente && !clienteBuscado && telefono.trim().length > 0 && telefono.trim().length < 7 && (
                    <span className="text-[9px] text-slate-400 font-black">
                      {telefono.trim().length}/7
                    </span>
                  )}
                </div>
              </div>

              {/* Mensaje de estado debajo del input */}
              {!buscandoCliente && telefono.trim().length > 0 && telefono.trim().length < 7 && (
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-3">
                  Escribe el número completo para buscar automáticamente
                </p>
              )}
              {buscandoCliente && (
                <p className="text-[9px] text-gorilla-orange font-black uppercase tracking-widest mb-3">
                  Buscando cliente...
                </p>
              )}

              {/* Campo nombre — aparece automáticamente tras la búsqueda */}
              <AnimatePresence>
                {clienteBuscado && !buscandoCliente && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {clienteEncontrado ? (
                      /* Cliente existente — nombre editable pero ya relleno */
                      <div>
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-2">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                            <Check size={14} strokeWidth={3} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Cliente registrado</p>
                            <p className="text-sm font-black text-green-800 uppercase truncate">{nombreCliente}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Cliente nuevo — pedir nombre */
                      <div>
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                          <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center shrink-0">
                            <User size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Cliente nuevo</p>
                            <p className="text-[10px] font-bold text-blue-500">Escribe su nombre para registrarlo</p>
                          </div>
                        </div>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                          <input
                            placeholder="Nombre del cliente *"
                            autoFocus
                            className="w-full bg-slate-50 border-2 border-blue-300 focus:border-blue-400 p-3.5 pl-11 rounded-xl outline-none font-bold uppercase text-xs text-slate-900 placeholder:text-slate-300 transition-all"
                            value={nombreCliente}
                            onChange={e => setNombreCliente(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* 4. LAVADOR */}
            <section className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-black uppercase italic text-slate-800 tracking-tight mb-4">
                Lavador Asignado
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {empleados.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setEmpleadoAsignado(emp.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${empleadoAsignado === emp.id ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${empleadoAsignado === emp.id ? 'bg-gorilla-orange text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                      {emp.nombre[0].toUpperCase()}
                    </div>
                    <span className={`font-black text-xs uppercase tracking-wide ${empleadoAsignado === emp.id ? 'text-white' : 'text-slate-600'}`}>
                      {emp.nombre}
                    </span>
                    {empleadoAsignado === emp.id && <Check size={14} className="text-gorilla-orange ml-auto shrink-0" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* ── DERECHA: RESUMEN + BOTÓN ──────────────────────────────────── */}
        <div className="w-full xl:w-[420px] 2xl:w-[460px] bg-[#0E0C15] text-white xl:fixed xl:right-0 xl:top-0 xl:bottom-0 flex flex-col z-40">

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 flex flex-col gap-5">

            {/* Título panel */}
            <div className="border-b border-white/10 pb-4 pt-2 lg:pt-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Resumen</p>
              <h2 className="text-xl font-black italic uppercase text-white mt-1">Orden de Servicio</h2>
            </div>

            {/* Vehículo + placa */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${tipoVehiculo === 'carro' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                {tipoVehiculo === 'carro' ? <Car size={22} /> : <Bike size={22} />}
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tipoVehiculo}</p>
                <p className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
                  {placa || <span className="text-gray-600">Sin placa</span>}
                </p>
              </div>
            </div>

            {/* Servicios seleccionados */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Servicios</p>
              {serviciosSeleccionados.length === 0 ? (
                <div className="border-2 border-dashed border-white/5 rounded-xl py-6 text-center text-gray-600 font-bold uppercase text-[10px]">
                  Ninguno seleccionado
                </div>
              ) : (
                serviciosSeleccionados.map(s => {
                  const precio = parseFloat(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto) || 0
                  return (
                    <motion.div layout key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[11px] font-bold uppercase text-gray-300 truncate mr-2">{s.nombre}</span>
                      <span className="text-gorilla-orange font-black text-xs shrink-0">${precio.toLocaleString('es-CO')}</span>
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Cliente */}
            {(buscandoCliente || clienteBuscado || telefono.trim().length > 0) && (
              <div className={`rounded-xl p-3 border flex items-center gap-3 transition-all ${clienteEncontrado ? 'bg-green-500/10 border-green-500/30' :
                  clienteBuscado ? 'bg-blue-500/10 border-blue-500/30' :
                    'bg-white/5 border-white/10'
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${clienteEncontrado ? 'bg-green-500/30 text-green-400' :
                    clienteBuscado ? 'bg-blue-400/30 text-blue-400' :
                      'bg-white/10 text-gray-400'
                  }`}>
                  {buscandoCliente
                    ? <div className="w-4 h-4 border-2 border-gorilla-orange border-t-transparent rounded-full animate-spin" />
                    : <User size={15} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                    {buscandoCliente ? 'Buscando...' : clienteEncontrado ? 'Cliente registrado' : clienteBuscado ? 'Cliente nuevo' : 'Cliente'}
                  </p>
                  <p className="text-xs font-black uppercase text-white truncate">
                    {nombreCliente || (buscandoCliente ? '...' : telefono || '—')}
                  </p>
                  {telefono && <p className="text-[9px] text-gray-500 font-bold">{telefono}</p>}
                </div>
              </div>
            )}

            {/* Lavador */}
            {empleadoAsignado && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 bg-gorilla-purple/30 rounded-lg flex items-center justify-center text-gorilla-purple shrink-0 font-black text-sm">
                  {empleados.find(e => e.id === empleadoAsignado)?.nombre[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Lavador</p>
                  <p className="text-xs font-black uppercase text-white">{empleados.find(e => e.id === empleadoAsignado)?.nombre}</p>
                </div>
              </div>
            )}

            {/* Nota pago pendiente */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                💳 El pago se cobra al finalizar el servicio
              </p>
            </div>

          </div>

          {/* Pie: total + botón */}
          <div className="p-5 sm:p-6 lg:p-8 border-t border-white/10 shrink-0">
            <div className="flex justify-between items-end mb-5">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total estimado</span>
              <span className="text-4xl font-black tracking-tighter text-white">${totalOrden.toLocaleString('es-CO')}</span>
            </div>
            <button
              onClick={crearOrden}
              disabled={loading}
              className="w-full bg-gorilla-orange hover:bg-orange-600 disabled:opacity-50 text-white py-4 sm:py-5 rounded-2xl font-black text-base italic uppercase tracking-widest shadow-[0_0_24px_rgba(249,115,22,0.25)] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? 'Registrando...' : <><span>REGISTRAR SERVICIO</span><CheckCircle2 size={20} /></>}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-10 sm:p-12 rounded-[2.5rem] text-center max-w-sm w-full shadow-2xl">
              <div className="w-20 h-20 bg-gorilla-orange rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-200">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-tight mb-2">
                Servicio<br />Registrado
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">
                El lavador ya puede verlo en su panel
              </p>
              <button
                onClick={resetForm}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl uppercase tracking-[0.2em] transition-all"
              >
                Nueva Orden
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}