'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CreditCard, DollarSign, User, Plus,
  Check, Zap, ChevronRight, ShieldCheck, CheckCircle2, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounce, ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const dynamic = 'force-dynamic'

const formatearPrecio = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

const Notification = ({ title, description, type }: { title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-xl ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white shadow-lg`}>
      {type === 'success' ? <Check size={18} strokeWidth={3} /> : <Zap size={18} />}
    </div>
    <div>
      <p className="font-black text-[10px] uppercase tracking-wider leading-none mb-1">{title}</p>
      <p className="text-[11px] opacity-80 font-medium uppercase">{description}</p>
    </div>
  </div>
);

export default function NuevoServicioPage() {
  const supabase = createClient()
  const [serviciosDB, setServiciosDB] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [ordenFinalizada, setOrdenFinalizada] = useState(false)

  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto'>('carro')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<any[]>([])
  const [placa, setPlaca] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [empleadoAsignado, setEmpleadoAsignado] = useState('')

  // Cambios para usar Teléfono en lugar de Cédula
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

  const toastOptions: ToastOptions = { position: "top-center", autoClose: 2000, transition: Bounce, hideProgressBar: true, theme: "light" };

  const buscarCliente = async () => {
    if (!busquedaTelefono) return;
    setLoading(true);
    try {
      // Búsqueda por teléfono en lugar de cédula
      const { data } = await supabase.from('clientes').select('*').eq('telefono', busquedaTelefono).maybeSingle()
      if (data) {
        setCliente(data);
        setNombreNuevoCliente(data.nombre);
        toast.success(<Notification title="Cliente Encontrado" description="Datos cargados correctamente" type="success" />, toastOptions);
      } else {
        setCliente({ nuevo: true });
        setNombreNuevoCliente(''); // Limpiar para que lo escriban
        toast.info(<Notification title="Nuevo Registro" description="Cliente no encontrado, ingresa el nombre" type="info" />, toastOptions);
      }
    } finally { setLoading(false) }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe ? serviciosSeleccionados.filter(s => s.id !== srv.id) : [...serviciosSeleccionados, srv])
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) => acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0)

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaTelefono) {
      toast.error(<Notification title="ERROR" description="Faltan datos obligatorios" type="error" />, toastOptions); return;
    }
    setLoading(true)
    try {
      let fId = null
      const { data: ex } = await supabase.from('clientes').select('id').eq('telefono', busquedaTelefono).maybeSingle()
      if (ex) fId = ex.id
      else {
        const { data: n } = await supabase.from('clientes').insert([{
          telefono: busquedaTelefono,
          nombre: nombreNuevoCliente || 'Cliente Nuevo'
        }]).select().single()
        fId = n?.id
      }
      const { data: ord, error } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: fId, placa: placa.toUpperCase(), tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id), nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden, metodo_pago: metodoPago, empleado_id: empleadoAsignado, estado: 'pendiente'
      }]).select().single()

      if (!error && ord) {
        setOrdenFinalizada(true);
        toast.success(<Notification title="ÉXITO" description="Servicio registrado" type="success" />, toastOptions);
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col lg:flex-row overflow-x-hidden">
      <ToastContainer />

      {/* ---------------- IZQUIERDA: ZONA DE TRABAJO ---------------- */}
      <div className="flex-1 w-full p-4 md:p-8 lg:p-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-12 bg-gorilla-orange rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Punto de Venta</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
            Nuevo <span className="text-gorilla-orange">Servicio</span>
          </h1>
        </header>

        <div className="max-w-6xl mx-auto space-y-8">

          {/* 1. SELECCIÓN DE VEHÍCULO Y PLACA (En una sola fila en PC) */}
          <section className="flex flex-col lg:flex-row gap-4">
            <div className="flex gap-4 lg:w-1/3">
              <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 group ${tipoVehiculo === 'carro' ? 'bg-white border-gorilla-orange shadow-xl shadow-orange-100' : 'bg-slate-50 border-transparent hover:bg-white'}`}>
                <Car size={28} className={tipoVehiculo === 'carro' ? 'text-gorilla-orange' : 'text-slate-400'} />
                <span className={`text-xs font-black uppercase tracking-widest ${tipoVehiculo === 'carro' ? 'text-gorilla-orange' : 'text-slate-400'}`}>Carro</span>
              </button>
              <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 group ${tipoVehiculo === 'moto' ? 'bg-white border-gorilla-orange shadow-xl shadow-orange-100' : 'bg-slate-50 border-transparent hover:bg-white'}`}>
                <Bike size={28} className={tipoVehiculo === 'moto' ? 'text-gorilla-orange' : 'text-slate-400'} />
                <span className={`text-xs font-black uppercase tracking-widest ${tipoVehiculo === 'moto' ? 'text-gorilla-orange' : 'text-slate-400'}`}>Moto</span>
              </button>
            </div>

            <div className="relative group lg:w-2/3 flex-1">
              <div className="absolute top-3 left-6 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest z-10">Placa</div>
              <input
                placeholder="ABC 123"
                className="w-full bg-white border-2 border-slate-100 p-6 pt-10 rounded-[2.5rem] text-5xl md:text-7xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none focus:border-gorilla-orange focus:shadow-2xl transition-all placeholder:text-slate-100"
                value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
              />
            </div>
          </section>

          {/* 2. CATÁLOGO DE SERVICIOS (Ahora en 3 columnas en PC) */}
          <section>
            <div className="flex justify-between items-end mb-6 px-2">
              <h2 className="text-xl font-black italic uppercase text-slate-800 tracking-tighter">Servicios Disponibles</h2>
              <span className="text-xs font-bold text-slate-400 uppercase bg-slate-200 px-3 py-1 rounded-full">{serviciosDB.length} Opciones</span>
            </div>
            {/* AQUÍ ESTÁ EL CAMBIO A 3 COLUMNAS: lg:grid-cols-3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
              {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                return (
                  <button key={srv.id} onClick={() => toggleServicio(srv)}
                    className={`flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all group ${sel ? 'bg-slate-900 border-slate-900 shadow-lg' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-all ${sel ? 'bg-gorilla-orange text-white' : 'bg-slate-50 text-slate-300'}`}>
                        {sel ? <Check size={14} strokeWidth={4} /> : <Plus size={14} strokeWidth={3} />}
                      </div>
                      <div className="text-left">
                        <span className={`block font-black uppercase text-[11px] md:text-xs tracking-tight ${sel ? 'text-white' : 'text-slate-600'}`}>{srv.nombre}</span>
                      </div>
                    </div>
                    <span className={`font-black text-sm ${sel ? 'text-white' : 'text-slate-900'}`}>${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ---------------- DERECHA: PANEL DE PAGO (Posición natural en móvil, Fijo en PC) ---------------- */}
      <div className="w-full lg:w-[400px] xl:w-[450px] bg-[#0E0C15] text-white p-6 lg:p-8 shadow-2xl z-40 flex flex-col gap-8 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">

        {/* RESUMEN DE ORDEN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 opacity-60">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Resumen</span>
            </div>
            <span className="text-xl font-black">${totalOrden.toLocaleString()}</span>
          </div>

          <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {serviciosSeleccionados.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-bold uppercase text-xs">Ningún servicio</div>
            ) : (
              serviciosSeleccionados.map((s, i) => (
                <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-black uppercase tracking-tight">{s.nombre}</span>
                  <span className="text-gorilla-orange font-bold text-xs">${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* DATOS DEL CLIENTE (Movido al panel de cobro) */}
        <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <User size={14} /> Datos del Cliente
          </label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                placeholder="Teléfono"
                type="tel"
                className="w-full bg-[#0E0C15] border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-gorilla-orange focus:ring-1 focus:ring-gorilla-orange transition-all font-bold text-white placeholder:text-gray-600 text-sm"
                value={busquedaTelefono}
                onChange={e => setBusquedaTelefono(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
              />
            </div>
            <button onClick={buscarCliente} className="bg-gorilla-orange text-white p-4 rounded-2xl shadow-lg hover:bg-orange-600 transition-all">
              <Search size={20} />
            </button>
          </div>
          <AnimatePresence>
            {cliente && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden pt-2">
                <input
                  placeholder="Nombre Completo"
                  className="w-full bg-[#0E0C15] border border-white/10 p-4 rounded-2xl outline-none font-bold uppercase text-xs focus:border-gorilla-orange text-white placeholder:text-gray-600"
                  value={nombreNuevoCliente}
                  onChange={e => setNombreNuevoCliente(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LAVADOR Y PAGO */}
        <div className="space-y-5 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Lavador Responsable</label>
            <select className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-sm outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
              value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
              <option value="" className="text-slate-900">Seleccionar lavador...</option>
              {empleados.map(e => <option key={e.id} value={e.id} className="text-slate-900">{e.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMetodoPago('efectivo')} className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'efectivo' ? 'bg-green-500 border-green-500 text-white' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'}`}>EFECTIVO</button>
            <button onClick={() => setMetodoPago('transferencia')} className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'transferencia' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'}`}>TRANSF.</button>
          </div>
        </div>

        {/* BOTÓN FINAL */}
        <div className="pt-4 border-t border-white/10 mt-auto">
          <div className="flex justify-between items-end mb-4 hidden lg:flex">
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Final</span>
            <span className="text-4xl xl:text-5xl font-black text-white tracking-tighter">${totalOrden.toLocaleString()}</span>
          </div>
          <button
            onClick={crearOrden}
            disabled={loading}
            className="w-full bg-gorilla-orange hover:bg-orange-600 text-white py-5 rounded-[2rem] font-black text-lg italic uppercase tracking-widest shadow-2xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? 'Procesando...' : <>REGISTRAR VENTA <CheckCircle2 size={24} /></>}
          </button>
        </div>
      </div>

      {/* MODAL EXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-200 animate-bounce">
                <Check size={48} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-none mb-4">Servicio<br />Registrado</h2>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Nueva Orden</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
        }
      `}</style>
    </div>
  )
}