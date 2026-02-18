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

const Notification = ({ title, description, type }: { title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' }) => (
  <div className={`flex items-center p-4 rounded-xl shadow-lg border ${type === 'success' ? 'bg-green-50 border-green-200' :
      type === 'error' ? 'bg-red-50 border-red-200' :
        type === 'info' ? 'bg-blue-50 border-blue-200' :
          'bg-yellow-50 border-yellow-200'
    }`}>
    <div className={`p-2 rounded-full mr-3 ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
          type === 'info' ? 'bg-blue-500 text-white' :
            'bg-yellow-500 text-white'
      }`}>
      {type === 'success' ? <Check size={18} /> : type === 'error' ? <XCircle size={18} /> : <Zap size={18} />}
    </div>
    <div>
      <p className={`font-black text-sm ${type === 'success' ? 'text-green-800' :
          type === 'error' ? 'text-red-800' :
            type === 'info' ? 'text-blue-800' :
              'text-yellow-800'
        }`}>{title}</p>
      <p className="text-xs text-gray-600">{description}</p>
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

  useEffect(() => {
    fetchMaestros()
  }, [])

  const fetchMaestros = async () => {
    const { data: srv } = await supabase.from('servicios').select('*')
    const { data: emp } = await supabase.from('perfiles').select('*').eq('rol', 'empleado')
    setServiciosDB(srv || [])
    setEmpleados(emp || [])
  }

  const toastOptions: ToastOptions = {
    position: "top-center" as ToastPosition,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
    transition: Bounce,
  };

  const buscarCliente = async () => {
    if (!busquedaCedula) {
      toast.warn(<Notification title="Atención" description="Ingresa una cédula." type="warning" />, toastOptions);
      return;
    }
    setCliente(null); setNombreNuevoCliente(''); setTelNuevoCliente(''); setLoading(true);
    try {
      const { data } = await supabase.from('clientes').select('*').eq('cedula', busquedaCedula).maybeSingle()
      if (data) {
        setCliente(data); setNombreNuevoCliente(data.nombre); setTelNuevoCliente(data.telefono);
        toast.success(<Notification title="Éxito" description="Cliente encontrado." type="success" />, toastOptions);
      } else {
        setCliente({ nuevo: true });
        toast.info(<Notification title="Nuevo" description="Cliente no registrado." type="info" />, toastOptions);
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
    const logoUrl = window.location.origin + '/logo.png';
    const nCli = cliente?.nombre || nombreNuevoCliente || 'Cliente General';
    const cCli = cliente?.cedula || busquedaCedula || 'N/A';

    const ticketHTML = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Inter', sans-serif; width: 74mm; padding: 4mm; color: #000; font-size: 11px; line-height: 1.2; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .logo { max-width: 45mm; margin: 0 auto 5px; display: block; filter: grayscale(1); }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .plate { font-size: 26px; font-weight: 900; border: 2px solid #000; padding: 4px; margin: 10px 0; display: block; text-align: center; }
            .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total { font-size: 20px; font-weight: 900; margin-top: 10px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="${logoUrl}" class="logo" onerror="this.style.display='none'"/>
            <div class="bold" style="font-size: 18px;">ECOPLANET KONG</div>
            <div>LAVADO PROFESIONAL</div>
          </div>
          <div class="divider"></div>
          <div class="plate">${datos.placa}</div>
          <div><b>FECHA:</b> ${new Date().toLocaleString()}</div>
          <div><b>VEHICULO:</b> ${datos.tipo_vehiculo.toUpperCase()}</div>
          <div><b>ATIENDE:</b> ${nombreEmpleado}</div>
          <div><b>CLIENTE:</b> ${cCli} - ${nCli.toUpperCase()}</div>
          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 5px;">SERVICIOS:</div>
          ${serviciosSeleccionados.map(s => `
            <div class="item">
              <span>${s.nombre.toUpperCase()}</span>
              <span>$${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">
            <span>TOTAL:</span>
            <span>$${totalOrden.toLocaleString()}</span>
          </div>
          <div class="center" style="margin-top: 15px;">¡GRACIAS POR TU PREFERENCIA!</div>
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
      toast.error(<Notification title="Error" description="Completa todos los campos." type="error" />, toastOptions); return;
    }
    setLoading(true)
    try {
      let fId = null
      const { data: ex } = await supabase.from('clientes').select('id').eq('cedula', busquedaCedula).maybeSingle()
      if (ex) { fId = ex.id }
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
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-4 md:p-8 pb-80 md:pb-72 relative">
      <ToastContainer />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto">

        <header className="mb-6 md:mb-10 flex items-end gap-4">
          <div className="bg-gorilla-orange w-1.5 md:w-2 h-10 md:h-12 rounded-full" />
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Operaciones</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">Nuevo <span className="text-gorilla-orange">Servicio</span></h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
            <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-xl border border-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Hash size={14} className="text-gorilla-orange" /> 1. Vehículo</h2>
                <div className="flex gap-2">
                  <button onClick={() => setTipoVehiculo('carro')} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all border-2 ${tipoVehiculo === 'carro' ? 'bg-orange-50 border-gorilla-orange text-gorilla-orange' : 'bg-slate-50 border-transparent text-slate-400'}`}><Car size={16} /></button>
                  <button onClick={() => setTipoVehiculo('moto')} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all border-2 ${tipoVehiculo === 'moto' ? 'bg-orange-50 border-gorilla-orange text-gorilla-orange' : 'bg-slate-50 border-transparent text-slate-400'}`}><Bike size={16} /></button>
                </div>
              </div>
              <div className="bg-slate-900 rounded-[1.5rem] p-6 border-4 border-slate-800">
                <input placeholder="PLACA" className="w-full bg-transparent border-none text-5xl md:text-7xl font-black text-center uppercase text-gorilla-orange outline-none placeholder:text-slate-800" value={placa} onChange={e => setPlaca(e.target.value)} />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-xl border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">2. Servicios</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <button key={srv.id} onClick={() => toggleServicio(srv)} className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${sel ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sel ? 'bg-green-500 text-white' : 'bg-white text-slate-300'}`}>{sel ? <Check size={14} /> : <Plus size={14} />}</div>
                        <span className={`font-black text-[10px] uppercase italic ${sel ? 'text-green-800' : 'text-slate-600'}`}>{srv.nombre}</span>
                      </div>
                      <span className="font-black text-xs">${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 md:space-y-8">
            <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-xl border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6"><User size={14} className="text-gorilla-purple" /> 3. Cliente</h2>
              <div className="flex gap-2 mb-4">
                <input placeholder="Cédula" className="w-full bg-white border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-gorilla-purple font-bold text-slate-600" value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} />
                <button onClick={buscarCliente} className="bg-gorilla-purple text-white p-4 rounded-xl shadow-lg hover:scale-105 transition-all"><Search size={20} /></button>
              </div>
              <AnimatePresence mode="wait">
                {cliente && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <input placeholder="Nombre" className="w-full bg-white border border-slate-200 p-3 rounded-lg outline-none font-black uppercase text-xs focus:border-gorilla-purple" value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                    <input placeholder="Teléfono" className="w-full bg-white border border-slate-200 p-3 rounded-lg outline-none font-black text-xs focus:border-gorilla-purple" value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-xl border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">4. Pago</h2>
              <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold mb-4 outline-none focus:border-gorilla-orange text-sm appearance-none select-custom-arrow bg-right-1rem bg-no-repeat bg-origin-content" value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                <option value="">Seleccionar Lavador...</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-4 rounded-xl font-black text-[10px] border-2 ${metodoPago === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>EFECTIVO</button>
                <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-4 rounded-xl font-black text-[10px] border-2 ${metodoPago === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>TRANSF.</button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 z-50">
        <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-2xl border border-white p-5 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 lg:ml-72">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl text-white"><DollarSign size={20} className="text-gorilla-orange" /></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
              <p className="text-3xl md:text-5xl font-black text-slate-900 leading-none">${totalOrden.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={crearOrden} disabled={loading} className="w-full md:w-auto bg-gorilla-orange text-white px-10 py-5 rounded-[2rem] font-black text-xl italic uppercase shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <> REGISTRAR <Printer size={20} /> </>}
          </button>
        </div>
      </div>

      <style jsx global>{`
        :root { --color-gorilla-orange: #FF6B00; --color-gorilla-purple: #8B5CF6; }
        .bg-gorilla-orange { background-color: var(--color-gorilla-orange); }
        .text-gorilla-orange { color: var(--color-gorilla-orange); }
        .border-gorilla-orange { border-color: var(--color-gorilla-orange); }
        .bg-gorilla-purple { background-color: var(--color-gorilla-purple); }
        .focus\\:border-gorilla-purple:focus { border-color: var(--color-gorilla-purple); }
        .select-custom-arrow { background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"%3e%3cpath fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/%3e%3c/svg%3e'); }
        .bg-right-1rem { background-position: right 1rem center; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100"><Check size={40} className="text-white" strokeWidth={4} /></div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-6">Registro<br />Exitoso</h2>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest active:scale-95">Nueva Orden</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}