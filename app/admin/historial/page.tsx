'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, FileText, User, Car, Tag, Trash2, Calendar, Phone } from 'lucide-react'
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
        cliente:clientes!cliente_id (nombre, telefono),
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
      '¿Estás seguro de eliminar este servicio?\n\nEsta acción es irreversible y restará automáticamente este dinero del Cuadre de Caja.'
    )

    if (confirmar) {
      setLoading(true)
      await supabase.from('ordenes_servicio').delete().eq('id', id)
      fetchHistorial()
    }
  }

  // --- FILTROS (Placa, Nombre, Teléfono) ---
  const filtered = ordenes.filter(o => {
    const term = busqueda.toLowerCase();
    const matchBusqueda =
      o.placa.toLowerCase().includes(term) ||
      (o.cliente?.nombre || '').toLowerCase().includes(term) ||
      (o.cliente?.telefono || '').includes(term);

    const matchPago = filtroPago === 'todos' || o.metodo_pago === filtroPago;
    return matchBusqueda && matchPago;
  })

  // --- AGRUPACIÓN CORREGIDA (Solución a la Zona Horaria y las 7:00 PM) ---
  const agruparPorFecha = (lista: any[]) => {
    const grupos: { [key: string]: any[] } = {};

    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const formatStr = (d: Date) => d.toLocaleDateString('es-CO');
    const hoyStr = formatStr(hoy);
    const ayerStr = formatStr(ayer);

    lista.forEach(o => {
      let dateObj;

      // Si la fecha termina en T00:00:00 (fue creada retroactivamente por el admin)
      if (o.creado_en.includes('T00:00:00') || o.creado_en.includes(' 00:00:00')) {
        const pura = o.creado_en.split('T')[0].split(' ')[0]; // Sacamos el "2026-03-05"
        dateObj = new Date(`${pura}T12:00:00`); // Forzamos el mediodía local para evitar saltos de día
      } else {
        // Es un registro normal creado en tiempo real, el navegador lo ajusta a la hora local solo.
        dateObj = new Date(o.creado_en);
      }

      const recordStr = formatStr(dateObj);

      let nombreGrupo = '';
      if (recordStr === hoyStr) nombreGrupo = 'HOY';
      else if (recordStr === ayerStr) nombreGrupo = 'AYER';
      else {
        nombreGrupo = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj).toUpperCase();
      }

      if (!grupos[nombreGrupo]) grupos[nombreGrupo] = [];
      grupos[nombreGrupo].push(o);
    });

    return grupos;
  }

  const ordenesAgrupadas = agruparPorFecha(filtered);

  return (
    <div className="min-h-screen pt-24 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-6 py-6 md:p-10 overflow-x-hidden">

      <div className="max-w-6xl mx-auto space-y-8 lg:space-y-10">

        {/* HEADER Y BUSCADOR */}
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
            {/* Filtros de Pago */}
            <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
              <button onClick={() => setFiltroPago('todos')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'todos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Todos</button>
              <button onClick={() => setFiltroPago('efectivo')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'efectivo' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Efectivo</button>
              <button onClick={() => setFiltroPago('transferencia')} className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filtroPago === 'transferencia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Transf</button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-[320px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-orange transition-colors" size={16} />
              <input
                placeholder="Buscar placa, cliente o teléfono..."
                className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 transition-all shadow-sm font-bold uppercase text-xs placeholder:text-slate-300 text-slate-800"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* LISTA DE HISTORIAL MINIMALISTA */}
        <main className="space-y-12 pb-20">
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

                  {/* Título de la Fecha (Timeline) */}
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 text-white rounded-[1rem] shadow-lg">
                      <Calendar size={18} />
                    </div>
                    <h2 className="text-lg font-black italic tracking-tight text-slate-800 uppercase">{fechaGrupo}</h2>
                    <div className="flex-1 h-px bg-slate-200/80 ml-4 hidden sm:block"></div>
                  </div>

                  {/* Filas (Rows) del Grupo */}
                  <div className="space-y-3 pl-0 sm:pl-16">
                    {ordenesAgrupadas[fechaGrupo].map((o: any) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={o.id}
                        className="bg-white border border-slate-200/60 p-4 md:p-5 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6"
                      >
                        {/* 1. Vehículo y Cliente */}
                        <div className="flex items-center gap-4 lg:w-1/3">
                          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                            <Car size={24} strokeWidth={2} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none mb-1.5">{o.placa}</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase truncate">
                              <User size={10} className="text-gorilla-purple" />
                              <span className="truncate max-w-[100px] sm:max-w-none">{o.cliente?.nombre || 'General'}</span>
                              {o.cliente?.telefono && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <Phone size={10} className="text-gorilla-purple" /> {o.cliente.telefono}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Servicios */}
                        <div className="flex-1 border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0">
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-slate-300 shrink-0" />
                            <p className="text-xs font-bold text-slate-600 uppercase leading-snug line-clamp-1 lg:line-clamp-2">
                              {o.nombres_servicios}
                            </p>
                          </div>
                        </div>

                        {/* 3. Datos Finales (Operador, Precio, Botón) */}
                        <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0">

                          {/* Lavador y Etiqueta de Pago */}
                          <div className="flex flex-col items-start lg:items-end gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Op: <span className="text-slate-800">{o.empleado?.nombre || 'N/A'}</span>
                            </span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${o.metodo_pago === 'efectivo' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                              {o.metodo_pago}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="text-right">
                            <span className="text-xl font-black text-gorilla-orange tracking-tighter leading-none block">
                              ${Number(o.total || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Papelera de Reciclaje */}
                          <button
                            onClick={() => eliminarOrden(o.id)}
                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar este servicio"
                          >
                            <Trash2 size={18} />
                          </button>
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