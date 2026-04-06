// ============================================================
// ZONA HORARIA COLOMBIA (UTC-5) — utilidad central
// ============================================================
// Colombia no usa horario de verano, siempre es UTC-5.
// Usar estas funciones en TODOS los lugares donde se necesite
// la fecha/hora actual para evitar el bug de cambio de día a las 7PM.
// ============================================================

const TZ_OFFSET_MS = -5 * 60 * 60 * 1000 // UTC-5 en milisegundos

/** Retorna un objeto Date ajustado a la hora de Colombia */
export const ahoraCol = (): Date => {
    const utc = new Date()
    return new Date(utc.getTime() + TZ_OFFSET_MS)
}

/** Retorna la fecha actual en Colombia como string YYYY-MM-DD */
export const fechaHoyCol = (): string => {
    const d = ahoraCol()
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

/** Retorna la hora actual en Colombia como string HH:MM */
export const horaAhoraCol = (): string => {
    const d = ahoraCol()
    const h = String(d.getUTCHours()).padStart(2, '0')
    const min = String(d.getUTCMinutes()).padStart(2, '0')
    return `${h}:${min}`
}

/**
 * Convierte una fecha YYYY-MM-DD a ISO string con hora Colombia.
 * Usa mediodía (12:00:00) para evitar desfases al parsear en el cliente.
 */
export const fechaColAISO = (fechaStr: string): string => {
    // Construimos el timestamp como si fuera mediodía Colombia (UTC-5)
    // mediodía Colombia = 17:00:00 UTC
    return `${fechaStr}T17:00:00.000Z`
}

/**
 * Retorna el ISO string del momento actual en Colombia,
 * guardado como UTC real (lo que Supabase espera).
 */
export const ahoraISO = (): string => {
    return new Date().toISOString()
}

/**
 * Dado un string creado_en de Supabase, retorna la fecha local Colombia
 * como string YYYY-MM-DD para comparaciones.
 */
export const isoAFechaCol = (isoStr: string): string => {
    const d = new Date(isoStr)
    const col = new Date(d.getTime() + TZ_OFFSET_MS)
    const y = col.getUTCFullYear()
    const m = String(col.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(col.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

/**
 * Dado un string creado_en de Supabase, retorna la hora Colombia HH:MM
 */
export const isoAHoraCol = (isoStr: string): string => {
    const d = new Date(isoStr)
    const col = new Date(d.getTime() + TZ_OFFSET_MS)
    const h = String(col.getUTCHours()).padStart(2, '0')
    const min = String(col.getUTCMinutes()).padStart(2, '0')
    return `${h}:${min}`
}

/**
 * Retorna el rango de inicio/fin del día Colombia como strings ISO UTC,
 * para usar en filtros de Supabase (.gte / .lte).
 * 
 * Día Colombia empieza a las 05:00 UTC y termina a las 04:59:59 UTC del día siguiente.
 */
export const rangoHoyCol = (): { inicio: string; fin: string } => {
    const hoy = fechaHoyCol()
    const [y, m, d] = hoy.split('-').map(Number)
    // 00:00:00 Colombia = 05:00:00 UTC
    const inicio = new Date(Date.UTC(y, m - 1, d, 5, 0, 0)).toISOString()
    // 23:59:59 Colombia = 04:59:59 UTC del día siguiente
    const fin = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59)).toISOString()
    return { inicio, fin }
}

/**
 * Igual que rangoHoyCol pero para una fecha específica YYYY-MM-DD Colombia.
 */
export const rangoDiaCol = (fechaCol: string): { inicio: string; fin: string } => {
    const [y, m, d] = fechaCol.split('-').map(Number)
    const inicio = new Date(Date.UTC(y, m - 1, d, 5, 0, 0)).toISOString()
    const fin = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59)).toISOString()
    return { inicio, fin }
}