'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CheckCircle2, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, ArrowRight, UserPlus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function NuevoServicioPage() {
  const supabase = createClient()
  const [serviciosDB, setServiciosDB] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [ordenFinalizada, setOrdenFinalizada] = useState<any>(null)

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
    setNombreNuevoCliente('')
    setTelNuevoCliente('')

    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('cedula', busquedaCedula)
      .maybeSingle()

    if (data) {
      setCliente(data)
      setNombreNuevoCliente(data.nombre)
      setTelNuevoCliente(data.telefono)
    } else {
      setCliente({ nuevo: true })
    }
  }

  const toggleServicio = (srv: any) => {
    const existe = serviciosSeleccionados.find(s => s.id === srv.id)
    setServiciosSeleccionados(existe
      ? serviciosSeleccionados.filter(s => s.id !== srv.id)
      : [...serviciosSeleccionados, srv]
    )
  }

  const totalOrden = serviciosSeleccionados.reduce((acc, s) =>
    acc + (tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto), 0
  )

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      alert("Por favor rellena todos los campos");
      return;
    }

    setLoading(true);
    try {
      let finalClienteId = null;
      const { data: clienteExistente } = await supabase.from('clientes').select('id').eq('cedula', busquedaCedula).maybeSingle();

      if (clienteExistente) {
        finalClienteId = clienteExistente.id;
      } else {
        const { data: nuevoCl, error: errCl } = await supabase.from('clientes').insert([{
          cedula: busquedaCedula,
          nombre: nombreNuevoCliente || 'Cliente Nuevo',
          telefono: telNuevoCliente || ''
        }]).select().single();
        if (errCl) throw errCl;
        finalClienteId = nuevoCl.id;
      }

      const nuevaOrden = {
        cliente_id: finalClienteId,
        placa: placa.toUpperCase(),
        tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id),
        nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden,
        metodo_pago: metodoPago,
        empleado_id: empleadoAsignado,
        estado: 'pendiente'
      };

      const { data: ordenGuardada, error: errOrd } = await supabase.from('ordenes_servicio').insert([nuevaOrden]).select().single();
      if (errOrd) throw errOrd;

      setOrdenFinalizada({ ...nuevaOrden, id_ticket: ordenGuardada.id.split('-')[0], fecha: new Date() });
      setTimeout(() => { window.print(); }, 800);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-44 relative">
      
      {/* TICKET DE IMPRESIÓN (OCULTO) */}
      <div id="ticket-impresion" className="hidden print:block text-black p-4 font-mono text-[10pt] w-[80mm]">
          <div className="text-center mb-4 border-b border-dashed border-black pb-2 uppercase font-bold">
            <h2 className="text-xl">ECOPLANET KONG</h2>
            <p className="text-xs">Lavado & Detallado</p>
          </div>
          <div className="space-y-1 mb-4 text-xs">
              <p>Fecha: {new Date().toLocaleString()}</p>
              <p className="font-bold">PLACA: {placa.toUpperCase()}</p>
              <p>Atiende: {empleados.find(e => e.id === empleadoAsignado)?.nombre}</p>
          </div>
          <div className="border-b border-dashed border-black mb-2 pb-1">
              <p className="font-bold mb-1 uppercase text-xs">Servicios:</p>
              {serviciosSeleccionados.map((s,i) => (
                  <div key={i} className="flex justify-between text-xs uppercase">
                      <span>{s.nombre}</span>
                      <span>${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
                  </div>
              ))}
          </div>
          <div className="text-right font-bold text-lg">TOTAL: ${totalOrden.toLocaleString()}</div>
          <p className="text-center mt-6 text-[8pt] italic font-bold">¡CONSERVE ESTE RECIBO!</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-12">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-12 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Terminal Operativa</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic uppercase">
                Nuevo <span className="text-gorilla-orange underline decoration-slate-200 underline-offset-8">Servicio</span>
            </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* COLUMNA IZQUIERDA: VEHICULO & SERVICIOS */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* CARD: VEHICULO */}
            <section className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/60 border border-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -z-0 transition-transform group-hover:scale-110" />
              
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 relative z-10">
                <Zap size={16} className="text-gorilla-orange fill-gorilla-orange" /> 1. Vehículo & Placa
              </h2>

              <div className="flex gap-6 mb-10 relative z-10">
                <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${tipoVehiculo === 'carro' ? 'border-gorilla-orange bg-orange-50/50 shadow-xl shadow-orange-200/50' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                  <Car size={48} className={tipoVehiculo === 'carro' ? 'text-gorilla-orange animate-bounce' : ''} /> 
                  <span className="font-black italic tracking-widest text-sm">CARRO</span>
                </button>
                <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${tipoVehiculo === 'moto' ? 'border-gorilla-orange bg-orange-50/50 shadow-xl shadow-orange-200/50' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                  <Bike size={48} className={tipoVehiculo === 'moto' ? 'text-gorilla-orange animate-bounce' : ''} /> 
                  <span className="font-black italic tracking-widest text-sm">MOTO</span>
                </button>
              </div>

              <div className="relative z-10">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl tracking-tighter italic">COL</div>
                <input
                    placeholder="ABC 123"
                    className="w-full bg-slate-900 border-none rounded-[2rem] p-10 text-6xl font-black text-center uppercase tracking-tighter text-gorilla-orange shadow-inner placeholder:text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    value={placa}
                    onChange={e => setPlaca(e.target.value)}
                />
              </div>
            </section>

            {/* CARD: SERVICIOS */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">2. Selección de Servicios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const seleccionado = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      key={srv.id} 
                      onClick={() => toggleServicio(srv)}
                      className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${seleccionado ? 'border-gorilla-purple bg-purple-50 text-gorilla-purple shadow-lg shadow-purple-100' : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${seleccionado ? 'bg-gorilla-purple text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {seleccionado ? <Check size={18} strokeWidth={4} /> : <Plus size={18} />}
                        </div>
                        <span className="font-black italic uppercase text-xs tracking-tight">{srv.nombre}</span>
                      </div>
                      <span className={`font-black ${seleccionado ? 'text-gorilla-purple' : 'text-slate-900'}`}>${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                    </motion.button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA: CLIENTE & ASIGNACION */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* CARD: CLIENTE */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-white">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <User size={16} className="text-gorilla-purple" /> 3. Identificación Cliente
                </h2>
                
                <div className="flex gap-3 mb-8">
                    <div className="relative flex-1 group">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-gorilla-purple" size={18} />
                        <input 
                            placeholder="Cédula del cliente" 
                            className="w-full bg-slate-50 border border-slate-100 p-5 pl-12 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold text-slate-900"
                            value={busquedaCedula} 
                            onChange={e => setBusquedaCedula(e.target.value)} 
                        />
                    </div>
                    <button onClick={buscarCliente} className="bg-gorilla-purple hover:bg-purple-700 text-white p-5 rounded-2xl transition-all shadow-lg shadow-purple-200 active:scale-90">
                        <Search size={24}/>
                    </button>
                </div>

                <AnimatePresence>
                    {cliente && (
                        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                            {cliente.nuevo && (
                                <div className="flex items-center gap-2 text-gorilla-orange mb-4">
                                    <UserPlus size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Nuevo Cliente Detectado</span>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 ml-1">NOMBRE</label>
                                <input placeholder="Nombre Completo" className="w-full bg-white border border-slate-100 p-4 rounded-xl outline-none font-bold uppercase"
                                    value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 ml-1">WHATSAPP</label>
                                <input placeholder="Número de Celular" className="w-full bg-white border border-slate-100 p-4 rounded-xl outline-none font-bold"
                                    value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* CARD: ASIGNACION */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-white">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">4. Finalizar Registro</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Empleado a Cargo</label>
                        <select className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-700 font-bold outline-none focus:border-gorilla-orange appearance-none"
                            value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                            <option value="">Seleccionar Lavador...</option>
                            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-5 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all font-black text-xs tracking-widest ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-600 shadow-lg shadow-green-100' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
                            <DollarSign size={18}/> EFECTIVO
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-5 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all font-black text-xs tracking-widest ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
                            <CreditCard size={18}/> TRANSFERENCIA
                        </button>
                    </div>
                </div>
            </section>
          </div>
        </div>
      </motion.div>

      {/* BARRA INFERIOR FLOTANTE DE ACCION */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 p-8 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 lg:pl-72">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Inversión Total</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">${totalOrden.toLocaleString()}</p>
            </div>
            {serviciosSeleccionados.length > 0 && (
                <div className="bg-slate-100 h-10 w-px hidden md:block" />
            )}
            <div className="hidden md:flex gap-2">
                {serviciosSeleccionados.map((s, idx) => (
                    <span key={idx} className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase italic">
                        {s.nombre}
                    </span>
                ))}
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={crearOrden} 
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-r from-gorilla-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-12 py-6 rounded-[2rem] font-black text-xl italic uppercase tracking-widest shadow-[0_20px_50px_rgba(244,127,32,0.35)] disabled:opacity-50 flex items-center justify-center gap-4 group"
          >
            {loading ? 'Procesando...' : (
                <>
                Registrar & Tiquete 
                <Printer size={24} className="group-hover:rotate-12 transition-transform" />
                </>
            )}
          </motion.button>
        </div>
      </div>

      {/* MODAL DE ÉXITO TRAS IMPRESIÓN */}
      <AnimatePresence>
        {ordenFinalizada && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
                <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white p-12 rounded-[4rem] text-center max-w-sm shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white">
                    <div className="w-24 h-24 bg-green-500 shadow-[0_15px_40px_rgba(34,197,94,0.4)] rounded-full flex items-center justify-center mx-auto mb-8">
                        <Check size={48} className="text-white" strokeWidth={4} />
                    </div>
                    <h2 className="text-3xl font-black mb-3 uppercase italic text-slate-900 tracking-tighter leading-none">¡Registro<br/>Completado!</h2>
                    <p className="text-slate-400 font-bold mb-10 text-sm">El tiquete ha sido enviado a la validadora correctamente.</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-3xl uppercase tracking-[0.2em] shadow-xl transition-all">
                        Nueva Orden
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  )
}