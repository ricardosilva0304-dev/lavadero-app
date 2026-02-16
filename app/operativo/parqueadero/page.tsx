'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Car, Bike, Clock, User, Phone, LogOut, 
  Search, Zap, ArrowRightCircle, Timer, Shield 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ParqueaderoPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [precios, setPrecios] = useState<any>({})
  const [now, setNow] = useState(new Date())
  
  const [form, setForm] = useState({ nombre: '', celular: '', placa: '', tipo: 'carro' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRegistros()
    fetchPrecios()
    const timer = setInterval(() => setNow(new Date()), 60000)
    const channel = supabase.channel('parqueadero_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parqueadero_registros' }, () => fetchRegistros())
      .subscribe()
    return () => { clearInterval(timer); supabase.removeChannel(channel) }
  }, [])

  const fetchPrecios = async () => {
    const { data } = await supabase.from('config_parqueadero').select('*')
    const preciosMap = data?.reduce((acc: any, curr: any) => {
      acc[curr.tipo_vehiculo] = curr.precio_hora
      return acc
    }, {})
    setPrecios(preciosMap || { carro: 5000, moto: 2000 })
  }

  const fetchRegistros = async () => {
    const { data } = await supabase.from('parqueadero_registros')
      .select('*')
      .eq('estado', 'activo')
      .order('hora_entrada', { ascending: false })
    setRegistros(data || [])
  }

  const handleIngreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.placa) return
    setLoading(true)
    await supabase.from('parqueadero_registros').insert([{
      nombre_cliente: form.nombre,
      celular: form.celular,
      placa: form.placa.toUpperCase(),
      tipo_vehiculo: form.tipo
    }])
    setForm({ nombre: '', celular: '', placa: '', tipo: 'carro' })
    setLoading(false)
  }

  const calcularCobro = (entrada: string, tipo: string) => {
    const inicio = new Date(entrada).getTime()
    const fin = now.getTime()
    const minutos = Math.floor((fin - inicio) / (1000 * 60))
    const horas = Math.max(1, Math.ceil(minutos / 60))
    const tarifa = precios[tipo] || 0
    return { horas, total: horas * tarifa, minutos }
  }

  const finalizarServicio = async (id: string, total: number) => {
    if(confirm(`¿Confirmar salida y cobro de $${total.toLocaleString()}?`)) {
      await supabase.from('parqueadero_registros')
        .update({ 
            estado: 'finalizado', 
            hora_salida: new Date().toISOString(), 
            total_pagar: total,
            metodo_pago: 'efectivo' // Por defecto efectivo en salida rápida
        })
        .eq('id', id)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-10 relative overflow-hidden">
      {/* Luces de fondo dinámicas */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gorilla-orange/10 rounded-full blur-[150px] -z-10 animate-pulse" />

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER ESTILO DASHBOARD */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/10 shadow-2xl shadow-orange-500/10">
              <Timer className="w-10 h-10 text-gorilla-orange" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">Estancia <span className="text-gorilla-orange">Gorilla</span></h1>
              <div className="flex items-center gap-2 text-gray-500 text-xs font-bold tracking-widest uppercase">
                <Shield size={12} className="text-green-500" /> Control de Tiempo Real
              </div>
            </div>
          </motion.div>

          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">En Patio</p>
              <p className="text-2xl font-black text-gorilla-orange">{registros.length}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* FORMULARIO: PANEL DE REGISTRO */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4"
          >
            <form onSubmit={handleIngreso} className="bg-white/[0.03] backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl sticky top-10">
              <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                <Zap className="text-gorilla-purple fill-gorilla-purple" size={20} /> 
                REGISTRO RÁPIDO
              </h2>
              
              <div className="space-y-6">
                {/* Selector Carro/Moto Neumórfico */}
                <div className="flex bg-black/40 rounded-2xl p-2 border border-white/5 gap-2">
                  <button type="button" onClick={() => setForm({...form, tipo: 'carro'})}
                    className={`flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${form.tipo === 'carro' ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-500/20' : 'text-gray-600 hover:text-gray-400'}`}>
                    <Car size={20}/> CARRO
                  </button>
                  <button type="button" onClick={() => setForm({...form, tipo: 'moto'})}
                    className={`flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${form.tipo === 'moto' ? 'bg-gorilla-orange text-white shadow-lg shadow-orange-500/20' : 'text-gray-600 hover:text-gray-400'}`}>
                    <Bike size={20}/> MOTO
                  </button>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 ml-2 uppercase tracking-widest">Placa del Vehículo</label>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-gorilla-orange transition-colors" />
                        <input placeholder="AAA-000" required className="w-full bg-black/40 border border-white/10 p-5 pl-12 rounded-2xl text-3xl font-black uppercase tracking-widest focus:ring-2 focus:ring-gorilla-orange outline-none transition-all"
                            value={form.placa} onChange={e => setForm({...form, placa: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2 uppercase">Cliente</label>
                        <input placeholder="Nombre (Opcional)" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-gorilla-purple transition-all"
                            value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 ml-2 uppercase">Celular</label>
                        <input placeholder="300..." className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-gorilla-purple transition-all"
                            value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} />
                    </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-gorilla-purple hover:bg-violet-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-purple-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <ArrowRightCircle size={24} /> 
                  {loading ? 'REGISTRANDO...' : 'REGISTRAR ENTRADA'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* LISTA: VEHÍCULOS ACTIVOS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-black flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    VEHÍCULOS EN PATIO
                </h2>
            </div>

            <AnimatePresence mode='popLayout'>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {registros.map((reg) => {
                    const { horas, total, minutos } = calcularCobro(reg.hora_entrada, reg.tipo_vehiculo)
                    return (
                    <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        key={reg.id} 
                        className="bg-white/[0.03] border border-white/10 p-6 rounded-[2.5rem] hover:border-gorilla-orange/40 transition-all group relative overflow-hidden"
                    >
                        {/* Brillo de fondo sutil */}
                        <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-20 ${reg.tipo_vehiculo === 'carro' ? 'bg-blue-500' : 'bg-orange-500'}`} />

                        <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl ${reg.tipo_vehiculo === 'carro' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {reg.tipo_vehiculo === 'carro' ? <Car size={28}/> : <Bike size={28}/>}
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-black tracking-tighter text-white block">{reg.placa}</span>
                            <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-1 rounded-md">ENTRADA: {new Date(reg.hora_entrada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        </div>

                        <div className="space-y-3 mb-8 bg-black/20 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 text-sm font-medium">
                                <User size={16} className="text-gorilla-purple" /> 
                                <span className="text-gray-300">{reg.nombre_cliente || 'Cliente Anónimo'}</span>
                            </div>
                            {reg.celular && (
                                <div className="flex items-center gap-3 text-sm font-medium">
                                    <Phone size={16} className="text-gorilla-purple" /> 
                                    <span className="text-gray-500">{reg.celular}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Tiempo Transcurrido</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{minutos}</span>
                                    <span className="text-sm font-bold text-gray-500">MIN</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Cobro Actual</p>
                                <p className="text-3xl font-black text-green-400">${total.toLocaleString()}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => finalizarServicio(reg.id, total)}
                            className="w-full mt-6 bg-white/5 hover:bg-red-500 text-gray-400 hover:text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-red-500 group"
                        >
                            REGISTRAR SALIDA <ArrowRightCircle size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                    )
                })}
                </div>
            </AnimatePresence>

            {registros.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10"
              >
                <Clock className="w-16 h-16 text-gray-800 mx-auto mb-4" />
                <p className="text-gray-600 font-bold uppercase tracking-widest">Patio de Estancia Vacío</p>
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}