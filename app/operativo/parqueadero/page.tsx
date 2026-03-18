'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Car, Bike, Clock, User, Phone, LogOut,
  ArrowRight, DollarSign, CreditCard,
  X, CheckCircle2, Calendar, Check, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function ParqueaderoPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [configPrecios, setConfigPrecios] = useState<any[]>([])
  const [vehiculoSalida, setVehiculoSalida] = useState<any>(null)
  const [pagoSeleccionado, setPagoSeleccionado] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState<'dia' | 'mes'>('dia')
  const [form, setForm] = useState({ nombre: '', celular: '', placa: '', tipo: 'carro' })
  const [loadingIngreso, setLoadingIngreso] = useState(false)
  const [loadingRegistros, setLoadingRegistros] = useState(true)

  // ── Precio con null-safety ────────────────────────────────────────────────
  // CORRECCIÓN PRINCIPAL: si configPrecios aún no cargó o no encuentra el tipo,
  // devuelve 0 en vez de explotar con .precio_mes de undefined
  const obtenerPrecio = (tipoVehiculo: string, tipoCobro: string): number => {
    if (!configPrecios || configPrecios.length === 0) return 0
    const precios = configPrecios.find(p => p.tipo_vehiculo === tipoVehiculo)
    if (!precios) return 0
    return tipoCobro === 'mes'
      ? (precios.precio_mes ?? 0)
      : (precios.precio_dia ?? 0)
  }

  const fetchPrecios = useCallback(async () => {
    const { data, error } = await supabase.from('config_parqueadero').select('*')
    if (!error) setConfigPrecios(data || [])
  }, [])

  const fetchRegistros = useCallback(async () => {
    setLoadingRegistros(true)
    const { data, error } = await supabase
      .from('parqueadero_registros')
      .select('*')
      .eq('estado', 'activo')
      .order('hora_entrada', { ascending: false })
    if (!error) {
      // CORRECCIÓN: filtramos cualquier registro que venga con id null
      setRegistros((data || []).filter(r => r.id != null))
    }
    setLoadingRegistros(false)
  }, [])

  useEffect(() => {
    fetchPrecios()
    fetchRegistros()
  }, [fetchPrecios, fetchRegistros])

  // Tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('parqueadero_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parqueadero_registros' },
        () => fetchRegistros())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRegistros])

  const handleIngreso = async (e: any) => {
    e.preventDefault()
    if (!form.placa.trim()) return
    setLoadingIngreso(true)
    try {
      await supabase.from('parqueadero_registros').insert([{
        nombre_cliente: form.nombre || null,
        celular: form.celular || null,
        placa: form.placa.toUpperCase().trim(),
        tipo_vehiculo: form.tipo
      }])
      setForm({ nombre: '', celular: '', placa: '', tipo: 'carro' })
    } catch (err) {
      console.error('Error al registrar ingreso:', err)
    } finally {
      setLoadingIngreso(false)
    }
  }

  const confirmarSalida = async () => {
    // CORRECCIÓN: guardamos antes de confirmar que vehiculoSalida y su id existen
    if (!vehiculoSalida?.id) return

    const total = obtenerPrecio(vehiculoSalida.tipo_vehiculo, tarifaSeleccionada)

    const { error } = await supabase
      .from('parqueadero_registros')
      .update({
        estado: 'finalizado',
        hora_salida: new Date().toISOString(),
        total_pagar: total,
        metodo_pago: pagoSeleccionado,
        tipo_tarifa: tarifaSeleccionada
      })
      .eq('id', vehiculoSalida.id)

    if (!error) {
      setVehiculoSalida(null)
      setPagoSeleccionado('efectivo')
      setTarifaSeleccionada('dia')
    } else {
      console.error('Error al confirmar salida:', error)
    }
  }

  const abrirModalSalida = (reg: any) => {
    // CORRECCIÓN: solo abrimos el modal si el registro tiene id válido
    if (!reg?.id) return
    setVehiculoSalida(reg)
    setPagoSeleccionado('efectivo')
    setTarifaSeleccionada('dia')
  }

  const formatearHora = (fecha: string) => {
    try {
      return new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(new Date(fecha))
    } catch {
      return '--:--'
    }
  }

  // Precio preview para el modal (recalcula cada vez que cambia la tarifa)
  const precioModal = vehiculoSalida
    ? obtenerPrecio(vehiculoSalida.tipo_vehiculo, tarifaSeleccionada)
    : 0

  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:px-10 relative overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Logística de Estancia</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
                Gestión <span className="text-gorilla-orange">Parqueo</span>
              </h1>
            </div>
            {/* Indicador tiempo real */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2 rounded-xl w-fit h-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">En vivo</span>
            </div>
          </div>
        </header>

        {/* LAYOUT PRINCIPAL */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 pb-20">

          {/* PANEL INGRESO */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-lg shadow-slate-200/50 border border-slate-100 xl:sticky xl:top-8">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Zap size={14} className="text-gorilla-orange fill-gorilla-orange" /> Nuevo Ingreso
              </h2>

              <form onSubmit={handleIngreso} className="space-y-4">
                {/* Carro / Moto */}
                <div className="flex bg-slate-100 rounded-[1.5rem] p-1.5 border border-slate-200/60">
                  {(['carro', 'moto'] as const).map(tipo => (
                    <button key={tipo} type="button"
                      onClick={() => setForm(f => ({ ...f, tipo }))}
                      className={`flex-1 py-3.5 rounded-[1.2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${form.tipo === tipo
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                        }`}>
                      {tipo === 'carro'
                        ? <Car size={16} className={form.tipo === tipo ? 'text-gorilla-orange' : ''} />
                        : <Bike size={16} className={form.tipo === tipo ? 'text-gorilla-orange' : ''} />
                      }
                      {tipo}
                    </button>
                  ))}
                </div>

                {/* Placa */}
                <div className="relative">
                  <div className="absolute top-3 left-5 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest z-10">
                    Placa
                  </div>
                  <input
                    placeholder="ABC 123"
                    required
                    className="w-full bg-slate-50 border border-slate-200/60 p-5 pt-9 rounded-[1.5rem] text-3xl sm:text-4xl font-black text-center uppercase tracking-tighter text-slate-900 outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-200 shadow-inner"
                    value={form.placa}
                    onChange={e => setForm(f => ({ ...f, placa: e.target.value }))}
                  />
                </div>

                {/* Datos cliente */}
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input
                      placeholder="Nombre (Opcional)"
                      className="w-full bg-white border border-slate-200/60 p-4 pl-11 rounded-2xl outline-none focus:border-gorilla-orange transition-all font-bold text-xs uppercase text-slate-700 placeholder:text-slate-400"
                      value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input
                      placeholder="Celular (Opcional)"
                      type="tel"
                      className="w-full bg-white border border-slate-200/60 p-4 pl-11 rounded-2xl outline-none focus:border-gorilla-orange transition-all font-bold text-xs text-slate-700 placeholder:text-slate-400"
                      value={form.celular}
                      onChange={e => setForm(f => ({ ...f, celular: e.target.value }))}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingIngreso || !form.placa.trim()}
                  className="w-full bg-gorilla-orange hover:bg-orange-600 text-white font-black py-4 sm:py-5 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  {loadingIngreso
                    ? 'Registrando...'
                    : <><span>Registrar Ingreso</span> <ArrowRight size={18} strokeWidth={3} /></>
                  }
                </button>
              </form>
            </div>
          </div>

          {/* PANEL VEHÍCULOS ACTIVOS */}
          <div className="xl:col-span-8 2xl:col-span-9 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <h2 className="text-lg sm:text-xl font-black italic uppercase text-slate-800 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                Vehículos en Patio
              </h2>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest w-fit">
                {registros.length} Activos
              </span>
            </div>

            {loadingRegistros ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-52 bg-white border border-slate-100 rounded-[1.5rem] animate-pulse" />
                ))}
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Clock size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Patio Vacío</p>
                <p className="text-slate-300 font-medium text-[10px] uppercase mt-1">Registra el primer vehículo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5">
                <AnimatePresence>
                  {registros.map(reg => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={reg.id}
                      className="bg-white border border-slate-200/60 p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-gorilla-orange/40 transition-all flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl shrink-0 ${reg.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-gorilla-orange'}`}>
                          {reg.tipo_vehiculo === 'carro' ? <Car size={22} /> : <Bike size={22} />}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 block tracking-tighter leading-none">
                            {reg.placa}
                          </span>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <Clock size={10} /> {formatearHora(reg.hora_entrada)}
                          </div>
                        </div>
                      </div>

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

                      <button
                        onClick={() => abrirModalSalida(reg)}
                        className="w-full bg-slate-50 hover:bg-red-500 text-slate-500 hover:text-white py-3.5 rounded-xl font-black transition-all border border-slate-200 hover:border-red-500 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                      >
                        Dar Salida <LogOut size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MODAL COBRO */}
      <AnimatePresence>
        {vehiculoSalida && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-7">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 tracking-tight leading-none">
                    Liquidación <span className="text-gorilla-orange">Caja</span>
                  </h2>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Salida de parqueadero
                  </span>
                </div>
                <button
                  onClick={() => setVehiculoSalida(null)}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tarjeta resumen */}
              <div className="bg-[#0E0C15] rounded-[1.5rem] p-6 text-white mb-7 flex justify-between items-center relative overflow-hidden shadow-lg border border-slate-800">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gorilla-orange" />
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Matrícula</p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                    {vehiculoSalida.placa}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">A Pagar</p>
                  <p className="text-2xl sm:text-3xl font-black text-gorilla-orange tracking-tighter">
                    ${precioModal.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Tipo estancia */}
              <div className="space-y-3 mb-5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Tipo de Estancia
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['dia', 'mes'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setTarifaSeleccionada(t)}
                      className={`py-4 rounded-xl font-black uppercase text-[10px] border-2 transition-all tracking-widest flex items-center justify-center gap-2 ${tarifaSeleccionada === t
                          ? 'border-gorilla-orange bg-orange-50 text-gorilla-orange'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                        }`}>
                      {tarifaSeleccionada === t && <Check size={14} strokeWidth={3} />}
                      {t === 'dia' ? 'Cobrar Día' : 'Cobrar Mes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-3 mb-7">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <DollarSign size={12} /> Método de Pago
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPagoSeleccionado('efectivo')}
                    className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${pagoSeleccionado === 'efectivo'
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}>
                    <DollarSign size={20} />
                    <span className="font-black text-[10px] uppercase tracking-widest">EFECTIVO</span>
                  </button>
                  <button type="button" onClick={() => setPagoSeleccionado('transferencia')}
                    className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${pagoSeleccionado === 'transferencia'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}>
                    <CreditCard size={20} />
                    <span className="font-black text-[10px] uppercase tracking-widest">TRANSFER</span>
                  </button>
                </div>
              </div>

              <button
                onClick={confirmarSalida}
                disabled={precioModal === 0 && configPrecios.length > 0}
                className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                Cerrar Operación <CheckCircle2 size={20} />
              </button>

              {/* Aviso si los precios no están configurados */}
              {configPrecios.length === 0 && (
                <p className="text-center text-[10px] text-red-400 font-bold uppercase tracking-widest mt-3">
                  ⚠️ Sin tarifas configuradas — ve a Configuración
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}