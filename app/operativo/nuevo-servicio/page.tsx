'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CheckCircle2, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

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

    // Limpiamos estados antes de buscar
    setCliente(null)
    setNombreNuevoCliente('')
    setTelNuevoCliente('')

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cedula', busquedaCedula)
      .maybeSingle() // <--- IMPORTANTE: Usa maybeSingle en lugar de single

    if (data) {
      // Si lo encuentra
      setCliente(data)
      setNombreNuevoCliente(data.nombre)
      setTelNuevoCliente(data.telefono)
    } else {
      // Si no lo encuentra (error 406 se evita con maybeSingle)
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
      // 1. Guardamos la info para el tiquete
      setOrdenFinalizada({
        placa: placa.toUpperCase(),
        tipo_vehiculo: tipoVehiculo,
        id_ticket: data.id.split('-')[0],
        fecha: new Date().toISOString()
      })

      // 2. Esperamos a que React renderice los datos en el tiquete oculto
      setTimeout(() => {
        window.print();
        // 3. Después de mandar a imprimir, limpiamos o mostramos el modal de éxito
      }, 800); // 800ms es suficiente para que el DOM se actualice
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 pb-40 relative">

      {/* 1. TICKET PARA IMPRESIÓN */}
      <div
        id="ticket-impresion"
        className="fixed top-0 left-0 bg-white text-black p-4 font-mono text-xs w-[80mm] pointer-events-none opacity-0"
        style={{ zIndex: -1 }} // Lo mantenemos en el DOM pero invisible para el usuario
      >
        <div className="text-center mb-4 border-b border-dashed border-black pb-2">
          {/* Usamos una img normal para evitar problemas de optimización de Next Image en impresión */}
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto" style={{ filter: 'grayscale(1) contrast(2)' }} />
          <h2 className="text-lg font-bold mt-2 uppercase">Ecoplanet Kong</h2>
          <p className="text-[10px]">Servicio Automotriz Pro</p>
        </div>

        <div className="mb-4">
          <p>FECHA: {ordenFinalizada?.fecha ? new Date(ordenFinalizada.fecha).toLocaleString() : ''}</p>
          <p>TICKET: #{ordenFinalizada?.id_ticket || '000'}</p>
          <p className="font-bold text-lg">PLACA: {ordenFinalizada?.placa}</p>
          <p className="uppercase">Vehículo: {ordenFinalizada?.tipo_vehiculo}</p>
        </div>

        <div className="border-y border-dashed border-black py-2 my-2">
          <p className="font-bold mb-1">SERVICIOS:</p>
          {serviciosSeleccionados.map((s, i) => (
            <div key={i} className="flex justify-between">
              <span>- {s.nombre}</span>
              <span>${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="text-right font-bold text-base mt-2">
          TOTAL: ${totalOrden.toLocaleString()}
        </div>

        <div className="text-center mt-6 text-[9px] uppercase border-t border-dashed border-black pt-4">
          <p>¡Gracias por su confianza!</p>
          <p>Conserve este tiquete.</p>
        </div>
      </div>

      {/* INTERFAZ VISUAL CLARA */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 flex items-center gap-3 italic uppercase">
            Nuevo <span className="text-gorilla-orange">Registro</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* COLUMNA 1 */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Hash size={14} className="text-gorilla-orange" /> Información del Vehículo
              </h2>

              <div className="flex gap-4 mb-6">
                <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${tipoVehiculo === 'carro' ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                  <Car size={40} /> <span className="font-black italic">CARRO</span>
                </button>
                <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${tipoVehiculo === 'moto' ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                  <Bike size={40} /> <span className="font-black italic">MOTO</span>
                </button>
              </div>

              <input
                placeholder="PLACA"
                className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-6 text-5xl font-black text-center uppercase tracking-tighter focus:bg-white focus:border-gorilla-orange outline-none transition-all text-gray-900 placeholder:text-gray-300"
                value={placa}
                onChange={e => setPlaca(e.target.value)}
              />
            </div>

            <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Selección de Servicios</h2>
              <div className="grid grid-cols-1 gap-3">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const seleccionado = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <button key={srv.id} onClick={() => toggleServicio(srv)}
                      className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${seleccionado ? 'border-gorilla-purple bg-purple-50 text-gorilla-purple' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                      <div className="flex items-center gap-3">
                        {seleccionado ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                        <span className="font-black italic uppercase text-sm">{srv.nombre}</span>
                      </div>
                      <span className="font-black text-gray-900">${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* COLUMNA 2 */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <User size={14} className="text-gorilla-purple" /> Datos del Cliente
              </h2>
              <div className="flex gap-2 mb-6">
                <input placeholder="Cédula" className="flex-1 bg-gray-100 border border-transparent p-4 rounded-xl outline-none focus:bg-white focus:border-gorilla-purple transition-all text-gray-900"
                  value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} />
                <button onClick={buscarCliente} className="bg-gorilla-purple hover:bg-violet-600 p-4 rounded-xl transition-all shadow-lg shadow-purple-200 text-white">
                  <Search size={20} />
                </button>
              </div>

              <AnimatePresence>
                {cliente && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                    <input placeholder="Nombre Completo" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none text-gray-900"
                      value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                    <input placeholder="Teléfono" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none text-gray-900"
                      value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Pago y Personal</h2>
              <div className="space-y-4">
                <select className="w-full bg-gray-100 border border-transparent p-4 rounded-xl text-gray-700 outline-none focus:bg-white focus:border-gorilla-orange"
                  value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                  <option value="">Seleccionar Lavador...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>

                <div className="flex gap-3">
                  <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-100 text-gray-400'}`}>
                    <DollarSign size={18} /> Efectivo
                  </button>
                  <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 border-2 transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>
                    <CreditCard size={18} /> Transf.
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BARRA INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center lg:pl-64">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total a Pagar</p>
            <p className="text-4xl font-black text-gray-900">${totalOrden.toLocaleString()}</p>
          </div>
          <button
            onClick={crearOrden}
            disabled={loading}
            className="bg-gorilla-orange hover:bg-orange-600 text-white px-10 py-4 rounded-[1.5rem] font-black text-lg shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
          >
            {loading ? '...' : <>REGISTRAR <Printer size={20} /></>}
          </button>
        </div>
      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[3rem] text-center max-w-sm shadow-2xl">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-black mb-2 uppercase italic text-gray-900">¡Registro Exitoso!</h2>
              <p className="text-gray-500 mb-8">Imprimiendo recibo...</p>
              <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest">
                Nuevo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}