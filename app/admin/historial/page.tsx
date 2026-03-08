'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, FileText, User, Car, Tag, Clock, Trash2, Calendar, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function HistorialPage() {
  const supabase = createClient()
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtroPago, setFiltroPago] = useState<'todos' | 'efectivo' | 'transferencia'>('todos')

  useEffect(() => {
    fetchHistorial()
  }, [])

  const fetchHistorial = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('ordenes_servicio')
      .select(`
        *,
        cliente:clientes!cliente_id (nombre),
        empleado:perfiles!empleado_id (nombre)
      `)
      .order('creado_en', { ascending: false })

    if (error) {
      console.error("Error en el historial:", error.message)
    } else {
      setOrdenes(data || [])
    }

    setLoading(false)
  }

  const eliminarOrden = async (id: string) => {
    const confirmar = window.confirm(
      '¿Estás seguro de eliminar este servicio?\n\nEsta acción es irreversible y restará automáticamente este dinero del Cuadre de Caja y del Monitoreo.'
    )

    if (confirmar) {
      setLoading(true)
      await supabase.from('ordenes_servicio').delete().eq('id', id)
      fetchHistorial()
    }
  }

  // --- FILTROS ---
  const filtered = ordenes.filter(o => {
    const matchBusqueda = o.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
      (o.cliente?.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchPago = filtroPago === 'todos' || o.metodo_pago === filtroPago;
    return matchBusqueda && matchPago;
  })

  // --- AGRUPACIÓN POR FECHAS ---
  const agruparPorFecha = (lista: any[]) => {
    const grupos: { [key: string]: any[] } = {};
    const hoyStr = new Date().toLocaleDateString('es-CO');

    // Calculamos "Ayer"
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toLocaleDateString('es-CO');

    lista.forEach(o => {
      // Extraemos la fecha pura de la base de datos (YYYY-MM-DD)
      // Usamos substring para no depender de la zona horaria del navegador
      const fechaPura = o.creado_en.substring(0, 10);

      // Creamos un objeto Date "falso" forzando la zona horaria local para obtener el string
      // El truco es añadir T12:00:00 para evitar que la zona horaria lo mueva de día
      const fechaLocal = new Date(`${fechaPura}T12:00:00`).toLocaleDateString('es-CO');

      let nombreGrupo = fechaLocal;
      if (fechaLocal === hoyStr) nombreGrupo = 'Hoy';
      else if (fechaLocal === ayerStr) nombreGrupo = 'Ayer';
      else {
        // Formato bonito: "05 Mar 2026"
        nombreGrupo = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${fechaPura}T12:00:00`));
      }

      if (!grupos[nombreGrupo]) grupos[nombreGrupo] = [];
      grupos[nombreGrupo].push(o);
    });

    return grupos;
  }

  const ordenesAgrupadas = agruparPorFecha(filtered);

  // --- FORMATEADOR DE HORA SOLAMENTE ---
  const formatearHora = (fechaISO: string) => {
    // Si la fecha fue forzada retroactivamente (ej: 2026-03-05 00:00:00+00) no queremos mostrar "7:00 PM"
    if (fechaISO.includes('T00:00:00') || fechaISO.includes(' 00:00:00')) {
      return 'Sin hora (Retroactivo)';
    }
    const date = new Date(fechaISO);
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  }

  return (
    <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-6 py-6 md:p-10 overflow-x-hidden">

      <div className="max-w-6xl mx-auto space-y-8 lg:space-y-10">

        {/* HEADER Y BUSCADOR AVANZADO */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-slate-200/60 pb-8">
          <div className="w-full xl:w-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Auditoría Digital</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
              Historial <span className="text-gorilla-orange">Total</span>
            </h1>
          </div>

          <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3">
            {/* Filtros */}
            <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
              <button onClick={() => setFiltroPago('todos')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'todos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Todos</button>
              <button onClick={() => setFiltroPago('efectivo')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'efectivo' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Efectivo</button>
              <button onClick={() => setFiltroPago('transferencia')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'transferencia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Transf</button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-[300px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-orange transition-colors" size={16} />
              <input
                placeholder="Buscar placa o cliente..."
                className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm font-bold uppercase text-xs placeholder:text-slate-300 text-slate-800"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* LISTA DE HISTORIAL AGRUPADA */}
        <main className="space-y-12">
          {loading ? (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="w-10 h-10 border-4 border-gorilla-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Actualizando base de datos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No se encontraron registros</p>
            </div>
          ) : (
            <AnimatePresence>
              {Object.keys(ordenesAgrupadas).map((fechaGrupo) => (
                <div key={fechaGrupo} className="space-y-5">
                  {/* Título del Grupo de Fecha */}
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                      <Calendar size={18} />
                    </div>
                    <h2 className="text-xl font-black italic tracking-tighter text-slate-800 uppercase">{fechaGrupo}</h2>
                    <div className="flex-1 h-px bg-slate-200/60 ml-4 hidden sm:block"></div>
                  </div>

                  {/* Tarjetas del Grupo */}
                  <div className="space-y-4 pl-0 sm:pl-16">
                    {ordenesAgrupadas[fechaGrupo].map((o: any) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={o.id}
                        className="bg-white border border-slate-200/60 p-5 md:p-6 rounded-[2rem] shadow-sm hover:shadow-md hover:border-slate-300 transition-all group relative"
                      >

                        <button
                          onClick={() => eliminarOrden(o.id)}
                          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Eliminar este servicio"
                        >
                          <Trash2 size={18} />
                        </button>

                        <div className="grid grid-cols-2 xl:grid-cols-12 gap-y-5 gap-x-6 items-center w-full pr-8 md:pr-10">

                          {/* 1. VEHÍCULO Y HORA */}
                          <div className="col-span-2 xl:col-span-3 flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-[1rem] flex items-center justify-center text-slate-400 group-hover:text-gorilla-orange group-hover:bg-orange-50 transition-colors shrink-0 shadow-inner">
                              <Car size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                              <h3 className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1.5">{o.placa}</h3>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Clock size={12} />
                                {formatearHora(o.creado_en)}
                              </div>
                            </div>
                          </div>

                          {/* 2. CLIENTE Y SERVICIOS */}
                          <div className="col-span-2 xl:col-span-4 flex flex-col justify-center border-t border-slate-100 pt-4 xl:pt-0 xl:border-t-0 xl:border-l xl:pl-6">
                            <div className="flex items-center gap-2 mb-2">
                              <User size={14} className="text-gorilla-purple shrink-0" />
                              <span className="text-xs font-bold text-slate-700 uppercase truncate">
                                {o.cliente?.nombre || 'Cliente General'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Tag size={14} className="text-slate-400 shrink-0 mt-[2px]" />
                              <p className="text-[11px] font-medium text-slate-500 uppercase leading-snug line-clamp-2">
                                {o.nombres_servicios}
                              </p>
                            </div>
                          </div>

                          {/* 3. OPERADOR Y ESTADO */}
                          <div className="col-span-1 xl:col-span-3 flex flex-col items-start justify-center border-t border-slate-100 pt-4 xl:pt-0 xl:border-t-0 xl:border-l xl:pl-6">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lavador Asignado</span>
                            <p className="text-xs font-black text-slate-800 uppercase truncate w-full mb-2">
                              {o.empleado?.nombre || 'No asignado'}
                            </p>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border ${o.metodo_pago === 'efectivo'
                              ? 'bg-green-50 text-green-600 border-green-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                              {o.metodo_pago}
                            </span>
                          </div>

                          {/* 4. TOTAL PAGADO */}
                          <div className="col-span-1 xl:col-span-2 flex flex-col items-end justify-center border-t border-slate-100 pt-4 xl:pt-0 xl:border-t-0 xl:border-l xl:pl-6 text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Pagado</span>
                            <p className="text-2xl xl:text-3xl font-black text-gorilla-orange tracking-tighter leading-none">
                              ${Number(o.total || 0).toLocaleString()}
                            </p>
                          </div>

                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  )
}