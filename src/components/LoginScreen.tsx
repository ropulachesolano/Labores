
import { useEffect, useState, type FormEvent } from 'react'
import { Leaf, LockKeyhole } from 'lucide-react'
import { iniciarSesion, type TipoAcceso } from '../lib/laboresApi'

interface Supervisor {
  id: string
  nombre: string
}

interface Props {
  onLogin: (tipo: TipoAcceso, supervisorId?: string) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [tipo, setTipo] = useState<TipoAcceso>('supervisor')
  const [password, setPassword] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoSupervisores, setCargandoSupervisores] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarSupervisores() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clever-service`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              action: 'supervisores.list',
            }),
          },
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || 'No se pudo cargar la lista de supervisores',
          )
        }

        setSupervisores(result.supervisores || [])
      } catch (error) {
        console.error('Error cargando supervisores:', error)
        setError('No se pudo cargar la lista de supervisores.')
      } finally {
        setCargandoSupervisores(false)
      }
    }

    cargarSupervisores()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (tipo === 'supervisor' && !supervisorId) {
      setError('Selecciona tu nombre.')
      return
    }

    setCargando(true)

    try {
      await iniciarSesion(password, tipo, supervisorId || undefined)

      onLogin(
        tipo,
        tipo === 'supervisor' ? supervisorId : undefined,
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión.',
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-800 text-white">
            <Leaf className="h-7 w-7" />
          </span>

          <h1 className="mt-4 text-xl font-bold text-stone-900">
            Control de Labores
          </h1>

          <p className="mt-1 text-sm text-stone-500">
            Gestión de fundo agrícola
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setTipo('supervisor')
              setError('')
            }}
            className={`rounded-xl border p-3 text-sm font-semibold ${
              tipo === 'supervisor'
                ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 text-stone-600'
            }`}
          >
            Supervisor
          </button>

          <button
            type="button"
            onClick={() => {
              setTipo('administrador')
              setError('')
            }}
            className={`rounded-xl border p-3 text-sm font-semibold ${
              tipo === 'administrador'
                ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 text-stone-600'
            }`}
          >
            Administrador
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tipo === 'supervisor' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Selecciona tu nombre
              </label>

              <select
                value={supervisorId}
                onChange={(event) => setSupervisorId(event.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-emerald-700"
                required
                disabled={cargandoSupervisores}
              >
                <option value="">
                  {cargandoSupervisores
                    ? 'Cargando supervisores...'
                    : 'Seleccionar supervisor'}
                </option>

                {supervisores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>

              {!cargandoSupervisores && supervisores.length === 0 && (
                <p className="mt-2 text-xs text-stone-500">
                  No hay supervisores registrados.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Clave de acceso
            </label>

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-stone-400" />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu clave"
                className="w-full rounded-xl border border-stone-300 py-3 pl-10 pr-3 outline-none focus:border-emerald-700"
                required
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              cargando ||
              (tipo === 'supervisor' &&
                (cargandoSupervisores || supervisores.length === 0))
            }
            className="w-full rounded-xl bg-emerald-800 py-3 font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
