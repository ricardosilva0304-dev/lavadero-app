'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Search, Car, Bike, CheckCircle2, CreditCard,
  DollarSign, User, Hash, Plus, Printer, Check, Zap, UserPlus
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

  // --- FUNCIÓN MAESTRA DE IMPRESIÓN ---
  const imprimirRecibo = (datos: any) => {
    const nombreEmpleado = empleados.find(e => e.id === empleadoAsignado)?.nombre || 'General'
    
    // Creamos el HTML del tiquete
    const ticketHTML = `
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 75mm; 
              padding: 5mm; 
              margin: 0;
              color: black;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 5px; }
            .info { font-size: 12px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed black; margin: 5px 0; }
            .item { display: flex; justify-content: space-between; font-size: 11px; }
            .total { text-align: right; font-size: 16px; margin-top: 10px; font-weight: bold; }
            .footer { margin-top: 15px; font-size: 10px; text-align: center; font-style: italic; }
            img { width: 50px; height: 50px; filter: grayscale(1); }
          </style>
        </head>
        <body>
          <div class="center header">
            <img src="/logo.png" />
            <div class="bold" style="font-size: 18px;">ECOPLANET KONG</div>
            <div style="font-size: 10px;">SERVICIO AUTOMOTRIZ PREMIUM</div>
          </div>
          <div class="info">
            <div>FECHA: ${new Date().toLocaleString()}</div>
            <div>TICKET: #${datos.id.split('-')[0].toUpperCase()}</div>
            <div class="bold" style="font-size: 20px; margin: 5px 0;">PLACA: ${datos.placa}</div>
            <div>VEHICULO: ${datos.tipo_vehiculo.toUpperCase()}</div>
            <div>ATIENDE: ${nombreEmpleado}</div>
          </div>
          <div class="divider"></div>
          <div class="bold" style="font-size: 12px; margin-bottom: 5px;">SERVICIOS:</div>
          ${serviciosSeleccionados.map(s => `
            <div class="item">
              <span>${s.nombre.toUpperCase()}</span>
              <span>$${(tipoVehiculo === 'carro' ? s.precio_carro : s.precio_moto).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total">TOTAL: $${totalOrden.toLocaleString()}</div>
          <div class="footer">
            ¡GRACIAS POR SU PREFERENCIA!<br>
            CONSERVE ESTE TIQUETE PARA RETIRAR
          </div>
        </body>
      </html>
    `

    // Crear Iframe invisible
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(ticketHTML)
      doc.close()

      // Disparar impresión cuando el contenido cargue
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        // Borrar el iframe después de imprimir
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 500)
    }
  }

  const crearOrden = async () => {
    if (!placa || serviciosSeleccionados.length === 0 || !empleadoAsignado || !busquedaCedula) {
      alert("Faltan datos"); return
    }
    setLoading(true)
    try {
      let finalClienteId = null
      const { data: clienteEx } = await supabase.from('clientes').select('id').eq('cedula', busquedaCedula).maybeSingle()
      if (clienteEx) {
        finalClienteId = clienteEx.id
      } else {
        const { data: nuevoCl } = await supabase.from('clientes').insert([{ cedula: busquedaCedula, nombre: nombreNuevoCliente || 'Cliente Nuevo', telefono: telNuevoCliente || '' }]).select().single()
        finalClienteId = nuevoCl.id
      }

      const { data: orden, error } = await supabase.from('ordenes_servicio').insert([{
        cliente_id: finalClienteId, placa: placa.toUpperCase(), tipo_vehiculo: tipoVehiculo,
        servicios_ids: serviciosSeleccionados.map(s => s.id), nombres_servicios: serviciosSeleccionados.map(s => s.nombre).join(', '),
        total: totalOrden, metodo_pago: metodoPago, empleado_id: empleadoAsignado, estado: 'pendiente'
      }]).select().single()

      if (!error && orden) {
        imprimirRecibo(orden)
        setOrdenFinalizada(true)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-64 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
        <header className="mb-12">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic uppercase">Nuevo <span className="text-gorilla-orange">Servicio</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-10">
            {/* PLACA & VEHICULO */}
            <section className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white">
              <div className="flex gap-6 mb-10">
                <button onClick={() => setTipoVehiculo('carro')} className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${tipoVehiculo === 'carro' ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange shadow-xl shadow-orange-100' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  <Car size={48} /> <span className="font-black text-sm">CARRO</span>
                </button>
                <button onClick={() => setTipoVehiculo('moto')} className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${tipoVehiculo === 'moto' ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange shadow-xl shadow-orange-100' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  <Bike size={48} /> <span className="font-black text-sm">MOTO</span>
                </button>
              </div>
              <input
                  placeholder="PLACA"
                  className="w-full bg-slate-900 rounded-[2rem] p-10 text-6xl font-black text-center uppercase tracking-tighter text-gorilla-orange outline-none"
                  value={placa} onChange={e => setPlaca(e.target.value)}
              />
            </section>

            {/* SERVICIOS */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviciosDB.filter(s => s.aplica_a === tipoVehiculo || s.aplica_a === 'ambos').map(srv => {
                  const sel = serviciosSeleccionados.find(s => s.id === srv.id)
                  return (
                    <button key={srv.id} onClick={() => toggleServicio(srv)} className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${sel ? 'border-gorilla-purple bg-purple-50 text-gorilla-purple shadow-lg shadow-purple-100' : 'border-slate-50 bg-slate-50 text-slate-500'}`}>
                      <span className="font-black uppercase text-xs">{srv.nombre}</span>
                      <span className="font-black">${(tipoVehiculo === 'carro' ? srv.precio_carro : srv.precio_moto).toLocaleString()}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-10">
            {/* CLIENTE */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-white">
                <div className="flex gap-3 mb-8">
                    <input placeholder="Cédula" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl outline-none font-bold"
                        value={busquedaCedula} onChange={e => setBusquedaCedula(e.target.value)} />
                    <button onClick={buscarCliente} className="bg-gorilla-purple text-white p-5 rounded-2xl shadow-lg"><Search size={24}/></button>
                </div>
                {cliente && (
                    <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem]">
                        <input placeholder="Nombre" className="w-full bg-white p-4 rounded-xl outline-none font-bold uppercase"
                            value={nombreNuevoCliente} onChange={e => setNombreNuevoCliente(e.target.value)} />
                        <input placeholder="WhatsApp" className="w-full bg-white p-4 rounded-xl outline-none font-bold"
                            value={telNuevoCliente} onChange={e => setTelNuevoCliente(e.target.value)} />
                    </div>
                )}
            </section>

            {/* PAGO */}
            <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-white">
                <select className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold mb-6 outline-none"
                    value={empleadoAsignado} onChange={e => setEmpleadoAsignado(e.target.value)}>
                    <option value="">Seleccionar Lavador...</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <div className="flex gap-4">
                    <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-5 rounded-2xl font-black text-xs ${metodoPago === 'efectivo' ? 'bg-green-50 text-green-600 border-2 border-green-500 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-400'}`}>EFECTIVO</button>
                    <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-5 rounded-2xl font-black text-xs ${metodoPago === 'transferencia' ? 'bg-blue-50 text-blue-600 border-2 border-blue-500 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400'}`}>TRANSF.</button>
                </div>
            </section>
          </div>
        </div>
      </motion.div>

      {/* FOOTER ACCIÓN */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 p-8 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 lg:pl-72">
          <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total Inversión</p>
              <p className="text-5xl font-black text-slate-900 tracking-tighter">${totalOrden.toLocaleString()}</p>
          </div>
          <button onClick={crearOrden} disabled={loading} className="w-full md:w-auto bg-gorilla-orange text-white px-12 py-6 rounded-[2rem] font-black text-xl italic uppercase tracking-widest shadow-xl shadow-orange-200 disabled:opacity-50">
            {loading ? 'REGISTRANDO...' : 'REGISTRAR & TIQUETE'}
          </button>
        </div>
      </div>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {ordenFinalizada && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white p-12 rounded-[4rem] text-center max-w-sm shadow-2xl border border-white">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-200">
                <Check size={48} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic">¡LISTO!</h2>
              <p className="text-slate-400 font-bold mb-10 text-sm italic">Servicio registrado e imprimiendo recibo.</p>
              <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl uppercase tracking-widest shadow-xl">NUEVA ORDEN</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}