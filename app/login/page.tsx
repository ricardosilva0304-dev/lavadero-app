'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion' // Librería de animaciones
export const dynamic = 'force-dynamic'

export default function LoginPage() {
    const [cedula, setCedula] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { data, error } = await supabase
            .from('perfiles')
            .select('*')
            .eq('cedula', cedula)
            .single()

        // PGRST116 = "0 rows returned" → cédula no existe
        // Cualquier otro error es de red, config o servidor
        if (error && error.code !== 'PGRST116') {
            setError('Error de conexión. Verifica tu red e intenta de nuevo.')
            setLoading(false)
            return
        }

        if (data) {
            sessionStorage.setItem('gorilla_user', JSON.stringify({
                cedula: data.cedula,
                nombre: data.nombre,
                rol: data.rol
            }))

            if (data.rol === 'coordinador') {
                router.push('/admin/resumen')
            } else if (data.rol === 'vendedor') {
                router.push('/operativo/nuevo-servicio')
            } else {
                router.push('/operativo') // empleado → panel de tareas
            }
        } else {
            setError('Cédula no registrada. Contacta al admin.')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen w-full bg-[#0E0C15] flex flex-col items-center justify-center p-6 relative overflow-hidden z-50">

            {/* FONDO DECORATIVO AVANZADO */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gorilla-orange/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gorilla-purple/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                {/* Patrón de puntos (Grid) */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-[420px] z-10"
            >
                {/* LOGO CON GLOW DINÁMICO */}
                <div className="flex justify-center mb-12">
                    <div className="relative">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                            className="absolute -inset-4 bg-gradient-to-r from-gorilla-orange/50 to-gorilla-purple/50 rounded-full blur-2xl opacity-30"
                        ></motion.div>
                        <div className="relative bg-[#121216] border border-white/10 rounded-full p-4 shadow-2xl">
                            <Image
                                src="/logo.png"
                                alt="Gorilla Wash Logo"
                                width={140}
                                height={140}
                                className="rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* TARJETA GLASSMORPHISM */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
                    {/* Brillo en el borde superior */}
                    <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-gorilla-orange/50 to-transparent" />

                    <div className="text-center mb-10">
                        <h1 className="text-white text-4xl font-black tracking-tighter mb-2">
                            ECOPLANET <span className="text-transparent bg-clip-text bg-gradient-to-r from-gorilla-orange to-orange-400">KONG</span>
                        </h1>
                        <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Sistema de Gestión Pro</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-widest">Identificación</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    placeholder="Ingresa tu cédula"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white text-center text-2xl font-black tracking-[0.15em] focus:outline-none focus:ring-2 focus:ring-gorilla-orange/50 focus:border-gorilla-orange transition-all duration-300 placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
                                />
                                {/* Adorno de esquina */}
                                <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-gorilla-orange/30 rounded-tr" />
                                <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-gorilla-orange/30 rounded-bl" />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 py-3 px-4 rounded-xl"
                                >
                                    <p className="text-red-400 text-xs text-center font-bold uppercase tracking-tight">
                                        ⚠️ {error}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-2xl p-[2px] transition-all active:scale-95 disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-gorilla-orange via-orange-400 to-gorilla-purple animate-gradient-x" />
                            <div className="relative flex items-center justify-center bg-[#0a0a0c] hover:bg-transparent transition-colors rounded-[14px] py-5">
                                {loading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-white font-black tracking-widest text-sm uppercase">Verificando...</span>
                                    </div>
                                ) : (
                                    <span className="text-white font-black tracking-[0.2em] text-sm uppercase group-hover:scale-110 transition-transform">
                                        ENTRAR AL SISTEMA
                                    </span>
                                )}
                            </div>
                        </button>
                    </form>
                </div>

                {/* FOOTER */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-600 text-[10px] font-bold tracking-[0.3em] uppercase">
                        Desarrollado para el Élite Automotriz
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}