'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Package, Plus, Trash2, Edit, ShoppingCart,
  Utensils, AlertTriangle, Search,
  Coffee, X, Minus, Zap, ArrowRight,
  Check, Save
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Rol, puedeGestionarInventario } from '@/utils/roles'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function InventarioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [productos, setProductos] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'venta' | 'gestion'>('venta')
  const [busqueda, setBusqueda] = useState('')
  const [userRol, setUserRol] = useState<Rol>('empleado')

  const [carrito, setCarrito] = useState<any[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [loadingVenta, setLoadingVenta] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [ventaError, setVentaError] = useState('')

  const [form, setForm] = useState({ id: '', nombre: '', categoria: 'bebida', precio_venta: 0, stock: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [errorProducto, setErrorProducto] = useState('')
  const [productoGuardado, setProductoGuardado] = useState('')

  useEffect(() => {
    const userData = sessionStorage.getItem('gorilla_user')
    if (!userData) { router.push('/login'); return }
    setUserRol(JSON.parse(userData).rol ?? 'empleado')
  }, [router])

  const puedeGestion = puedeGestionarInventario(userRol)

  useEffect(() => {
    fetchProductos()
    const channel = supabase.channel('inventario_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => fetchProductos())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    setProductos(data || [])
  }

  const agregarAlCarrito = (producto: any) => {
    if (producto.stock <= 0) return
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) return prev
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const quitarDelCarrito = (id: string) => {
    setCarrito(prev =>
      prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item)
        .filter(item => item.cantidad > 0)
    )
  }

  // CORRECCIÓN: parseFloat para evitar NaN en el total del carrito
  const totalCarrito = carrito.reduce((acc, item) => {
    return acc + ((parseFloat(item.precio_venta) || 0) * item.cantidad)
  }, 0)

  const procesarVenta = async () => {
    if (carrito.length === 0) return
    setLoadingVenta(true)
    setVentaError('')
    try {
      // Re-consultamos el stock actual de cada producto antes de actualizar
      // para evitar race conditions si otro usuario vendió mientras tanto
      const ids = carrito.map(item => item.id)
      const { data: stockActual, error: errStock } = await supabase
        .from('productos')
        .select('id, stock, nombre')
        .in('id', ids)

      if (errStock || !stockActual) throw new Error('No se pudo verificar el stock')

      // Verificar que hay stock suficiente para todos los items
      for (const item of carrito) {
        const prod = stockActual.find(p => p.id === item.id)
        if (!prod || prod.stock < item.cantidad) {
          setVentaError(`Stock insuficiente para "${item.nombre}". Disponible: ${prod?.stock ?? 0}`)
          setLoadingVenta(false)
          return
        }
      }

      // Actualizar stock con valor real desde BD y registrar ventas
      await Promise.all(
        carrito.map(item => {
          const stockReal = stockActual.find(p => p.id === item.id)!.stock
          return Promise.all([
            supabase.from('productos')
              .update({ stock: stockReal - item.cantidad })
              .eq('id', item.id),
            supabase.from('ventas_productos').insert([{
              producto_id: item.id,
              nombre_producto: item.nombre,
              cantidad: item.cantidad,
              total: (parseFloat(item.precio_venta) || 0) * item.cantidad,
              metodo_pago: metodoPago
            }])
          ])
        })
      )

      setCarrito([])
      fetchProductos()
      setVentaExitosa(true)
      setTimeout(() => setVentaExitosa(false), 3000)
    } catch (error) {
      console.error(error)
      setVentaError('Error al procesar la venta. Intenta de nuevo.')
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleSave = async () => {
    if (!form.nombre || form.precio_venta <= 0) return
    setGuardandoProducto(true)
    setErrorProducto('')
    const wasEditing = isEditing
    const payload = { ...form, precio_venta: Number(form.precio_venta), stock: Number(form.stock) }
    try {
      let error: any = null
      if (isEditing) {
        ; ({ error } = await supabase.from('productos').update(payload).eq('id', form.id))
      } else {
        const { id, ...nuevo } = payload
          ; ({ error } = await supabase.from('productos').insert([nuevo]))
      }
      if (!error) {
        resetForm()
        fetchProductos()
        setProductoGuardado(wasEditing ? 'actualizado' : 'agregado')
        setTimeout(() => setProductoGuardado(''), 2500)
      } else {
        if (error.code === '23505') setErrorProducto('Ya existe un producto con ese nombre.')
        else setErrorProducto('No se pudo guardar. Intenta de nuevo.')
      }
    } catch {
      setErrorProducto('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoProducto(false)
    }
  }

  const resetForm = () => {
    setForm({ id: '', nombre: '', categoria: 'bebida', precio_venta: 0, stock: 0 })
    setIsEditing(false)
    setErrorProducto('')
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-20 lg:pt-10 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-8 lg:px-10 pb-32 overflow-x-hidden">

      {/* HEADER Y TABS */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-8 bg-gorilla-orange rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Inventory & POS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">
            Market <span className="text-gorilla-orange">Gorilla</span>
          </h1>
        </div>

        <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200 w-full sm:w-auto">
          <button onClick={() => setActiveTab('venta')} className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'venta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>VENTA</button>
          {puedeGestion && (
            <button onClick={() => setActiveTab('gestion')} className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'gestion' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>GESTIÓN</button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">

          {/* ===== PESTAÑA VENTA ===== */}
          {activeTab === 'venta' ? (
            <motion.div key="venta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">

              {/* Productos */}
              <div className="xl:col-span-7 2xl:col-span-8 space-y-5">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-orange transition-colors" size={16} />
                  <input
                    placeholder="Buscar producto..."
                    className="w-full bg-white border border-slate-200/60 p-4 pl-12 rounded-[1.5rem] shadow-sm outline-none focus:border-gorilla-orange focus:ring-4 focus:ring-orange-50 font-bold text-sm text-slate-700 placeholder:text-slate-300 transition-all uppercase"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                  {productosFiltrados.map(p => {
                    const sinStock = p.stock <= 0
                    const alertaStock = p.stock <= p.stock_minimo && !sinStock
                    const precio = parseFloat(p.precio_venta) || 0

                    return (
                      <motion.button
                        whileTap={{ scale: sinStock ? 1 : 0.95 }}
                        key={p.id}
                        onClick={() => agregarAlCarrito(p)}
                        disabled={sinStock}
                        className={`group relative p-4 sm:p-5 rounded-[1.5rem] border transition-all flex flex-col items-start text-left gap-3 bg-white ${sinStock
                          ? 'opacity-60 grayscale border-slate-200 cursor-not-allowed'
                          : 'border-slate-200/60 hover:border-gorilla-orange/50 hover:shadow-md hover:shadow-orange-100'
                          }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className={`p-2.5 sm:p-3 rounded-xl transition-transform group-hover:scale-105 ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                            {p.categoria === 'bebida' ? <Coffee size={20} /> : <Utensils size={20} />}
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border ${sinStock ? 'bg-slate-100 border-slate-200 text-slate-500'
                            : alertaStock ? 'bg-red-50 border-red-100 text-red-500'
                              : 'bg-green-50 border-green-100 text-green-600'
                            }`}>
                            {p.stock}
                          </span>
                        </div>
                        <div className="w-full">
                          <span className="font-bold text-[10px] sm:text-[11px] uppercase text-slate-500 line-clamp-2 leading-tight min-h-[28px]">{p.nombre}</span>
                          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">${precio.toLocaleString('es-CO')}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Carrito */}
              <div className="xl:col-span-5 2xl:col-span-4">
                <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/40 flex flex-col xl:sticky xl:top-8"
                  style={{ height: 'auto', minHeight: '400px', maxHeight: 'calc(100vh - 6rem)' }}>

                  <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <h2 className="text-lg sm:text-xl font-black uppercase italic flex items-center gap-2 text-slate-800 tracking-tight">
                      <ShoppingCart className="text-gorilla-orange" size={22} /> Carrito
                    </h2>
                    <span className="bg-slate-100 text-slate-500 text-[10px] border border-slate-200 font-black px-3 py-1 rounded-full">{carrito.length} ITEMS</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 custom-scrollbar">
                    {carrito.length === 0 ? (
                      <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center opacity-50">
                        <Package className="text-slate-300 w-12 h-12 mb-3" />
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Carrito Vacío</p>
                      </div>
                    ) : (
                      carrito.map(item => {
                        const precio = parseFloat(item.precio_venta) || 0
                        return (
                          <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={item.id}
                            className="flex items-center justify-between bg-slate-50/50 p-3.5 rounded-[1.2rem] border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex-1 pr-3 min-w-0">
                              <p className="text-[11px] font-black uppercase text-slate-700 leading-tight mb-1 truncate">{item.nombre}</p>
                              <p className="text-sm font-black text-gorilla-orange">${(precio * item.cantidad).toLocaleString('es-CO')}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 shrink-0">
                              <button onClick={() => quitarDelCarrito(item.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"><Minus size={13} strokeWidth={3} /></button>
                              <span className="font-black text-xs w-4 text-center text-slate-800">{item.cantidad}</span>
                              <button onClick={() => agregarAlCarrito(item)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-gorilla-orange transition-colors"><Plus size={13} strokeWidth={3} /></button>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>

                  <div className="p-5 sm:p-6 bg-white border-t border-slate-100 rounded-b-[2rem] shrink-0">
                    <div className="bg-[#0E0C15] rounded-[1.2rem] p-4 sm:p-5 text-white mb-4 flex justify-between items-center relative overflow-hidden shadow-lg border border-slate-800">
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-gorilla-orange" />
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total</span>
                        <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white leading-none">${totalCarrito.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="opacity-10 absolute right-4"><Zap size={36} /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {(['efectivo', 'transferencia'] as const).map(m => (
                        <button key={m} onClick={() => setMetodoPago(m)}
                          className={`py-3 rounded-xl font-black text-[10px] tracking-widest border-2 transition-all flex items-center justify-center gap-1.5 ${metodoPago === m
                            ? m === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                            }`}>
                          {metodoPago === m && <Check size={13} strokeWidth={3} />}
                          {m === 'efectivo' ? 'EFECTIVO' : 'TRANSF.'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={procesarVenta}
                      disabled={carrito.length === 0 || loadingVenta}
                      className="w-full bg-gorilla-orange hover:bg-orange-600 text-white py-4 sm:py-5 rounded-2xl font-black italic uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
                    >
                      {loadingVenta ? 'Verificando stock...' : <>FINALIZAR <ArrowRight size={18} strokeWidth={3} /></>}
                    </button>

                    {ventaExitosa && (
                      <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl text-center">
                        ✅ Venta registrada con éxito
                      </div>
                    )}
                    {ventaError && (
                      <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl text-center">
                        ⚠️ {ventaError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

          ) : (

            /* ===== PESTAÑA GESTIÓN ===== */
            <motion.div key="gestion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">

              {/* Formulario */}
              <div className="xl:col-span-4">
                <div className="bg-white border border-slate-200/60 p-6 sm:p-8 rounded-[2rem] shadow-lg shadow-slate-200/40 xl:sticky xl:top-8">
                  <h2 className="text-lg sm:text-xl font-black mb-7 flex items-center gap-3 italic uppercase text-slate-800 tracking-tight">
                    {isEditing ? <Edit className="text-gorilla-purple" size={22} /> : <Plus className="text-gorilla-orange" size={22} />}
                    {isEditing ? 'Editar Item' : 'Nuevo Item'}
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Nombre del Producto</label>
                      <input className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-gorilla-orange transition-all placeholder:text-slate-300" placeholder="Ej: Coca Cola 600ml" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Categoría</label>
                        <select className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl font-bold text-sm outline-none focus:border-gorilla-orange cursor-pointer" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                          <option value="bebida">Bebida</option>
                          <option value="comida">Comida</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Precio Venta</label>
                        <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-gorilla-orange transition-all" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Stock</label>
                      <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-gorilla-orange transition-all" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
                    </div>

                    {errorProducto && (
                      <p className="text-red-500 text-xs font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        ⚠️ {errorProducto}
                      </p>
                    )}
                    {productoGuardado && (
                      <p className="text-green-600 text-xs font-bold bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                        ✅ Producto {productoGuardado}
                      </p>
                    )}

                    <div className="flex gap-3 pt-3">
                      {isEditing && (
                        <button onClick={resetForm} className="p-4 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all shrink-0">
                          <X size={20} />
                        </button>
                      )}
                      <button onClick={handleSave} disabled={!form.nombre || form.precio_venta <= 0 || guardandoProducto}
                        className="flex-1 bg-gorilla-purple hover:bg-purple-700 disabled:opacity-50 text-white p-4 rounded-xl font-black italic uppercase tracking-widest shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        {guardandoProducto
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                          : <><Save size={18} /> {isEditing ? 'Actualizar' : 'Guardar'}</>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventario */}
              <div className="xl:col-span-8 space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Package size={15} className="text-slate-400" />
                  <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Inventario Maestro ({productos.length})</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productos.map(p => {
                    const precio = parseFloat(p.precio_venta) || 0
                    return (
                      <div key={p.id} className="bg-white border border-slate-200/60 p-4 sm:p-5 rounded-[1.5rem] flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                          <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                            {p.categoria === 'bebida' ? <Coffee size={18} /> : <Utensils size={18} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-sm uppercase text-slate-800 leading-tight truncate mb-1">{p.nombre}</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              <span className="text-gorilla-orange">${precio.toLocaleString('es-CO')}</span>
                              <span>·</span>
                              <span className={p.stock <= p.stock_minimo ? 'text-red-500' : ''}>Stk: {p.stock}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setForm(p); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="p-2.5 text-slate-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-lg transition-all"><Edit size={15} /></button>
                          <button onClick={() => { if (confirm('¿Eliminar definitivamente?')) supabase.from('productos').delete().eq('id', p.id).then(() => fetchProductos()) }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ALERTA STOCK CRÍTICO */}
      <AnimatePresence>
        {productos.some(p => p.stock <= p.stock_minimo) && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[100] bg-white border border-red-200 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="bg-red-50 p-2.5 rounded-xl text-red-500 shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">Stock Crítico</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Tienes items por agotar</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
      `}</style>
    </div>
  )
}