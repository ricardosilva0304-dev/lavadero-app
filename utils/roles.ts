// ============================================================
// SISTEMA DE ROLES — fuente única de verdad
// ============================================================
// Roles disponibles:
//   coordinador — acceso total (incluyendo Configuración)
//   vendedor    — Inventario (solo venta), Nuevo Servicio y Parqueadero
//   empleado    — solo Panel de Tareas (operativo)
// ============================================================

export type Rol = 'coordinador' | 'vendedor' | 'empleado'

export interface Usuario {
    cedula: string
    nombre: string
    rol: Rol
}

// Páginas que puede ver cada rol (usadas en el Sidebar)
export const MENU_POR_ROL: Record<Rol, { label: string; href: string; icon: string; color: string }[]> = {
    coordinador: [
        { label: 'Resumen', href: '/admin/resumen', icon: 'LayoutDashboard', color: 'orange' },
        { label: 'Historial', href: '/admin/historial', icon: 'History', color: 'orange' },
        { label: 'Monitoreo', href: '/admin/monitoreo', icon: 'Activity', color: 'orange' },
        { label: 'Nuevo Servicio', href: '/operativo/nuevo-servicio', icon: 'PlusCircle', color: 'orange' },
        { label: 'Parqueadero', href: '/operativo/parqueadero', icon: 'Clock', color: 'orange' },
        { label: 'Inventario', href: '/admin/inventario', icon: 'Package', color: 'purple' },
        { label: 'Clientes', href: '/admin/clientes', icon: 'Users', color: 'purple' },
        { label: 'Reportes', href: '/admin/reportes', icon: 'BarChart3', color: 'purple' },
        { label: 'Configuración', href: '/admin/configuracion', icon: 'Settings', color: 'purple' },
    ],
    vendedor: [
        { label: 'Inventario', href: '/admin/inventario', icon: 'Package', color: 'orange' },
        { label: 'Nuevo Servicio', href: '/operativo/nuevo-servicio', icon: 'PlusCircle', color: 'orange' },
        { label: 'Parqueadero', href: '/operativo/parqueadero', icon: 'Clock', color: 'orange' },
    ],
    empleado: [
        { label: 'Panel de Tareas', href: '/operativo', icon: 'ListChecks', color: 'orange' },
    ],
}

// ¿Puede este rol ver la página de Configuración?
export const puedeVerConfiguracion = (rol: Rol | string) => rol === 'coordinador'

// ¿Puede este rol hacer CRUD (crear/editar/borrar)?
// Solo el coordinador. vendedor y empleado no.
export const puedeCRUD = (rol: Rol | string) => rol === 'coordinador'

// ¿Puede este rol ver la pestaña Gestión del Inventario?
export const puedeGestionarInventario = (rol: Rol | string) => rol === 'coordinador'

// Etiqueta visual para mostrar el rol en la UI
export const ETIQUETA_ROL: Record<Rol, string> = {
    coordinador: 'Coordinador',
    vendedor: 'Vendedor',
    empleado: 'Operador Lavado',
}

// Color de badge para cada rol
export const COLOR_ROL: Record<Rol, string> = {
    coordinador: 'bg-orange-100 text-gorilla-orange',
    vendedor: 'bg-green-100 text-green-600',
    empleado: 'bg-purple-100 text-gorilla-purple',
}