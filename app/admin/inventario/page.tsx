'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Package, Plus, Trash2, Edit, ShoppingCart, 
  Beer, Utensils, AlertTriangle, Save, Search, 
  Coffee, CheckCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InventarioPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'venta' | 'gestion'>('venta')
  const [busqueda, setBusqueda] = useState('')
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

  const handleSave = async () => {
    if (!form.nombre || form.precio_venta <= 0) return
    if (isEditing) {
      await supabase.from('productos').update({
        nombre: form.nombre, categoria: form.categoria,
        precio_venta: form.precio_venta, stock: form.stock
      }).eq('id', form.id)
    } else {
      await supabase.from('productos').insert([form])
    }
    resetForm()
    fetchProductos()
  }

  const registrarVenta = async (prod: any) => {
    if (prod.stock <= 0) return
    const metodo = confirm("💵 ¿Pago en EFECTIVO?") ? 'efectivo' : 'transferencia'
    
    await supabase.from('productos').update({ stock: prod.stock - 1 }).eq('id', prod.id)
    await supabase.from('ventas_productos').insert([{
      producto_id: prod.id, nombre_producto: prod.nombre,
      cantidad: 1, total: prod.precio_venta, metodo_pago: metodo
    }])
    fetchProductos()
  }

  const eliminarProducto = async (id: string) => {
    if (confirm('¿Eliminar?')) {
      await supabase.from('productos').delete().eq('id', id)
      fetchProductos()
    }
  }

  const resetForm = () => {
    setForm({ id: '', nombre: '', categoria: 'bebida', precio_venta: 0, stock: 0 })
    setIsEditing(false)
  }

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-10 pb-32 relative overflow-hidden">
      
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gorilla-orange/5 rounded-full blur-[100px] -z-10" />

      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2 text-gray-900">
            Market <span className="text-gorilla-orange">Gorilla</span>
          </h1>
          <p className="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase">Control de Cafetería</p>
        </motion.div>

        <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-gray-200 shadow-md">
          <button onClick={() => setActiveTab('venta')} className={`px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'venta' ? 'bg-gorilla-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>VENTA</button>
          <button onClick={() => setActiveTab('gestion')} className={`px-8 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${activeTab === 'gestion' ? 'bg-gorilla-purple text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>GESTIÓN</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'venta' ? (
            <motion.div key="pos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              {/* Buscador */}
              <div className="relative max-w-md mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  placeholder="BUSCAR PRODUCTO..." 
                  className="w-full bg-white border border-gray-200 p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-gorilla-orange transition-all uppercase font-bold text-sm tracking-widest text-gray-900 placeholder:text-gray-300 shadow-sm"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {productosFiltrados.map(p => (
                  <motion.button 
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    key={p.id}
                    onClick={() => registrarVenta(p)}
                    disabled={p.stock <= 0}
                    className={`relative p-6 rounded-[2.5rem] border transition-all flex flex-col items-center text-center gap-4 group shadow-lg ${
                      p.stock <= 0 ? 'bg-gray-100 border-gray-200 opacity-50 grayscale cursor-not-allowed' : 
                      'bg-white border-gray-100 hover:border-gorilla-orange hover:shadow-xl'
                    }`}
                  >
                    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                      {p.categoria === 'bebida' ? <Coffee size={32} /> : <Utensils size={32} />}
                    </div>
                    
                    <div className="flex flex-col gap-1 w-full">
                      <span className="font-black text-xs uppercase tracking-tight line-clamp-2 h-8 leading-tight text-gray-700">{p.nombre}</span>
                      <span className="text-xl font-black text-gray-900">${p.precio_venta.toLocaleString()}</span>
                    </div>

                    <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${
                      p.stock <= p.stock_minimo ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      STOCK: {p.stock}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="crud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* Formulario */}
              <div className="lg:col-span-4">
                <div className="bg-white border border-gray-200 p-8 rounded-[3rem] sticky top-10 shadow-xl shadow-gray-200/50">
                  <h2 className="text-xl font-black mb-8 flex items-center gap-3 italic uppercase text-gray-800">
                    {isEditing ? <Edit className="text-gorilla-purple" /> : <Plus className="text-gorilla-orange" />}
                    {isEditing ? 'Editar Item' : 'Nuevo Item'}
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Nombre</label>
                      <input className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:bg-white focus:border-gorilla-orange text-gray-900"
                        value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Categoría</label>
                        <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-900"
                          value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value as any})}>
                          <option value="bebida">Bebida</option>
                          <option value="comida">Comida</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Precio</label>
                        <input type="number" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-900"
                          value={form.precio_venta} onChange={e => setForm({...form, precio_venta: Number(e.target.value)})} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Stock</label>
                      <input type="number" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-900"
                        value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
                    </div>

                    <div className="flex gap-3 pt-4">
                      {isEditing && <button onClick={resetForm} className="flex-1 bg-gray-100 text-gray-500 p-4 rounded-2xl font-bold uppercase text-xs">Cancelar</button>}
                      <button onClick={handleSave} className="flex-[3] bg-gorilla-purple hover:bg-violet-700 text-white p-5 rounded-2xl font-black shadow-xl shadow-purple-200 transition-all flex items-center justify-center gap-3">
                        <Save size={20}/> {isEditing ? 'ACTUALIZAR' : 'GUARDAR'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] px-4">Listado de Productos</h3>
                {productos.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 p-5 rounded-[2rem] flex items-center justify-between group hover:border-gray-300 shadow-sm transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${p.categoria === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                        {p.categoria === 'bebida' ? <Beer size={20}/> : <Utensils size={20}/>}
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight leading-none mb-1 text-gray-900">{p.nombre}</h3>
                        <div className="flex gap-4">
                           <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">${p.precio_venta.toLocaleString()}</span>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${p.stock <= p.stock_minimo ? 'text-red-500' : 'text-green-600'}`}>Stock: {p.stock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm(p); setIsEditing(true); window.scrollTo(0,0); }} className="p-4 text-gray-400 hover:text-gorilla-purple hover:bg-purple-50 rounded-2xl transition-all"><Edit size={18}/></button>
                      <button onClick={() => eliminarProducto(p.id)} className="p-4 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Alerta Flotante */}
      <AnimatePresence>
        {productos.some(p => p.stock <= p.stock_minimo) && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 right-10 z-[100]"
          >
            <div className="bg-white text-red-600 px-8 py-4 rounded-[2rem] shadow-2xl shadow-red-200 border border-red-100 flex items-center gap-4">
              <div className="p-2 bg-red-50 rounded-full animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest leading-none">Stock Bajo</p>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Reponer inventario</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}