'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, UserPlus, XCircle, ChevronRight, MapPin, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bounce, ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const dynamic = 'force-dynamic'

// --- Utilidades ---
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
        toast.success(<Notification title="SISTEMA" description="Cliente reconocido" type="success" />, toastOptions);
      } else {
        setCliente({ nuevo: true });
        toast.info(<Notification title="REGISTRO" description="Nuevo cliente detectado" type="info" />, toastOptions);
      }
    } finally { setLoading(false) }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe ? serviciosSeleccionados.filter(s => s.id !== srv.id) : [...serviciosSeleccionados, srv])
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) => acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0)

  // --- DISEÑO DE IMPRESIÓN MEJORADO ---
  const imprimirRecibo = (datos: any) => {
    const nombreEmpleado = empleados.find(e => e.id === empleadoAsignado)?.nombre || 'General'
    const logoUrl = window.location.origin + '/logo.png'; // Ruta de tu logo en /public
    const nCli = cliente?.nombre || nombreNuevoCliente || 'Cliente General';
    const cCli = cliente?.cedula || busquedaCedula || 'N/A';

    const ticketHTML = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier Prime', monospace; 
              width: 74mm; 
              padding: 4mm; 
              color: #000; 
              font-size: 12px; 
              line-height: 1.2;
            }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .logo { width: 40mm; margin: 0 auto 5px; display: block; filter: grayscale(1); }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .plate-box { 
              border: 2px solid #000; 
              padding: 8px; 
              margin: 10px 0; 
              font-size: 28px; 
              font-weight: 700; 
              text-align: center; 
              letter-spacing: 2px;
            }
            .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total { 
              font-size: 20px; 
              font-weight: 700; 
              margin-top: 10px; 
              display: flex; 
              justify-content: space-between; 
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .footer { font-size: 10px; margin-top: 15px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="${logoUrl}" class="logo" />
            <div class="bold" style="font-size: 18px;">ECOPLANET KONG</div>
            <div style="font-size: 10px;">CALLE 14 # 3 - 08, SOACHA</div>
            <div style="font-size: 10px;">TEL: 310 337 5612</div>
          </div>

          <div class="divider"></div>
          <div class="plate-box">${datos.placa}</div>

          <div><b>ORDEN:</b> #${datos.id.split('-')[0].toUpperCase()}</div>
          <div><b>FECHA:</b> ${new Date().toLocaleString()}</div>
          <div><b>CLIENTE:</b> ${nCli.toUpperCase()}</div>
          <div><b>TIPO:</b> ${datos.tipo_vehiculo.toUpperCase()}</div>
          <div><b>OPERARIO:</b> ${nombreEmpleado.toUpperCase()}</div>

          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 5px;">SERVICIOS</div>
          ${serviciosSeleccionados.map(s => `
            <div class="item">
              <span>${s.nombre.toUpperCase()}</span>
              <span>$${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
            </div>
          `).join('')}

          <div class="total">
            <span>TOTAL:</span>
            <span>$${totalOrden.toLocaleString()}</span>
          </div>
          <div style="font-size: 10px; margin-top: 5px;">PAGO: ${metodoPago.toUpperCase()}</div>

          <div class="center footer">
            <p>¡Gracias por confiar en el mejor equipo!</p>
          </div>

          <script>
            // Pequeño script interno para asegurar que el logo cargue antes de imprimir
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `

    // --- LÓGICA DE IFRAME INVISIBLE ---
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(ticketHTML);
      doc.close();

      // Disparar impresión
      iframe.contentWindow?.focus();
      // Le damos un momento para que cargue el logo antes de imprimir
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Limpiamos el DOM eliminando el iframe después de 2 segundos
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 500);
    }
  }

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      toast.error(<Notification title="ERROR" description="Faltan datos obligatorios" type="error" />, toastOptions); return;
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

      if (!error && ord) {
        // 1. Mandamos a imprimir (usará el iframe invisible)
        imprimirRecibo(ord); 
        
        // 2. Mostramos el modal de éxito de una vez
        setOrdenFinalizada(true); 

        // 3. Opcional: Feedback visual de éxito
        toast.success("Servicio registrado e imprimiendo...");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar la orden");
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-4 md:p-8 pb-40">
      <ToastContainer />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">

        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gorilla-orange w-3 h-14 rounded-full" />
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase italic leading-none">
                Nuevo <span className="text-gorilla-orange">Servicio</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Terminal de Ventas | Ecoplanet Kong</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* COLUMNA IZQUIERDA: VEHICULO Y SERVICIOS */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. VEHÍCULO */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">01. Identificación</span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setTipoVehiculo('carro')} className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all flex items-center gap-2 ${tipoVehiculo === 'carro' ? 'bg-white text-gorilla-orange shadow-sm' : 'text-slate-400'}`}>
                    <Car size={14} /> CARRO
                  </button>
                  <button onClick={() => setTipoVehiculo('moto')} className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all flex items-center gap-2 ${tipoVehiculo === 'moto' ? 'bg-white text-gorilla-orange shadow-sm' : 'text-slate-400'}`}>
                    <Bike size={14} /> MOTO
                  </button>
                </div>
              </div>

              {/* Diseño Placa Colombiana */}
              <div className="max-w-xs mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-xl p-4 border-4 border-black/10 shadow-lg">
                  <div className="flex justify-between items-center px-4 mb-1">
                    <span className="text-[8px] font-black text-black/40 tracking-[0.3em]">COLOMBIA</span>
                    <div className="w-2 h-2 rounded-full bg-black/10" />
                  </div>
                  <input
                    placeholder="ABC 123"
                    className="w-full bg-transparent border-none text-6xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none placeholder:text-black/5"
                    value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </section>

            {/* 2. SERVICIOS */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">02. Catálogo</span>
                <span className="text-xs font-bold text-slate-400">{serviciosSeleccionados.length} Items</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  const precio = tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto;
                  return (
                    <button key={srv.id} onClick={() => toggleServicio(srv)}
                      className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${sel ? 'bg-orange-50 border-gorilla-orange' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${sel ? 'bg-gorilla-orange text-white' : 'bg-white text-slate-300 shadow-sm'}`}>
                          {sel ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                        </div>
                        <span className={`font-black text-sm ${sel ? 'text-slate-900' : 'text-slate-400'}`}>{formatearPrecio(precio)}</span>
                      </div>
                      <span className={`font-bold uppercase text-[11px] leading-tight ${sel ? 'text-gorilla-orange' : 'text-slate-600'}`}>{srv.nombre}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA: CLIENTE Y ASIGNACIÓN */}
          <div className="lg:col-span-5 space-y-6">

            {/* 3. CLIENTE */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter mb-6 inline-block">03. Datos Cliente</span>
              <div className="flex gap-2 mb-4 mt-4">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input placeholder="Cédula" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl outline-none focus:ring-2 ring-gorilla-purple/20 transition-all font-bold"
                    value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && buscarCliente()} />
                </div>
                <button onClick={buscarCliente} className="bg-gorilla-purple text-white px-5 rounded-2xl shadow-lg shadow-purple-100 hover:scale-105 transition-all"><Search size={20} /></button>
              </div>

              <AnimatePresence mode="wait">
                {cliente && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 pt-2">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input placeholder="Nombre Completo" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-xl outline-none font-bold uppercase text-xs" value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input placeholder="WhatsApp / Teléfono" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-xl outline-none font-bold text-xs" value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* 4. ASIGNACIÓN Y PAGO */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter mb-6 inline-block">04. Finalización</span>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Asignar Lavador</label>
                  <select className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 outline-none appearance-none" value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] border-2 transition-all ${metodoPago === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}>EFECTIVO</button>
                  <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] border-2 transition-all ${metodoPago === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}>TRANSF.</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>

      {/* FOOTER ACTION BAR (STICKY) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50">
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-4 pl-10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-white/10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total a cobrar</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter">{formatearPrecio(totalOrden)}</span>
              </div>
            </div>
            <div className="hidden md:flex gap-2">
              {serviciosSeleccionados.slice(0, 3).map((s, i) => (
                <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase italic text-orange-400 border border-white/5">{s.nombre}</span>
              ))}
              {serviciosSeleccionados.length > 3 && <span className="text-[9px] font-bold text-slate-500">+{serviciosSeleccionados.length - 3}</span>}
            </div>
          </div>
          <button
            onClick={crearOrden}
            disabled={loading || !placa}
            className="w-full md:w-auto bg-gorilla-orange hover:bg-orange-600 px-10 py-5 rounded-[2rem] font-black text-sm uppercase italic tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>PROCESAR Y RECIBO <Printer size={18} /></>}
          </button>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {ordenFinalizada && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <Check size={40} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-2">¡Orden Exitosa!</h2>
              <p className="text-slate-500 font-medium mb-8 text-sm">El tiquete se ha generado y la orden está en proceso.</p>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-black transition-all">Nueva Orden</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .bg-gorilla-orange { background-color: #FF6B00; }
        .text-gorilla-orange { color: #FF6B00; }
        .bg-gorilla-purple { background-color: #8B5CF6; }
      `}</style>
    </div>
  )
}