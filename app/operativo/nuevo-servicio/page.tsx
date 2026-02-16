'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Search, Car, Bike, CheckCircle2, CreditCard, 
  DollarSign, User, Smartphone, Hash, Plus, Printer, X 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
export const dynamic = 'force-dynamic'

export default function NuevoServicioPage() {
  const supabase = createClient()
  
  // Estados de datos
  const [serviciosDB, setServiciosDB] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [ordenFinalizada, setOrdenFinalizada] = useState<any>(null)
  
  // Estado del formulario
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto'>('carro')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<any[]>([])
  const [placa, setPlaca] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [empleadoAsignado, setEmpleadoAsignado] = useState('')

  // Cliente
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
    const { data } = await supabase.from('clientes').select('*').eq('cedula', busquedaCedula).single()
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
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado) return
    setLoading(true)

    let finalClienteId = cliente?.id
    if (cliente?.nuevo) {
      const { data: nuevoCl } = await supabase.from('clientes').insert([{
        cedula: busquedaCedula,
        nombre: nombreNuevoCliente,
        telefono: telNuevoCliente
      }]).select().single()
      if (nuevoCl) finalClienteId = nuevoCl.id
    }

    const nuevaOrden = {
      cliente_id: finalClienteId,
      placa: placa.toUpperCase(),
      tipo_vehiculo: tipoVehiculo,
      servicios_ids: serviciosSeleccionados.map(s => s.id),
      nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
      total: totalOrden,
      metodo_pago: metodoPago,
      empleado_id: empleadoAsignado
    }

    const { data, error } = await supabase.from('ordenes_servicio').insert([nuevaOrden]).select().single()

    if (!error) {
      setOrdenFinalizada({ ...nuevaOrden, id_ticket: data.id.split('-')[0], fecha: new Date() })
      // Auto-ejecutar impresión después de un breve delay para que el DOM se actualice
      setTimeout(() => {
        window.print()
      }, 500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 pb-40 relative">
      
      {/* 1. TICKET OCULTO PARA IMPRESIÓN (Solo visible en print) */}
      <div id="ticket-impresion" className="hidden text-black p-4 font-mono text-sm leading-tight w-[80mm]">
        <div className="text-center mb-4 border-b border-dashed border-black pb-2">
          <Image src="/logo.png" alt="Logo" width={60} height={60} className="mx-auto invert" />
          <h2 className="text-xl font-bold mt-2">GORILLA WASH</h2>
          <p>Nit: 123456789-0</p>
          <p>Calle Ficticia #123</p>
        </div>
        
        <div className="mb-4">
          <p>FECHA: {ordenFinalizada?.fecha.toLocaleString()}</p>
          <p>TICKET: #{ordenFinalizada?.id_ticket}</p>
          <p className="font-bold text-lg">PLACA: {ordenFinalizada?.placa}</p>
          <p>VEHÍCULO: {ordenFinalizada?.tipo_vehiculo.toUpperCase()}</p>
        </div>

        <div className="border-y border-dashed border-black py-2 my-2">
            <p className="font-bold">SERVICIOS:</p>
            {serviciosSeleccionados.map(s => (
                <div key={s.id} className="flex justify-between">
                    <span>- {s.nombre}</span>
                    <span>${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
                </div>
            ))}
        </div>

        <div className="text-right font-bold text-lg">
          TOTAL: ${totalOrden.toLocaleString()}
        </div>

        <div className="text-center mt-6 text-[10px]">
          <p>Atendido por: {empleados.find(e => e.id === empleadoAsignado)?.nombre}</p>
          <p className="mt-2 font-bold italic">¡GRACIAS POR TU PREFERENCIA!</p>
          <p>Conserva este ticket para retirar tu vehículo.</p>
        </div>
      </div>

      {/* 2. INTERFAZ VISUAL (PANTALLA) */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-gorilla-orange flex items-center gap-3 italic">
            NUEVO <span className="text-white">REGISTRO</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECCIÓN VEHÍCULO */}
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Hash size={14} className="text-gorilla-orange" /> Información del Vehículo
              </h2>
              
              <div className="flex gap-4 mb-6">
                <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${tipoVehiculo === 'carro' ? 'border-gorilla-orange bg-gorilla-orange/10 shadow-[0_0_20px_rgba(244,127,32,0.2)]' : 'border-white/5 bg-black/20 text-gray-500'}`}>
                  <Car size={40} /> <span className="font-black italic">CARRO</span>
                </button>
                <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${tipoVehiculo === 'moto' ? 'border-gorilla-orange bg-gorilla-orange/10 shadow-[0_0_20px_rgba(244,127,32,0.2)]' : 'border-white/5 bg-black/20 text-gray-500'}`}>
                  <Bike size={40} /> <span className="font-black italic">MOTO</span>
                </button>
              </div>

              <input 
                placeholder="PLACA" 
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-6 text-5xl font-black text-center uppercase tracking-tighter focus:border-gorilla-orange focus:ring-4 focus:ring-gorilla-orange/10 outline-none transition-all text-white placeholder:text-white/10"
                value={placa} 
                onChange={e => setPlaca(e.target.value)} 
              />
            </div>

            {/* SECCIÓN SERVICIOS */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Selección de Servicios</h2>
                <div className="grid grid-cols-1 gap-3">
                    {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                        const seleccionado = serviciosSeleccionados.find(s => s.id === srv.id)
                        return (
                            <button key={srv.id} onClick={() => toggleServicio(srv)}
                                className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${seleccionado ? 'border-gorilla-purple bg-gorilla-purple/10' : 'border-white/5 bg-black/40 text-gray-400'}`}>
                                <div className="flex items-center gap-3">
                                    {seleccionado ? <CheckCircle2 size={20} className="text-gorilla-purple" /> : <Plus size={20} />}
                                    <span className="font-black italic uppercase text-sm">{srv.nombre}</span>
                                </div>
                                <span className="font-black text-white">${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
          </div>

          {/* SECCIÓN CLIENTE Y ASIGNACIÓN */}
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <User size={14} className="text-gorilla-purple"/> Datos del Cliente
                </h2>
                <div className="flex gap-2 mb-6">
                    <input placeholder="Número de Cédula" className="flex-1 bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-gorilla-purple transition-all"
                        value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} />
                    <button onClick={buscarCliente} className="bg-gorilla-purple hover:bg-violet-600 p-4 rounded-xl transition-all shadow-lg shadow-purple-900/20">
                        <Search size={20}/>
                    </button>
                </div>

                <AnimatePresence>
                    {cliente && (
                        <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="space-y-4 overflow-hidden">
                            <input placeholder="Nombre Completo" className="w-full bg-white/5 border border-white/5 p-4 rounded-xl outline-none"
                                value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                            <input placeholder="WhatsApp / Teléfono" className="w-full bg-white/5 border border-white/5 p-4 rounded-xl outline-none"
                                value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Asignación y Pago</h2>
                <div className="space-y-4">
                    <select className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-gray-400 outline-none focus:border-gorilla-orange"
                        value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                        <option value="">Seleccionar Lavador...</option>
                        {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>

                    <div className="flex gap-3">
                        <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/5 text-gray-600'}`}>
                            <DollarSign size={18}/> Efectivo
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/5 text-gray-600'}`}>
                            <CreditCard size={18}/> Transferencia
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BARRA INFERIOR DE ACCIÓN (MÓVIL) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0c]/80 backdrop-blur-3xl border-t border-white/10 p-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Inversión Total</p>
                <p className="text-4xl font-black text-white">${totalOrden.toLocaleString()}</p>
            </div>
            <button 
                onClick={crearOrden} 
                disabled={loading}
                className="bg-gorilla-orange hover:bg-orange-600 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-[0_10px_40px_rgba(244,127,32,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
                {loading ? 'REGISTRANDO...' : <>REGISTRAR & IMPRIMIR <Printer size={20}/></>}
            </button>
        </div>
      </div>

      {/* MODAL DE ÉXITO TRAS IMPRESIÓN */}
      <AnimatePresence>
        {ordenFinalizada && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white/[0.05] border border-white/10 p-10 rounded-[3rem] text-center max-w-sm">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 uppercase italic">¡ORDEN EXITOSA!</h2>
                    <p className="text-gray-400 mb-8">El recibo ha sido enviado a la impresora.</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest">
                        NUEVA VENTA
                    </button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  )
}