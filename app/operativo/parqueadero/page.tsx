'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Car, Bike, Clock, User, Phone, LogOut, Search, Zap,
  ArrowRightCircle, Timer, Shield, DollarSign, CreditCard, X, CheckCircle2,
  Calendar, Hash, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ParqueaderoPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [configPrecios, setConfigPrecios] = useState<any[]>([])
  const [now, setNow] = useState(new Date())

  const [vehiculoSalida, setVehiculoSalida] = useState<any>(null)
  const [pagoSeleccionado, setPagoSeleccionado] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState<'dia' | 'mes'>('dia')

  const [form, setForm] = useState({ nombre: '', celular: '', placa: '', tipo: 'carro' })

  useEffect(() => {
    fetchRegistros()
    fetchPrecios()
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchPrecios = async () => {
    const { data } = await supabase.from('config_parqueadero').select('*')
    setConfigPrecios(data || [])
  }

  const fetchRegistros = async () => {
    const { data } = await supabase.from('parqueadero_registros').select('*').eq('estado', 'activo').order('hora_entrada', { ascending: false })
    setRegistros(data || [])
  }

  const handleIngreso = async (e: any) => {
    e.preventDefault()
    if (!form.placa) return
    await supabase.from('parqueadero_registros').insert([{
      nombre_cliente: form.nombre, celular: form.celular,
      placa: form.placa.toUpperCase(), tipo_vehiculo: form.tipo
    }])
    setForm({ nombre: '', celular: '', placa: '', tipo: 'carro' })
    fetchRegistros()
  }

  const obtenerPrecio = (tipoVehiculo: string, tipoCobro: string) => {
    const precios = configPrecios.find(p => p.tipo_vehiculo === tipoVehiculo)
    if (!precios) return 0
    // Solo devolvemos el precio fijo del Día o del Mes
    return tipoCobro === 'mes' ? precios.precio_mes : precios.precio_dia
  }

  const confirmarSalida = async () => {
    const total = obtenerPrecio(vehiculoSalida.tipo_vehiculo, tarifaSeleccionada)
    const { error } = await supabase.from('parqueadero_registros').update({
      estado: 'finalizado',
      hora_salida: new Date().toISOString(),
      total_pagar: total,
      metodo_pago: pagoSeleccionado,
      tipo_tarifa: tarifaSeleccionada
    }).eq('id', vehiculoSalida.id)

    if (!error) {
      setVehiculoSalida(null)
      fetchRegistros()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 pb-20 relative overflow-y-auto">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-12 bg-gorilla-orange rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Logística de Estancia</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900">
            Gestión <span className="text-gorilla-orange underline decoration-slate-200 underline-offset-8">Parqueo</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* PANEL DE INGRESO */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-white sticky top-10">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <Zap size={16} className="text-gorilla-purple fill-gorilla-purple" /> 1. Registro de Entrada
              </h2>

              <form onSubmit={handleIngreso} className="space-y-6">
                <div className="flex bg-slate-50 rounded-[2rem] p-2 border-2 border-slate-100 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'carro' })}
                    className={`flex-1 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all ${form.tipo === 'carro' ? 'bg-white text-blue-600 shadow-lg border border-blue-50' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Car size={20} /> CARRO
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'moto' })}
                    className={`flex-1 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all ${form.tipo === 'moto' ? 'bg-white text-gorilla-orange shadow-lg border border-orange-50' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Bike size={20} /> MOTO
                  </button>
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-6 border-4 border-slate-800 shadow-inner">
                  <input
                    placeholder="ABC 123"
                    required
                    className="w-full bg-transparent border-none text-5xl font-black text-center uppercase tracking-tighter text-gorilla-orange outline-none placeholder:text-slate-800"
                    value={form.placa}
                    onChange={e => setForm({ ...form, placa: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input placeholder="Nombre Cliente (Opcional)" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold"
                      value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input placeholder="Celular" className="w-full bg-slate-50 border border-slate-100 p-4 pl-12 rounded-2xl outline-none focus:bg-white focus:border-gorilla-purple transition-all font-bold"
                      value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} />
                  </div>
                </div>

                <button className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 italic uppercase tracking-widest">
                  Registrar Ingreso <ArrowRightCircle size={24} />
                </button>
              </form>
            </div>
          </div>

          {/* LISTADO DE VEHICULOS ACTIVOS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-xl font-black italic uppercase text-slate-800 flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                Vehículos en Patio
              </h2>
              <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{registros.length} Activos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registros.map((reg) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={reg.id}
                  className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-xl shadow-slate-200/60 hover:border-gorilla-orange/40 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className={`p-4 rounded-2xl shadow-lg ${reg.tipo_vehiculo === 'carro' ? 'bg-blue-600 text-white' : 'bg-gorilla-orange text-white'}`}>
                      {reg.tipo_vehiculo === 'carro' ? <Car size={28} /> : <Bike size={28} />}
                    </div>
                    <div className="text-right">
                      <span className="text-5xl font-black text-slate-900 block tracking-tighter leading-none">{reg.placa}</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 block italic">{new Date(reg.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 mb-8 space-y-2">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <User size={14} className="text-gorilla-purple" /> {reg.nombre_cliente || 'CLIENTE GENERAL'}
                    </div>
                    {reg.celular && (
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <Phone size={14} className="text-gorilla-purple" /> {reg.celular}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setVehiculoSalida(reg)}
                    className="w-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white py-5 rounded-[1.5rem] font-black transition-all border-2 border-red-100 hover:border-red-500 flex items-center justify-center gap-3 uppercase italic text-xs tracking-[0.2em]"
                  >
                    Marcar Salida <LogOut size={18} />
                  </button>
                </motion.div>
              ))}
            </div>

            {registros.length === 0 && (
              <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
                <Clock size={64} className="text-slate-100 mb-4" />
                <p className="text-slate-300 font-black uppercase tracking-[0.3em]">Patio Vacío</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MODAL DE COBRO (LIQUIDACIÓN) */}
      <AnimatePresence>
        {vehiculoSalida && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[4rem] p-10 max-w-lg w-full shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-white">

              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Liquidación <span className="text-gorilla-orange">Caja</span></h2>
                <button onClick={() => setVehiculoSalida(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"><X size={24} /></button>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-10 flex justify-between items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gorilla-orange" />
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Matrícula</p>
                  <p className="text-5xl font-black tracking-tighter text-white">{vehiculoSalida.placa}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Total Neto</p>
                  <p className="text-5xl font-black text-gorilla-orange tracking-tighter">
                    ${obtenerPrecio(vehiculoSalida.tipo_vehiculo, tarifaSeleccionada).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* SELECTOR DE TARIFA (SOLO DÍA Y MES) */}
              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                  <Calendar size={12} /> Tipo de Estancia
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['dia', 'mes'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarifaSeleccionada(t as any)}
                      className={`py-5 rounded-2xl font-black uppercase text-xs border-2 transition-all tracking-[0.2em] ${tarifaSeleccionada === t ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange shadow-lg shadow-orange-100' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                    >
                      {t === 'dia' ? 'Cobrar Día' : 'Cobrar Mes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SELECTOR DE PAGO */}
              <div className="space-y-4 mb-12">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                  <DollarSign size={12} /> Método de Recaudo
                </p>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setPagoSeleccionado('efectivo')} className={`flex-1 py-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${pagoSeleccionado === 'efectivo' ? 'border-green-500 bg-green-50 text-green-600 shadow-xl shadow-green-100' : 'border-slate-50 bg-slate-50 text-slate-300'}`}>
                    <DollarSign size={28} /> <span className="font-black text-xs italic">EFECTIVO</span>
                  </button>
                  <button type="button" onClick={() => setPagoSeleccionado('transferencia')} className={`flex-1 py-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${pagoSeleccionado === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-xl shadow-blue-100' : 'border-slate-50 bg-slate-50 text-slate-300'}`}>
                    <CreditCard size={28} /> <span className="font-black text-xs italic">TRANSFERENCIA</span>
                  </button>
                </div>
              </div>

              <button onClick={confirmarSalida} className="w-full bg-slate-900 hover:bg-black text-white p-7 rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95">
                Cerrar Operación <CheckCircle2 size={28} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}