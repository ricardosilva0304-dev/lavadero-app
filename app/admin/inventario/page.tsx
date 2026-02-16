'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Package, Plus, Trash2, Edit, ShoppingCart, 
  Beer, Utensils, AlertTriangle, Save, Search, 
  Coffee, CreditCard, DollarSign, X, Minus, CheckCircle2, Zap, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function InventarioPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'venta' | 'gestion'>('venta')
  const [busqueda, setBusqueda] = useState('')
  
  const [carrito, setCarrito] = useState<any[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [loadingVenta, setLoadingVenta] = useState(false)

  const [form, setForm] = useState({ id: '', nombre: '', categoria: 'bebida', precio_venta: 0, stock: 0 })
  const [isEditing, setIsEditing] = useState(false)

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
    if (producto.stock <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) return prev;
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  }

  const quitarDelCarrito = (id: string) => {
    setCarrito(prev => prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item).filter(item => item.cantidad > 0));
  }

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    setLoadingVenta(true);
    try {
      for (const item of carrito) {
        await supabase.from('productos').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
        await supabase.from('ventas_productos').insert([{
          producto_id: item.id, nombre_producto: item.nombre,
          cantidad: item.cantidad, total: item.precio_venta * item.cantidad,
          metodo_pago: metodoPago
        }]);
      }
      setCarrito([]);
      fetchProductos();
      alert("Venta registrada con éxito");
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVenta(false);
    }
  }

  const handleSave = async () => {
    if (!form.nombre || form.precio_venta <= 0) return
    const payload = { ...form, precio_venta: Number(form.precio_venta), stock: Number(form.stock) };
    if (isEditing) {
      await supabase.from('productos').update(payload).eq('id', form.id);
    } else {
      const { id, ...nuevo } = payload;
      await supabase.from('productos').insert([nuevo]);
    }
    resetForm(); fetchProductos();
  }

  const resetForm = () => {
    setForm({ id: '', nombre: '', categoria: 'bebida', precio_venta: 0, stock: 0 });
    setIsEditing(false);
  }

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-4 md:p-8 pb-40">
      
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-1 w-12 bg-gorilla-orange rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Inventory & POS</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900">
                    Market <span className="text-gorilla-orange">Gorilla</span>
                </h1>
            </div>

            <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-xl border border-white">
                <button onClick={() => setActiveTab('venta')} className={`px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'venta' ? 'bg-gorilla-orange text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>VENTA</button>
                <button onClick={() => setActiveTab('gestion')} className={`px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'gestion' ? 'bg-gorilla-purple text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>GESTIÓN</button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'venta' ? (
            <motion.div key="venta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LISTADO DE PRODUCTOS */}
              <div className="lg:col-span-8 space-y-8">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gorilla-orange transition-colors" size={20} />
                  <input 
                    placeholder="BUSCAR PRODUCTO POR NOMBRE..." 
                    className="w-full bg-white border-none p-6 pl-16 rounded-[2rem] shadow-xl outline-none focus:ring-4 focus:ring-orange-500/10 font-bold text-slate-700"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {productosFiltrados.map(p => (
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      disabled={p.stock <= 0}
                      className={`group p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 bg-white shadow-xl shadow-slate-200 ${p.stock <= 0 ? 'opacity-40 grayscale border-transparent' : 'border-transparent hover:border-gorilla-orange hover:shadow-orange-100'}`}
                    >
                      <div className={`p-5 rounded-[1.5rem] transition-transform group-hover:scale-110 ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                        {p.categoria === 'bebida' ? <Coffee size={32} /> : <Utensils size={32} />}
                      </div>
                      <div className="space-y-1">
                        <span className="font-black text-[10px] uppercase text-slate-400 tracking-tighter line-clamp-1">{p.nombre}</span>
                        <p className="text-2xl font-black text-slate-900">${p.precio_venta.toLocaleString()}</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border-2 ${p.stock <= p.stock_minimo ? 'bg-red-50 border-red-100 text-red-500' : 'bg-green-50 border-green-100 text-green-600'}`}>
                        Stock: {p.stock}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* CARRITO DE COMPRAS */}
              <div className="lg:col-span-4 sticky top-8">
                <div className="bg-white rounded-[3rem] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col h-full max-h-[80vh]">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                    <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-800">
                        <ShoppingCart className="text-gorilla-orange" /> Mi Carrito
                    </h2>
                    <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full">{carrito.length} ITEMS</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 scrollbar-hide">
                    {carrito.length === 0 ? (
                      <div className="text-center py-16">
                        <Package className="mx-auto text-slate-100 w-16 h-16 mb-4" />
                        <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">Carrito Vacío</p>
                      </div>
                    ) : (
                      carrito.map(item => (
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={item.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-700 leading-tight mb-1">{item.nombre}</p>
                            <p className="text-sm font-black text-gorilla-orange">${(item.precio_venta * item.cantidad).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => quitarDelCarrito(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Minus size={16} strokeWidth={3}/></button>
                            <span className="font-black text-sm w-4 text-center">{item.cantidad}</span>
                            <button onClick={() => agregarAlCarrito(item)} className="text-slate-300 hover:text-gorilla-orange transition-colors"><Plus size={16} strokeWidth={3}/></button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-4 opacity-10"><Zap size={48}/></div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</span>
                            <span className="text-4xl font-black tracking-tighter">${totalCarrito.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setMetodoPago('efectivo')} className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'efectivo' ? 'bg-green-50 border-green-500 text-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>EFECTIVO</button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border-2 transition-all ${metodoPago === 'transferencia' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 border-transparent text-slate-400'}`}>TRANSF.</button>
                    </div>

                    <button 
                      onClick={procesarVenta}
                      disabled={carrito.length === 0 || loadingVenta}
                      className="w-full bg-gorilla-orange hover:bg-orange-600 text-white p-6 rounded-3xl font-black italic uppercase tracking-widest shadow-xl shadow-orange-200 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 transition-all"
                    >
                      {loadingVenta ? 'Procesando...' : <>FINALIZAR COMPRA <ArrowRight size={20} /></>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* GESTIÓN DE PRODUCTOS */
            <motion.div key="gestion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-2xl sticky top-8">
                  <h2 className="text-xl font-black mb-10 flex items-center gap-3 italic uppercase text-slate-800">
                    {isEditing ? <Edit className="text-gorilla-purple" /> : <Plus className="text-gorilla-orange" />}
                    {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Nombre del Item</label><input className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none focus:bg-white focus:border-gorilla-orange transition-all" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Categoría</label><select className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value as any})}><option value="bebida">Bebida</option><option value="comida">Comida</option></select></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Precio</label><input type="number" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Stock Inicial</label><input type="number" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold outline-none" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
                    <div className="flex gap-3 pt-6">
                      {isEditing && <button onClick={resetForm} className="p-5 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-200 transition-all"><X size={20}/></button>}
                      <button onClick={handleSave} className="flex-1 bg-gorilla-purple text-white p-5 rounded-3xl font-black italic uppercase tracking-widest shadow-xl shadow-purple-200 transition-all active:scale-95">Guardar Master</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] px-4">Inventario Maestro</h3>
                {productos.map(p => (
                  <div key={p.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-2xl ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}><Coffee size={24}/></div>
                      <div>
                        <h3 className="font-black text-lg uppercase italic text-slate-800 leading-none mb-1">{p.nombre}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${p.precio_venta.toLocaleString()} • Existencia: {p.stock}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm(p); setIsEditing(true); window.scrollTo(0,0); }} className="p-4 text-slate-300 hover:text-gorilla-purple hover:bg-purple-50 rounded-2xl transition-all"><Edit size={20}/></button>
                      <button onClick={() => {if(confirm('¿Eliminar definitivamente?')) supabase.from('productos').delete().eq('id', p.id).then(()=>fetchProductos())}} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING ALERT */}
      <AnimatePresence>
        {productos.some(p => p.stock <= p.stock_minimo) && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 right-10 z-[100] bg-white border-2 border-red-500 p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5">
                <div className="bg-red-500 p-3 rounded-2xl text-white animate-pulse"><AlertTriangle size={24}/></div>
                <div><p className="text-xs font-black text-slate-900 uppercase">Stock Crítico</p><p className="text-[10px] text-red-500 font-bold uppercase">Reponer items pronto</p></div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}