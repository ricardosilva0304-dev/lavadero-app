'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CheckCircle2, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, UserPlus, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

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

  const buscarCliente = async () => {
    if (!busquedaCedula) return
    setCliente(null)
    const { data } = await supabase.from('clientes').select('*').eq('cedula', busquedaCedula).maybeSingle()
    if (data) {
      setCliente(data); setNombreNuevoCliente(data.nombre); setTelNuevoCliente(data.telefono)
    } else {
      setCliente({ nuevo: true })
    }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe ? serviciosSeleccionados.filter(s => s.id !== srv.id) : [...serviciosSeleccionados, srv])
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) => acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0)

  const imprimirRecibo = (datos: any) => {
    const nombreEmpleado = empleados.find(e => e.id === empleadoAsignado)?.nombre || 'General'
    const ticketHTML = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 70mm; padding: 5mm; color: black; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { border-bottom: 1px dashed black; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px; border-top: 1px solid black; }
          </style>
        </head>
        <body>
          <div class="center header">
            <div class="bold" style="font-size: 20px;">ECOPLANET KONG</div>
            <div style="font-size: 10px;">LAVADO PROFESIONAL</div>
          </div>
          <div style="font-size: 12px;">
            <div>FECHA: ${new Date().toLocaleString()}</div>
            <div class="bold" style="font-size: 22px; margin: 10px 0;">PLACA: ${datos.placa}</div>
            <div>VEHICULO: ${datos.tipo_vehiculo.toUpperCase()}</div>
            <div>ATIENDE: ${nombreEmpleado}</div>
          </div>
          <div style="border-top: 1px dashed black; margin: 10px 0;"></div>
          ${serviciosSeleccionados.map(s => `
            <div class="item">
              <span>${s.nombre.toUpperCase()}</span>
              <span>$${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="total">TOTAL: $${totalOrden.toLocaleString()}</div>
          <div class="center" style="margin-top: 20px; font-size: 10px;">¡GRACIAS POR SU PREFERENCIA!</div>
        </body>
      </html>
    `
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(ticketHTML); doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); }, 500);
    }
  }

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      alert("Por favor completa los campos obligatorios"); return;
    }
    setLoading(true)
    try {
      let finalClienteId = null
      const { data: clienteEx } = await supabase.from('clientes').select('id').eq('cedula', busquedaCedula).maybeSingle()
      if (clienteEx) { finalClienteId = clienteEx.id } 
      else {
        const { data: nuevoCl } = await supabase.from('clientes').insert([{ cedula: busquedaCedula, nombre: nombreNuevoCliente || 'Cliente Nuevo', telefono: telNuevoCliente || '' }]).select().single()
        finalClienteId = nuevoCl?.id
      }
      const { data: orden, error } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: finalClienteId, placa: placa.toUpperCase(), tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id), nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden, metodo_pago: metodoPago, empleado_id: empleadoAsignado, estado: 'pendiente'
      }]).select().single()

      if (!error && orden) { imprimirRecibo(orden); setOrdenFinalizada(true); }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-4 md:p-8 pb-72">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto">
        
        {/* HEADER MODERNO */}
        <header className="mb-10 flex items-end gap-4">
            <div className="bg-gorilla-orange w-2 h-12 rounded-full" />
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-2">Operaciones</p>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Nuevo <span className="text-gorilla-orange">Servicio</span></h1>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA: VEHICULO Y SERVICIOS */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* CARD VEHICULO */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-white">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={14} className="text-gorilla-orange" /> 1. Datos del Vehículo
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => setTipoVehiculo('carro')} className={`px-6 py-3 rounded-2xl font-black text-[10px] transition-all flex items-center gap-2 border-2 ${tipoVehiculo === 'carro' ? 'bg-orange-50 border-gorilla-orange text-gorilla-orange' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                            <Car size={16}/> CARRO
                        </button>
                        <button onClick={() => setTipoVehiculo('moto')} className={`px-6 py-3 rounded-2xl font-black text-[10px] transition-all flex items-center gap-2 border-2 ${tipoVehiculo === 'moto' ? 'bg-orange-50 border-gorilla-orange text-gorilla-orange' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                            <Bike size={16}/> MOTO
                        </button>
                    </div>
                </div>

                <div className="relative group bg-slate-900 rounded-[2rem] p-8 border-4 border-slate-800 shadow-inner overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gorilla-orange/20" />
                    <input 
                        placeholder="INGRESE PLACA"
                        className="w-full bg-transparent border-none text-6xl md:text-8xl font-black text-center uppercase tracking-tighter text-gorilla-orange outline-none placeholder:text-slate-800"
                        value={placa} onChange={e => setPlaca(e.target.value)}
                    />
                </div>
            </div>

            {/* CARD SERVICIOS - SCROLLABLE */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-white">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">2. Selección de Servicios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                        const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                        return (
                            <button key={srv.id} onClick={() => toggleServicio(srv)} 
                                className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all group ${sel ? 'bg-purple-50 border-gorilla-purple shadow-lg shadow-purple-100' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl transition-all ${sel ? 'bg-gorilla-purple text-white scale-110 shadow-md' : 'bg-white text-slate-300'}`}>
                                        {sel ? <Check size={18} strokeWidth={4}/> : <Plus size={18}/>}
                                    </div>
                                    <span className={`font-black text-xs uppercase italic ${sel ? 'text-gorilla-purple' : 'text-slate-600'}`}>{srv.nombre}</span>
                                </div>
                                <span className={`font-black text-sm ${sel ? 'text-slate-900' : 'text-slate-400'}`}>${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: CLIENTE Y PAGO */}
          <div className="lg:col-span-5 space-y-8">
            {/* CARD CLIENTE */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-white">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <User size={14} className="text-gorilla-purple" /> 3. Identificación
                </h2>
                <div className="flex gap-3 mb-6">
                    <input placeholder="Número de Cédula" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold"
                        value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} />
                    <button onClick={buscarCliente} className="bg-gorilla-purple text-white p-5 rounded-2xl shadow-xl shadow-purple-200 hover:scale-105 active:scale-95 transition-all"><Search size={24}/></button>
                </div>
                <AnimatePresence>
                    {cliente && (
                        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Nombre Completo</label>
                                <input className="w-full bg-white border border-slate-200 p-4 rounded-xl outline-none font-black uppercase text-xs"
                                    value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Teléfono</label>
                                <input className="w-full bg-white border border-slate-200 p-4 rounded-xl outline-none font-black text-xs"
                                    value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CARD PAGO */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-white">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">4. Asignación & Cobro</h2>
                <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold mb-6 outline-none focus:border-gorilla-orange"
                    value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                    <option value="">Seleccionar Lavador...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <div className="flex gap-4">
                    <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[10px] tracking-widest transition-all border-2 ${metodoPago === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>EFECTIVO</button>
                    <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[10px] tracking-widest transition-all border-2 ${metodoPago === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>TRANSF.</button>
                </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FOOTER BAR - DISEÑO "DOCK" */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 z-50">
        <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-3xl border border-white p-6 md:p-8 rounded-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex flex-col md:flex-row justify-between items-center gap-6 lg:ml-72">
          <div className="flex items-center gap-6">
              <div className="bg-slate-900 p-4 rounded-3xl text-white">
                  <DollarSign size={24} className="text-gorilla-orange" />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">${totalOrden.toLocaleString()}</p>
              </div>
          </div>
          <button 
            onClick={crearOrden} 
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-br from-gorilla-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl italic uppercase tracking-widest shadow-2xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? 'Procesando...' : (
                <> REGISTRAR & TIQUETE <Printer size={24} /> </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white p-12 rounded-[4rem] text-center max-w-sm shadow-2xl border border-white">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-200">
                <Check size={48} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight mb-4">Registro<br/>Completado</h2>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl uppercase tracking-widest shadow-xl hover:bg-black transition-all">Nueva Orden</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}