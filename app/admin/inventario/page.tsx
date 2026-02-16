'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Package, Plus, Trash2, Edit, ShoppingCart, 
  Beer, Utensils, AlertTriangle, Save, Search, 
  Coffee, CreditCard, DollarSign, X, Minus, CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const dynamic = 'force-dynamic'

export default function InventarioPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'venta' | 'gestion'>('venta')
  const [busqueda, setBusqueda] = useState('')
  
  // Estado del Carrito
  const [carrito, setCarrito] = useState<any[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [loadingVenta, setLoadingVenta] = useState(false)

  // Estado para Gestión (CRUD)
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

  // --- LÓGICA DEL CARRITO ---
  const agregarAlCarrito = (producto: any) => {
    if (producto.stock <= 0) return;
    
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) return prev; // No exceder stock
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
        // 1. Descontar stock
        await supabase.from('productos').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
        
        // 2. Registrar la venta
        await supabase.from('ventas_productos').insert([{
          producto_id: item.id,
          nombre_producto: item.nombre,
          cantidad: item.cantidad,
          total: item.precio_venta * item.cantidad,
          metodo_pago: metodoPago
        }]);
      }
      alert("¡Venta registrada con éxito!");
      setCarrito([]);
      fetchProductos();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVenta(false);
    }
  }

  // --- LÓGICA GESTIÓN (CRUD) ---
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
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 pb-40 relative">
      
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900">
            Market <span className="text-gorilla-orange">Gorilla</span>
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Punto de Venta y Suministros</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setActiveTab('venta')} className={`px-8 py-3 rounded-xl font-black text-xs tracking-widest transition-all ${activeTab === 'venta' ? 'bg-gorilla-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>VENTA</button>
          <button onClick={() => setActiveTab('gestion')} className={`px-8 py-3 rounded-xl font-black text-xs tracking-widest transition-all ${activeTab === 'gestion' ? 'bg-gorilla-purple text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>GESTIÓN</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'venta' ? (
            <motion.div key="venta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* IZQUIERDA: LISTA PRODUCTOS */}
              <div className="lg:col-span-8">
                <div className="relative mb-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    placeholder="BUSCAR PRODUCTO..." 
                    className="w-full bg-white border border-gray-200 p-5 pl-12 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-gorilla-orange transition-all font-bold text-sm text-gray-900 shadow-sm"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {productosFiltrados.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      disabled={p.stock <= 0}
                      className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center text-center gap-4 relative bg-white shadow-lg shadow-gray-200/50 ${p.stock <= 0 ? 'opacity-40 grayscale' : 'hover:border-gorilla-orange hover:scale-[1.02] active:scale-95'}`}
                    >
                      <div className={`p-4 rounded-2xl ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                        {p.categoria === 'bebida' ? <Coffee size={28} /> : <Utensils size={28} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase text-gray-500 line-clamp-1">{p.nombre}</span>
                        <span className="text-xl font-black text-gray-900">${p.precio_venta.toLocaleString()}</span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${p.stock <= p.stock_minimo ? 'border-red-100 text-red-500 bg-red-50' : 'border-green-100 text-green-600 bg-green-50'}`}>
                        STOCK: {p.stock}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DERECHA: CARRITO (STICKY) */}
              <div className="lg:col-span-4">
                <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-2xl sticky top-10 flex flex-col h-fit max-h-[70vh]">
                  <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase italic text-gray-800 border-b border-gray-100 pb-4">
                    <ShoppingCart className="text-gorilla-orange" /> Tu Carrito
                  </h2>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 scrollbar-hide">
                    {carrito.length === 0 ? (
                      <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">El carrito está vacío</p>
                    ) : (
                      carrito.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <div>
                            <p className="text-xs font-black uppercase text-gray-800 line-clamp-1">{item.nombre}</p>
                            <p className="text-[10px] text-gray-500 font-bold">${item.precio_venta.toLocaleString()} x {item.cantidad}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => quitarDelCarrito(item.id)} className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-red-500 shadow-sm border border-gray-100"><Minus size={14}/></button>
                            <span className="font-black text-sm">{item.cantidad}</span>
                            <button onClick={() => agregarAlCarrito(item)} className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-gorilla-orange shadow-sm border border-gray-100"><Plus size={14}/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* MÉTODO PAGO */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase ml-1">Método de Pago</p>
                    <div className="flex gap-2">
                      <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border-2 transition-all font-bold text-xs ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-600 shadow-md' : 'border-gray-100 text-gray-400'}`}>
                        <DollarSign size={14}/> EFECTIVO
                      </button>
                      <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border-2 transition-all font-bold text-xs ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-100 text-gray-400'}`}>
                        <CreditCard size={14}/> TRANSF.
                      </button>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex justify-between items-end mb-4 px-2">
                      <span className="text-xs font-black text-gray-400 uppercase">Total</span>
                      <span className="text-3xl font-black text-gray-900">${totalCarrito.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={procesarVenta}
                      disabled={carrito.length === 0 || loadingVenta}
                      className="w-full bg-gray-900 hover:bg-black text-white p-5 rounded-2xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                      {loadingVenta ? '...' : <>FINALIZAR COMPRA <CheckCircle2 size={18}/></>}
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            /* TAB DE GESTIÓN (IDÉNTICO AL ANTERIOR PERO CLARO) */
            <motion.div key="gestion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className="bg-white border border-gray-200 p-8 rounded-[3rem] sticky top-10 shadow-xl">
                  <h2 className="text-xl font-black mb-8 text-gray-800 uppercase italic">
                    {isEditing ? <Edit className="text-gorilla-purple" /> : <Plus className="text-gorilla-orange" />}
                    {isEditing ? 'Editar Item' : 'Nuevo Item'}
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 ml-2">NOMBRE</label><input className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-gorilla-orange" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 ml-2">CATEGORÍA</label><select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 outline-none" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value as any})}><option value="bebida">Bebida</option><option value="comida">Comida</option></select></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 ml-2">PRECIO</label><input type="number" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 outline-none" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 ml-2">STOCK</label><input type="number" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-900 outline-none" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
                    <div className="flex gap-2 pt-4">
                      {isEditing && <button onClick={resetForm} className="flex-1 bg-gray-100 p-4 rounded-xl font-bold text-gray-400">X</button>}
                      <button onClick={handleSave} className="flex-[3] bg-gorilla-purple text-white p-4 rounded-xl font-black shadow-lg shadow-purple-200 uppercase text-xs tracking-widest">Guardar</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8 space-y-3">
                {productos.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 p-4 rounded-3xl flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}><Coffee size={20}/></div>
                      <div><h3 className="font-black text-gray-900 uppercase text-sm leading-none mb-1">{p.nombre}</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${p.precio_venta.toLocaleString()} • STOCK: {p.stock}</p></div>
                    </div>
                    <div className="flex gap-1"><button onClick={() => { setForm(p); setIsEditing(true); window.scrollTo(0,0); }} className="p-3 text-gray-400 hover:text-gorilla-purple"><Edit size={16}/></button><button onClick={() => {if(confirm('¿Eliminar?')) supabase.from('productos').delete().eq('id', p.id).then(()=>fetchProductos())}} className="p-3 text-red-300 hover:text-red-600"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ALERTA STOCK BAJO */}
      {productos.some(p => p.stock <= p.stock_minimo) && (
        <div className="fixed bottom-32 right-10 z-[100] bg-white border border-red-100 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="bg-red-500 p-2 rounded-full text-white"><AlertTriangle size={20}/></div>
          <div><p className="text-[10px] font-black text-gray-800 uppercase leading-none">Stock Crítico</p><p className="text-[9px] text-gray-400 font-bold uppercase">Reponer productos</p></div>
        </div>
      )}
    </div>
  )
}