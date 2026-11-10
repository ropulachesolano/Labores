
import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Leaf,
  Settings2,
  BarChart3,
  LogOut,
} from 'lucide-react'

import { ConfiguracionTab } from './tabs/ConfiguracionTab'
import { RegistroTab } from './tabs/RegistroTab'
import { ResumenTab } from './tabs/ResumenTab'
import { LoginScreen } from './components/LoginScreen'

import { useApp } from './store/AppContext'
import {
  cerrarSesion,
  type TipoAcceso,
} from './lib/laboresApi'

import type { TabId } from './types'

export default function App() {
  const { appMode, setAppMode } = useApp()

  const [tab, setTab] = useState<TabId>('registro')
  const [comprobandoSesion, setComprobandoSesion] = useState(true)

  // Recuperar la sesión guardada en este dispositivo.
  useEffect(() => {
    try {
      const token = localStorage.getItem('labores-session-token')
      const sessionInfo = localStorage.getItem('labores-session-info')

      if (!token || !sessionInfo) {
        cerrarSesion()
        setAppMode({
          tipo: 'supervisor',
          supervisorId: undefined,
        })
        return
      }

      const sesion = JSON.parse(sessionInfo) as {
        role: TipoAcceso
        supervisorId: string | null
        expiresAt: number
      }

      if (
        !sesion.expiresAt ||
        sesion.expiresAt <= Date.now() ||
        !['administrador', 'supervisor'].includes(sesion.role) ||
        (sesion.role === 'supervisor' && !sesion.supervisorId)
      ) {
        cerrarSesion()
        setAppMode({
          tipo: 'supervisor',
          supervisorId: undefined,
        })
        return
      }

      setAppMode({
        tipo: sesion.role,
        supervisorId: sesion.supervisorId ?? undefined,
      })
    } catch {
      cerrarSesion()
      setAppMode({
        tipo: 'supervisor',
        supervisorId: undefined,
      })
    } finally {
      setComprobandoSesion(false)
    }
  }, [setAppMode])

  function handleLogin(tipo: TipoAcceso, supervisorId?: string) {
    setAppMode({
      tipo,
      supervisorId,
    })

    setTab('registro')
  }

  function handleLogout() {
    cerrarSesion()

    setAppMode({
      tipo: 'supervisor',
      supervisorId: undefined,
    })

    setTab('registro')
  }

  // Mientras se comprueba la sesión no mostrar la aplicación.
  if (comprobandoSesion) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100">
        <div className="text-center">
          <Leaf className="mx-auto mb-3 h-10 w-10 text-emerald-700" />
          <p className="text-sm font-medium text-stone-600">
            Comprobando acceso...
          </p>
        </div>
      </div>
    )
  }

  // Si no hay una sesión válida, mostrar el inicio de sesión.
  const token = localStorage.getItem('labores-session-token')

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const esAdministrador = appMode.tipo === 'administrador'

  // El supervisor no puede acceder a Configuración.
  const tabs: {
    id: TabId
    label: string
    icon: typeof ClipboardList
  }[] = [
    { id: 'registro', label: 'Registro', icon: ClipboardList },
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    ...(esAdministrador
      ? [{ id: 'config' as TabId, label: 'Configuración', icon: Settings2 }]
      : []),
  ]

  // Si el usuario deja de tener acceso a una pestaña,
  // volver automáticamente a Registro.
  const tabActual = tabs.some((item) => item.id === tab)
    ? tab
    : 'registro'

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-800">
      <header className="border-b border-emerald-900/20 bg-emerald-950 text-emerald-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700">
              <Leaf className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                Gestión de fundo
              </p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Control y Registro de Labores Agrícolas
              </h1>
              <p className="mt-1 text-xs text-emerald-300">
                {esAdministrador
                  ? 'Administrador'
                  : 'Supervisor'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        <nav
          className="mx-auto hidden max-w-6xl px-4 sm:block"
          aria-label="Pestañas principales"
        >
          <div className="flex gap-1 pb-px">
            {tabs.map((item) => {
              const Icon = item.icon
              const active = tabActual === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold ${
                    active
                      ? 'bg-stone-100 text-emerald-950'
                      : 'text-emerald-100 hover:bg-emerald-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 pb-24 sm:py-6 sm:pb-8">
        {tabActual === 'registro' && <RegistroTab />}
        {tabActual === 'resumen' && <ResumenTab />}
        {tabActual === 'config' && esAdministrador && (
          <ConfiguracionTab />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden"
        aria-label="Navegación móvil"
      >
        <div className={`grid ${tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {tabs.map((item) => {
            const Icon = item.icon
            const active = tabActual === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active
                    ? 'text-emerald-800'
                    : 'text-stone-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
