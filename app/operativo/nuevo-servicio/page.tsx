'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, UserPlus, XCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounce, ToastContainer, toast, ToastOptions, ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const dynamic = 'force-dynamic'

const Notification = ({ title, description, type }: { title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' }) => (
  <div className="flex items-center">
    <div className={`p-2 rounded-full mr-3 ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white shadow-lg`}>
      {type === 'success' ? <Check size={16} strokeWidth={3}/> : <Zap size={16} />}
    </div>
    <div>
      <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">{title}</p>
      <p className="text-[10px] text-gray-500 font-bold uppercase">{description}</p>
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
  const [busquedaCedula, setBusquedaCedula] = useState('')
  const [cliente, setCliente] = useState<any>(null)
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('')
  const [telNuevoCliente, setTelNuevoCliente] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchMaestros() }, [])

  const fetchMaestros = async () => {
    const { data: srv } = await supabase.from('servicios').select('*')
    const { data: emp } = await supabase.from('perfiles').select('*').eq('rol', 'empleado')
    setServiciosDB(srv || [])
    setEmpleados(emp || [])
  }

  const toastOptions: ToastOptions = {
    position: "top-center", autoClose: 2000, transition: Bounce, hideProgressBar: true, theme: "light"
  };

  const buscarCliente = async () => {
    if (!busquedaCedula) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('clientes').select('*').eq('cedula', busquedaCedula).maybeSingle()
      if (data) {
        setCliente(data); setNombreNuevoCliente(data.nombre); setTelNuevoCliente(data.telefono);
        toast.success(<Notification title="Sistema" description="Cliente reconocido" type="success" />, toastOptions);
      } else {
        setCliente({ nuevo: true });
        toast.info(<Notification title="Registro" description="Nuevo cliente" type="info" />, toastOptions);
      }
    } finally { setLoading(false) }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe ? serviciosSeleccionados.filter(s => s.id !== srv.id) : [...serviciosSeleccionados, srv])
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) => acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0)

  const imprimirRecibo = (datos: any) => {
    const ticketHTML = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: sans-serif; width: 70mm; padding: 5mm; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .plate { font-size: 24px; font-weight: 900; border: 2px solid #000; padding: 5px; margin: 10px 0; text-align: center; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center bold">ECOPLANET KONG</div>
          <div class="plate">${datos.placa}</div>
          <div style="font-size: 10px;">
            <p>FECHA: ${new Date().toLocaleString()}</p>
            <p>TIPO: ${datos.tipo_vehiculo.toUpperCase()}</p>
            <hr>
            <p><b>TOTAL: $${totalOrden.toLocaleString()}</b></p>
          </div>
        </body>
      </html>
    `
    const win = window.open('', '_blank', 'width=300,height=600');
    win?.document.write(ticketHTML);
  }

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      toast.error(<Notification title="Error" description="Faltan datos" type="error" />, toastOptions); return;
    }
    setLoading(true)
    try {
      let fId = null
      const { data: ex } = await supabase.from('clientes').select('id').eq('cedula', busquedaCedula).maybeSingle()
      if (ex) fId = ex.id
      else {
        const { data: n } = await supabase.from('clientes').insert([{ cedula: busquedaCedula, nombre: nombreNuevoCliente || 'Cliente Nuevo', telefono: telNuevoCliente || '' }]).select().single()
        fId = n?.id
      }
      const { data: ord, error } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: fId, placa: placa.toUpperCase(), tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id), nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden, metodo_pago: metodoPago, empleado_id: empleadoAsignado, estado: 'pendiente'
      }]).select().single()
      if (!error && ord) { imprimirRecibo(ord); setOrdenFinalizada(true); }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-80 lg:pb-40 relative">
      <ToastContainer />
      
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gorilla-orange w-2 h-12 rounded-full shadow-lg shadow-orange-200" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Operaciones</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">Nuevo <span className="text-gorilla-orange">Servicio</span></h1>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* PANEL IZQUIERDO */}
          <div className="lg:col-span-7 space-y-8">
            {/* VEHÍCULO */}
            <section className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-slate-200 border border-white relative overflow-hidden group">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <Zap size={16} className="text-gorilla-orange fill-gorilla-orange" /> 1. Vehículo
                </h2>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full md:w-auto">
                  <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 md:px-8 py-3 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${tipoVehiculo === 'carro' ? 'bg-white text-gorilla-orange shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Car size={16} /> CARRO
                  </button>
                  <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 md:px-8 py-3 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${tipoVehiculo === 'moto' ? 'bg-white text-gorilla-orange shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Bike size={16} /> MOTO
                  </button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-[2.5rem] p-10 border-8 border-slate-800 shadow-inner relative group">
                <div className="absolute top-4 left-6 text-slate-700 font-black text-xl italic tracking-tighter">COL</div>
                <input 
                  placeholder="ABC 123"
                  className="w-full bg-transparent border-none text-6xl md:text-8xl font-black text-center uppercase tracking-tighter text-gorilla-orange outline-none placeholder:text-slate-800"
                  value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
            </section>

            {/* SERVICIOS */}
            <section className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-slate-200 border border-white">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">2. Servicios</h2>
                <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">{serviciosSeleccionados.length} Seleccionados</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2 custom-scroll">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <button key={srv.id} onClick={() => toggleServicio(srv)} className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all group ${sel ? 'bg-purple-50 border-gorilla-purple shadow-xl shadow-purple-100' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-all ${sel ? 'bg-gorilla-purple text-white rotate-[360deg]' : 'bg-white text-slate-300'}`}>
                          {sel ? <Check size={18} strokeWidth={3}/> : <Plus size={18}/>}
                        </div>
                        <span className={`font-black uppercase italic text-xs tracking-tight ${sel ? 'text-gorilla-purple' : 'text-slate-600'}`}>{srv.nombre}</span>
                      </div>
                      <span className={`font-black text-sm ${sel ? 'text-slate-900' : 'text-slate-400'}`}>${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* PANEL DERECHO */}
          <div className="lg:col-span-5 space-y-8">
            {/* CLIENTE */}
            <section className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <User size={16} className="text-gorilla-purple" /> 3. Cliente
              </h2>
              <div className="flex gap-3 mb-8">
                <div className="relative flex-1 group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-gorilla-purple" size={18} />
                  <input placeholder="Cédula" className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-12 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold text-slate-900"
                    value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && buscarCliente()} />
                </div>
                <button onClick={buscarCliente} className="bg-gorilla-purple hover:bg-purple-700 text-white p-5 rounded-2xl shadow-xl shadow-purple-200 active:scale-90 transition-all"><Search size={24}/></button>
              </div>
              <AnimatePresence mode="wait">
                {cliente && (
                  <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <input placeholder="Nombre" className="w-full bg-white border border-slate-100 p-4 rounded-xl outline-none font-bold uppercase text-sm" value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                    <input placeholder="WhatsApp" className="w-full bg-white border border-slate-100 p-4 rounded-xl outline-none font-bold text-sm" value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* PAGO & PERSONAL */}
            <section className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">4. Asignación</h2>
              <div className="space-y-6">
                <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 outline-none focus:border-gorilla-orange appearance-none" value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                  <option value="">Seleccionar Lavador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <div className="flex gap-4">
                  <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-5 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>EFECTIVO</button>
                  <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-5 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>TRANSF.</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>

      {/* BARRA INFERIOR FLOTANTE (DOCK) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 z-[100] pointer-events-none">
        <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-3xl border border-white p-6 rounded-[3.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.1)] flex flex-col md:flex-row justify-between items-center gap-6 lg:ml-72 pointer-events-auto">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none mb-2">Total Inversión</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">${totalOrden.toLocaleString()}</span>
                <span className="text-xs font-black text-slate-400 italic uppercase">COP</span>
              </div>
            </div>
            {serviciosSeleccionados.length > 0 && (
                <div className="hidden md:flex gap-2">
                    {serviciosSeleccionados.slice(0,2).map((s,i) => (
                        <div key={i} className="bg-slate-100 p-2 rounded-lg text-[8px] font-black uppercase italic">{s.nombre}</div>
                    ))}
                    {serviciosSeleccionados.length > 2 && <div className="bg-slate-900 text-white p-2 rounded-lg text-[8px] font-black">+{serviciosSeleccionados.length - 2}</div>}
                </div>
            )}
          </div>
          <button onClick={crearOrden} disabled={loading} className="w-full md:w-auto bg-gradient-to-r from-gorilla-orange to-orange-600 hover:to-orange-700 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl italic uppercase tracking-[0.1em] shadow-[0_20px_50px_rgba(255,107,0,0.3)] disabled:opacity-50 flex items-center justify-center gap-4 transition-all active:scale-95 group">
            {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <>REGISTRAR & TIQUETE <Printer size={24} className="group-hover:rotate-12 transition-transform"/></>}
          </button>
        </div>
      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white p-12 rounded-[4rem] text-center max-w-sm w-full shadow-2xl border border-white">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-200">
                <Check size={54} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight mb-4 tracking-tighter">Servicio<br/>Registrado</h2>
              <p className="text-slate-400 font-bold mb-10 text-sm uppercase tracking-widest italic">Imprimiendo recibo...</p>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-3xl uppercase tracking-widest shadow-xl transition-all">Nueva Orden</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .bg-gorilla-orange { background-color: #FF6B00; }
        .text-gorilla-orange { color: #FF6B00; }
        .border-gorilla-orange { border-color: #FF6B00; }
        .bg-gorilla-purple { background-color: #8B5CF6; }
      `}</style>
    </div>
  )
}