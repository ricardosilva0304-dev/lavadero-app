'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Car, Bike, Clock, User, Phone, LogOut, Search, Zap,
  ArrowRightCircle, Shield, DollarSign, CreditCard, X, CheckCircle2,
  Calendar, ArrowRight, Check
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

  // Formateador de hora limpio
  const formatearHora = (fecha: string) => {
    return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(fecha));
  }

  return (
    <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-6 py-6 md:p-10 lg:p-10 relative overflow-x-hidden">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Logística de Estancia</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
            Gestión <span className="text-gorilla-orange">Parqueo</span>
          </h1>
        </header>

        {/* CONTENEDOR PRINCIPAL: En 1024px es 1 columna, en 1280px+ (xl) son 2 columnas */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">

          {/* PANEL DE INGRESO (Izquierda en PC, Arriba en Tablet/Móvil) */}
          <div className="xl:col-span-4 2xl:col-span-4">
            <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg shadow-slate-200/50 border border-slate-100 xl:sticky xl:top-8">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap size={14} className="text-gorilla-orange fill-gorilla-orange" /> Nuevo Ingreso
              </h2>

              <form onSubmit={handleIngreso} className="space-y-5">

                {/* Switch Carro/Moto tipo iOS */}
                <div className="flex bg-slate-100 rounded-[1.5rem] p-1.5 border border-slate-200/60 relative">
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'carro' })}
                    className={`flex-1 py-3.5 rounded-[1.2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all z-10 ${form.tipo === 'carro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Car size={16} className={form.tipo === 'carro' ? 'text-gorilla-orange' : ''} /> Carro
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, tipo: 'moto' })}
                    className={`flex-1 py-3.5 rounded-[1.2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all z-10 ${form.tipo === 'moto' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Bike size={16} className={form.tipo === 'moto' ? 'text-gorilla-orange' : ''} /> Moto
                  </button>
                </div>

                {/* Input Placa */}
                <div className="relative group">
                  <div className="absolute top-3 left-5 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest z-10">Placa</div>
                  <input
                    placeholder="ABC 123"
                    required
                    className="w-full bg-slate-50 border border-slate-200/60 p-5 pt-9 rounded-[1.5rem] text-4xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-200 shadow-inner"
                    value={form.placa}
                    onChange={e => setForm({ ...form, placa: e.target.value })}
                  />
                </div>

                {/* Datos del cliente */}
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input placeholder="Nombre Completo (Opcional)" className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-2xl outline-none focus:border-gorilla-orange focus:ring-2 focus:ring-orange-50 transition-all font-bold text-xs uppercase text-slate-700 placeholder:text-slate-400"
                      value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input placeholder="Celular (Opcional)" type="tel" className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-2xl outline-none focus:border-gorilla-orange focus:ring-2 focus:ring-orange-50 transition-all font-bold text-xs text-slate-700 placeholder:text-slate-400"
                      value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} />
                  </div>
                </div>

                <button className="w-full bg-gorilla-orange hover:bg-orange-600 text-white font-black py-5 mt-2 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                  Registrar Ingreso <ArrowRight size={18} strokeWidth={3} />
                </button>
              </form>
            </div>
          </div>

          {/* PANEL DERECHO: LISTADO DE VEHÍCULOS ACTIVOS */}
          <div className="xl:col-span-8 2xl:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
              <h2 className="text-xl font-black italic uppercase text-slate-800 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                Vehículos en Patio
              </h2>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest w-fit">
                {registros.length} Activos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5">
              <AnimatePresence>
                {registros.map((reg) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={reg.id}
                    className="bg-white border border-slate-200/60 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-gorilla-orange/40 transition-all group flex flex-col"
                  >
                    {/* Fila Superior: Icono y Placa */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${reg.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-gorilla-orange'}`}>
                        {reg.tipo_vehiculo === 'carro' ? <Car size={24} /> : <Bike size={24} />}
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-slate-900 block tracking-tighter leading-none">{reg.placa}</span>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <Clock size={10} /> {formatearHora(reg.hora_entrada)}
                        </div>
                      </div>
                    </div>

                    {/* Fila del medio: Datos Cliente */}
                    <div className="flex flex-col gap-1.5 mb-5 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase truncate">
                        <User size={12} className="text-gorilla-purple shrink-0" />
                        <span className="truncate">{reg.nombre_cliente || 'SIN NOMBRE'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <Phone size={12} className="text-gorilla-purple shrink-0" />
                        {reg.celular || '---'}
                      </div>
                    </div>

                    {/* Botón Inferior */}
                    <button
                      onClick={() => setVehiculoSalida(reg)}
                      className="w-full bg-slate-50 hover:bg-red-500 text-slate-500 hover:text-white py-3.5 rounded-xl font-black transition-all border border-slate-200 hover:border-red-500 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                    >
                      Dar Salida <LogOut size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ESTADO VACÍO */}
            {registros.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Clock size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Patio Vacío</p>
                <p className="text-slate-300 font-medium text-[10px] uppercase mt-1">No hay vehículos registrados</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MODAL DE COBRO (LIQUIDACIÓN) */}
      <AnimatePresence>
        {vehiculoSalida && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Header Modal */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl md:text-2xl font-black italic uppercase text-slate-900 tracking-tight leading-none">
                    Liquidación <span className="text-gorilla-orange">Caja</span>
                  </h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Salida de parqueadero</span>
                </div>
                <button onClick={() => setVehiculoSalida(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tarjeta de Resumen Oscura */}
              <div className="bg-[#0E0C15] rounded-[1.5rem] p-6 text-white mb-8 flex justify-between items-center relative overflow-hidden shadow-lg border border-slate-800">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gorilla-orange" />
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Matrícula</p>
                  <p className="text-4xl font-black tracking-tighter text-white">{vehiculoSalida.placa}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">A Pagar</p>
                  <p className="text-3xl font-black text-gorilla-orange tracking-tighter">
                    ${obtenerPrecio(vehiculoSalida.tipo_vehiculo, tarifaSeleccionada).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* SELECTOR DE TARIFA */}
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Tipo de Estancia
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['dia', 'mes'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarifaSeleccionada(t as any)}
                      className={`py-4 rounded-xl font-black uppercase text-[10px] border-2 transition-all tracking-widest flex items-center justify-center gap-2 ${tarifaSeleccionada === t
                          ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {tarifaSeleccionada === t && <Check size={14} strokeWidth={3} />}
                      {t === 'dia' ? 'Cobrar Día' : 'Cobrar Mes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SELECTOR DE PAGO */}
              <div className="space-y-3 mb-8">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <DollarSign size={12} /> Método de Pago
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPagoSeleccionado('efectivo')}
                    className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${pagoSeleccionado === 'efectivo'
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}>
                    <DollarSign size={20} /> <span className="font-black text-[10px] uppercase tracking-widest">EFECTIVO</span>
                  </button>
                  <button type="button" onClick={() => setPagoSeleccionado('transferencia')}
                    className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${pagoSeleccionado === 'transferencia'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}>
                    <CreditCard size={20} /> <span className="font-black text-[10px] uppercase tracking-widest">TRANSFER</span>
                  </button>
                </div>
              </div>

              <button onClick={confirmarSalida} className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                Cerrar Operación <CheckCircle2 size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}