
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const AUTH_URL = `${SUPABASE_URL}/functions/v1/clever-service`
const API_URL = `${SUPABASE_URL}/functions/v1/labores-api`

export type TipoAcceso = 'administrador' | 'supervisor'

export interface SupervisorRemoto {
  id: string
  nombre: string
}

interface RespuestaSesion {
  success: boolean
  role: TipoAcceso
  supervisorId: string | null
  token: string
  expiresIn: number
}

export async function iniciarSesion(
  password: string,
  tipo: TipoAcceso,
  supervisorId?: string,
): Promise<RespuestaSesion> {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ password, tipo, supervisorId }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'No se pudo iniciar sesión')
  }

  localStorage.setItem('labores-session-token', result.token)

  localStorage.setItem(
    'labores-session-info',
    JSON.stringify({
      role: result.role,
      supervisorId: result.supervisorId,
      expiresAt: Date.now() + result.expiresIn * 1000,
    }),
  )

  return result as RespuestaSesion
}

export async function llamarLaboresApi<T>(
  action: string,
  datos: Record<string, unknown> = {},
): Promise<T> {
  const token = localStorage.getItem('labores-session-token')

  if (!token) {
    throw new Error('No hay una sesión activa. Inicia sesión nuevamente.')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ action, ...datos }),
  })

  const result = await response.json()

  if (!response.ok || result.error || result.success === false) {
    throw new Error(
      result.error || 'Error al comunicarse con el servidor',
    )
  }

  return result as T
}

export async function listarSupervisores(): Promise<SupervisorRemoto[]> {
  const result = await llamarLaboresApi<{
    success: boolean
    supervisores: SupervisorRemoto[]
  }>('supervisores.list')

  return result.supervisores ?? []
}

export async function crearSupervisor(
  nombre: string,
  id?: string,
): Promise<SupervisorRemoto> {
  const result = await llamarLaboresApi<{
    success: boolean
    supervisor: SupervisorRemoto
  }>('supervisores.create', { nombre, id })

  return result.supervisor
}

export async function editarSupervisor(
  id: string,
  nombre: string,
): Promise<void> {
  await llamarLaboresApi('supervisores.update', { id, nombre })
}

export async function eliminarSupervisor(id: string): Promise<void> {
  await llamarLaboresApi('supervisores.delete', { id })
}

export function cerrarSesion() {
  localStorage.removeItem('labores-session-token')
  localStorage.removeItem('labores-session-info')
}
