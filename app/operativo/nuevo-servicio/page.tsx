'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, UserPlus,
  ChevronRight, MapPin, Phone, ShieldCheck, BadgeCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounce, ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const dynamic = 'force-dynamic'

const formatearPrecio = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

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

  const toastOptions: ToastOptions = { position: "top-center", autoClose: 2000, transition: Bounce, hideProgressBar: true, theme: "light" };

  const buscarCliente = async () => {
    if (!busquedaCedula) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('clientes').select('*').eq('cedula', busquedaCedula).maybeSingle()
      if (data) {
        setCliente(data); setNombreNuevoCliente(data.nombre); setTelNuevoCliente(data.telefono);
        toast.success("Cliente reconocido", toastOptions);
      } else {
        setCliente({ nuevo: true });
        toast.info("Nuevo cliente detectado", toastOptions);
      }
    } finally { setLoading(false) }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe ? serviciosSeleccionados.filter(s => s.id !== srv.id) : [...serviciosSeleccionados, srv])
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) => acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0)

  const imprimirRecibo = (datos: any) => {
    const nombreEmpleado = empleados.find(e => e.id === empleadoAsignado)?.nombre || 'General'
    const nCli = cliente?.nombre || nombreNuevoCliente || 'Cliente General';
    const cCli = cliente?.cedula || busquedaCedula || 'N/A';

    const ticketHTML = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: sans-serif; width: 70mm; padding: 5mm; color: #000; font-size: 11px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .plate { font-size: 24px; font-weight: 900; border: 2px solid #000; padding: 5px; margin: 10px 0; text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center bold">ECOPLANET KONG</div>
          <div class="center bold">310 337 5612</div>
          <div class="divider"></div>
          <div class="plate">${datos.placa}</div>
          <div><b>FECHA:</b> ${new Date().toLocaleString()}</div>
          <div><b>ATIENDE:</b> ${nombreEmpleado}</div>
          <div><b>CLIENTE:</b> ${nCli}</div>
          <div class="divider"></div>
          <div class="bold">SERVICIOS:</div>
          ${serviciosSeleccionados.map(s => `<div>- ${s.nombre.toUpperCase()}</div>`).join('')}
          <div class="divider"></div>
          <div style="font-size: 16px; text-align: right;"><b>TOTAL: $${totalOrden.toLocaleString()}</b></div>
        </body>
      </html>
    `
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(ticketHTML); doc.close();
      setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 500);
    }
  }

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      toast.error("Faltan datos obligatorios", toastOptions); return;
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
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-4 md:p-10 pb-64 lg:pb-32 relative">
      <ToastContainer />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        {/* HEADER MODERNO */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-10 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Terminal de Operaciones</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
              Nuevo <span className="text-gorilla-orange underline decoration-slate-200 underline-offset-8">Servicio</span>
            </h1>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sistema en línea</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* PANEL CENTRAL: PLACA Y SERVICIOS */}
          <div className="lg:col-span-8 space-y-8">

            {/* 01. VEHICULO & PLACA */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-white group">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-6 flex-1 w-full md:w-auto">
                  <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100 gap-2">
                    <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${tipoVehiculo === 'carro' ? 'bg-white text-blue-600 shadow-lg border border-blue-50' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Car size={18} /> CARRO
                    </button>
                    <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${tipoVehiculo === 'moto' ? 'bg-white text-gorilla-orange shadow-lg border border-orange-50' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Bike size={18} /> MOTO
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-200 font-black text-4xl italic tracking-tighter select-none">PLACA</div>
                    <input
                      placeholder="ABC 123"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-8 pl-32 text-5xl md:text-7xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none focus:border-gorilla-orange focus:bg-white transition-all shadow-inner"
                      value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 02. SERVICIOS */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200 border border-white">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Portafolio de Servicios</h2>
                <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase italic">{serviciosSeleccionados.length} Seleccionados</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] lg:max-h-none overflow-y-auto pr-2 custom-scroll">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      key={srv.id}
                      onClick={() => toggleServicio(srv)}
                      className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${sel ? 'bg-purple-50 border-gorilla-purple shadow-lg shadow-purple-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${sel ? 'bg-gorilla-purple text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
                          {sel ? <BadgeCheck size={24} /> : <Plus size={20} />}
                        </div>
                        <span className={`font-black uppercase italic text-xs tracking-tight ${sel ? 'text-gorilla-purple' : 'text-slate-600'}`}>{srv.nombre}</span>
                      </div>
                      <div className="text-right">
                        <span className={`block font-black text-sm ${sel ? 'text-slate-900' : 'text-slate-400'}`}>${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* PANEL LATERAL: CLIENTE & ASIGNACION */}
          <div className="lg:col-span-4 space-y-8">

            {/* 03. CLIENTE */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Identificación Cliente</h2>

              <div className="flex gap-2 mb-6">
                <div className="relative flex-1 group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-gorilla-purple transition-colors" size={18} />
                  <input
                    placeholder="Cédula"
                    className="w-full bg-slate-50 border border-slate-100 p-5 pl-12 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-bold text-slate-900"
                    value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)}
                  />
                </div>
                <button onClick={buscarCliente} className="bg-gorilla-purple text-white p-5 rounded-2xl shadow-xl shadow-purple-200 active:scale-90 transition-all">
                  <Search size={24} />
                </button>
              </div>

              <AnimatePresence>
                {cliente && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    {cliente.nuevo && (
                      <div className="flex items-center gap-2 text-gorilla-orange mb-2">
                        <UserPlus size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Nuevo Registro</span>
                      </div>
                    )}
                    <input placeholder="Nombre Completo" className="w-full bg-white border border-slate-200 p-4 rounded-xl outline-none font-bold uppercase text-xs"
                      value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                    <input placeholder="Celular" className="w-full bg-white border border-slate-200 p-4 rounded-xl outline-none font-bold text-xs"
                      value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* 04. ASIGNACION Y PAGO */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Personal & Recaudo</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 ml-2 uppercase italic tracking-widest">Lavador Responsable</label>
                  <select className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-700 font-bold outline-none appearance-none"
                    value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all font-black text-[10px] tracking-widest ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-600 shadow-lg shadow-green-100' : 'bg-white border-slate-100 text-slate-300'}`}>
                    <DollarSign size={18} /> EFECTIVO
                  </button>
                  <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all font-black text-[10px] tracking-widest ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 text-slate-300'}`}>
                    <CreditCard size={18} /> TRANSF.
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>

      {/* DOCK INFERIOR DE ACCION */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 z-50 pointer-events-none">
        <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-2xl p-6 md:p-8 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-center gap-6 lg:ml-72 pointer-events-auto border border-white/10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none italic">Cobro Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter leading-none">${totalOrden.toLocaleString()}</span>
              </div>
            </div>
            {serviciosSeleccionados.length > 0 && (
              <div className="hidden md:block">
                <p className="text-[8px] text-gorilla-orange font-black uppercase tracking-[0.3em] mb-2">Resumen:</p>
                <div className="flex gap-2">
                  {serviciosSeleccionados.slice(0, 2).map((s, i) => (
                    <span key={i} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[8px] font-bold text-slate-300 uppercase italic leading-none">{s.nombre}</span>
                  ))}
                  {serviciosSeleccionados.length > 2 && <span className="bg-gorilla-orange text-white px-2 py-1 rounded-full text-[8px] font-black">+{serviciosSeleccionados.length - 2}</span>}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={crearOrden}
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-r from-gorilla-orange to-orange-600 hover:scale-105 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl italic uppercase tracking-widest shadow-2xl shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-4 active:scale-95"
          >
            {loading ? <span className="animate-pulse">Procesando...</span> : <>PROCESAR VENTA <Printer size={24} /></>}
          </button>
        </div>
      </div>

      {/* MODAL EXITOSO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[4rem] text-center max-w-sm w-full shadow-2xl border border-white">
              <div className="w-24 h-24 bg-green-500 shadow-xl shadow-green-200 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <BadgeCheck size={48} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight mb-4 tracking-tighter">¡Operación<br />Exitosa!</h2>
              <p className="text-slate-400 font-bold mb-10 text-xs uppercase tracking-widest italic leading-relaxed">El tiquete ha sido generado y los datos guardados en el servidor.</p>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Siguiente Registro</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .bg-gorilla-orange { background-color: #FF6B00; }
        .text-gorilla-orange { color: #FF6B00; }
        .border-gorilla-orange { border-color: #FF6B00; }
        .bg-gorilla-purple { background-color: #8B5CF6; }
      `}</style>
    </div>
  )
}