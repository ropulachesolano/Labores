
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { DEFAULT_DATA } from '../data/defaults'

import {
  listarSupervisores,
  crearSupervisor,
  editarSupervisor,
  eliminarSupervisor,
} from '../lib/laboresApi'

import type {
  AppData,
  AreaItem,
  CatalogKey,
  DocumentoExcel,
  LaborRecord,
  LaborTipo,
  Lote,
  ProgramacionEntry,
  Supervisor,
  AppMode,
} from '../types'

const STORAGE_KEY = 'labores-app-v2'

interface AppContextValue {
  data: AppData
  appMode: AppMode
  setAppMode: (mode: AppMode) => void

  addRecord: (record: Omit<LaborRecord, 'id'>) => void

  addLote: (lote: Omit<Lote, 'id'>) => void
  updateLote: (id: string, lote: Omit<Lote, 'id'>) => void
  removeLote: (id: string) => boolean

  addLabor: (labor: Omit<LaborTipo, 'id'>) => void
  updateLabor: (id: string, labor: Omit<LaborTipo, 'id'>) => void
  removeLabor: (id: string) => boolean

  addArea: (area: Omit<AreaItem, 'id'>) => void
  updateArea: (id: string, area: Omit<AreaItem, 'id'>) => void
  removeArea: (id: string) => boolean

  addSupervisor: (supervisor: Omit<Supervisor, 'id'>) => void
  updateSupervisor: (id: string, supervisor: Omit<Supervisor, 'id'>) => void
  removeSupervisor: (id: string) => boolean

  addCustomField: (catalog: CatalogKey, label: string) => void
  removeCustomField: (id: string) => void

  addDocumento: (documento: DocumentoExcel) => void
  removeDocumento: (id: string) => boolean

  addProgramacion: (programacion: Omit<ProgramacionEntry, 'id'>) => void
  updateProgramacion: (
    id: string,
    programacion: Omit<ProgramacionEntry, 'id'>,
  ) => void
  removeProgramacion: (id: string) => boolean
}

interface StoredAppState {
  data: AppData
  appMode: AppMode
}

const AppContext = createContext<AppContextValue | null>(null)

function nid(): string {
  return crypto.randomUUID()
}

function defaultAppMode(): AppMode {
  return {
    tipo: 'supervisor',
    supervisorId: undefined,
  }
}

function loadStoredState(): StoredAppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return {
        data: structuredClone(DEFAULT_DATA),
        appMode: defaultAppMode(),
      }
    }

    const parsed = JSON.parse(raw)
    const savedData = parsed.data ?? parsed

    const data: AppData = {
      areas: Array.isArray(savedData.areas)
        ? savedData.areas
        : structuredClone(DEFAULT_DATA.areas),

      lotes: Array.isArray(savedData.lotes)
        ? savedData.lotes
        : structuredClone(DEFAULT_DATA.lotes),

      labores: Array.isArray(savedData.labores)
        ? savedData.labores
        : structuredClone(DEFAULT_DATA.labores),

      supervisores: Array.isArray(savedData.supervisores)
        ? savedData.supervisores
        : structuredClone(DEFAULT_DATA.supervisores),

      customFields: Array.isArray(savedData.customFields)
        ? savedData.customFields
        : structuredClone(DEFAULT_DATA.customFields),

      records: Array.isArray(savedData.records)
        ? savedData.records
        : structuredClone(DEFAULT_DATA.records),

      documentos: Array.isArray(savedData.documentos)
        ? savedData.documentos
        : structuredClone(DEFAULT_DATA.documentos),

      programaciones: Array.isArray(savedData.programaciones)
        ? savedData.programaciones
        : structuredClone(DEFAULT_DATA.programaciones),
    }

    const appMode: AppMode = {
      tipo: 'supervisor',
      supervisorId: undefined,
    }

    return { data, appMode }
  } catch (error) {
    console.error('Error al cargar los datos guardados:', error)

    return {
      data: structuredClone(DEFAULT_DATA),
      appMode: defaultAppMode(),
    }
  }
}

function tieneSesionAdministrador(): boolean {
  try {
    const token = localStorage.getItem('labores-session-token')
    const raw = localStorage.getItem('labores-session-info')

    if (!token || !raw) return false

    const session = JSON.parse(raw)

    return (
      session.role === 'administrador' &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Date.now()
    )
  } catch {
    return false
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(loadStoredState)

  const [data, setData] = useState<AppData>(initialState.data)
  const [appMode, setAppMode] = useState<AppMode>(initialState.appMode)

  const sincronizacionIniciada = useRef(false)

  // Guardar los datos locales.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data,
          appMode,
        }),
      )
    } catch (error) {
      console.error('Error al guardar los datos:', error)
    }
  }, [data, appMode])

  // Sincronizar supervisores con Supabase al entrar como administrador.
  useEffect(() => {
    if (
      appMode.tipo !== 'administrador' ||
      !tieneSesionAdministrador()
    ) {
      sincronizacionIniciada.current = false
      return
    }

    if (sincronizacionIniciada.current) return

    sincronizacionIniciada.current = true

    async function sincronizar() {
      try {
        // Obtener supervisores de la nube.
        const remotos = await listarSupervisores()

        const idsRemotos = new Set(
          remotos.map((item) => item.id),
        )

        // Migrar los supervisores locales que todavía no existen en la nube.
        for (const local of data.supervisores) {
          if (!idsRemotos.has(local.id)) {
            await crearSupervisor(local.nombre, local.id)
          }
        }

        // Consultar nuevamente la lista definitiva.
        const actualizados = await listarSupervisores()

        setData((prev) => {
          const localesPorId = new Map(
            prev.supervisores.map((item) => [item.id, item]),
          )

          const supervisores: Supervisor[] = actualizados.map(
            (remoto) => {
              const local = localesPorId.get(remoto.id)

              return {
                id: remoto.id,
                nombre: remoto.nombre,
                extras: local?.extras ?? {},
              }
            },
          )

          return {
            ...prev,
            supervisores,
          }
        })

        console.info('Supervisores sincronizados con Supabase')
      } catch (error) {
        sincronizacionIniciada.current = false

        console.error(
          'Error al sincronizar supervisores:',
          error,
        )

        window.alert(
          error instanceof Error
            ? `No se pudieron sincronizar los supervisores: ${error.message}`
            : 'No se pudieron sincronizar los supervisores.',
        )
      }
    }

    void sincronizar()
  }, [appMode.tipo, data.supervisores])

  const value = useMemo<AppContextValue>(() => {
    const used = (predicate: (record: LaborRecord) => boolean) =>
      data.records.some(predicate)

    return {
      data,
      appMode,
      setAppMode,

      // REGISTROS
      addRecord: (record) => {
        setData((prev) => ({
          ...prev,
          records: [
            { ...record, id: nid() },
            ...prev.records,
          ],
        }))
      },

      // LOTES
      addLote: (lote) => {
        setData((prev) => ({
          ...prev,
          lotes: [...prev.lotes, { ...lote, id: nid() }],
        }))
      },

      updateLote: (id, lote) => {
        setData((prev) => ({
          ...prev,
          lotes: prev.lotes.map((item) =>
            item.id === id ? { ...lote, id } : item,
          ),
        }))
      },

      removeLote: (id) => {
        if (used((record) => record.loteId === id)) {
          return false
        }

        setData((prev) => ({
          ...prev,
          lotes: prev.lotes.filter((item) => item.id !== id),
        }))

        return true
      },

      // LABORES
      addLabor: (labor) => {
        setData((prev) => ({
          ...prev,
          labores: [...prev.labores, { ...labor, id: nid() }],
        }))
      },

      updateLabor: (id, labor) => {
        setData((prev) => ({
          ...prev,
          labores: prev.labores.map((item) =>
            item.id === id ? { ...labor, id } : item,
          ),
        }))
      },

      removeLabor: (id) => {
        if (used((record) => record.laborId === id)) {
          return false
        }

        setData((prev) => ({
          ...prev,
          labores: prev.labores.filter((item) => item.id !== id),
        }))

        return true
      },

      // ÁREAS
      addArea: (area) => {
        setData((prev) => ({
          ...prev,
          areas: [...prev.areas, { ...area, id: nid() }],
        }))
      },

      updateArea: (id, area) => {
        setData((prev) => ({
          ...prev,
          areas: prev.areas.map((item) =>
            item.id === id ? { ...area, id } : item,
          ),
        }))
      },

      removeArea: (id) => {
        const tieneRegistros = used(
          (record) => record.areaId === id,
        )

        const tieneLabores = data.labores.some(
          (labor) => labor.areaId === id,
        )

        if (tieneRegistros || tieneLabores) return false

        setData((prev) => ({
          ...prev,
          areas: prev.areas.filter((item) => item.id !== id),
        }))

        return true
      },

      // SUPERVISORES
      addSupervisor: (supervisor) => {
        if (!tieneSesionAdministrador()) {
          window.alert('Debes iniciar sesión como administrador.')
          return
        }

        void crearSupervisor(supervisor.nombre).then((remoto) => {
          setData((prev) => ({
            ...prev,
            supervisores: [
              ...prev.supervisores,
              {
                ...supervisor,
                id: remoto.id,
                nombre: remoto.nombre,
              },
            ],
          }))
        }).catch((error) => {
          console.error('Error agregando supervisor:', error)
          window.alert(
            error instanceof Error
              ? error.message
              : 'No se pudo agregar el supervisor en Supabase.',
          )
        })
      },

      updateSupervisor: (id, supervisor) => {
        if (!tieneSesionAdministrador()) {
          window.alert('Debes iniciar sesión como administrador.')
          return
        }

        void editarSupervisor(id, supervisor.nombre).then(() => {
          setData((prev) => ({
            ...prev,
            supervisores: prev.supervisores.map((item) =>
              item.id === id ? { ...supervisor, id } : item,
            ),
          }))
        }).catch((error) => {
          console.error('Error modificando supervisor:', error)
          window.alert(
            error instanceof Error
              ? error.message
              : 'No se pudo modificar el supervisor.',
          )
        })
      },

      removeSupervisor: (id) => {
        if (used((record) => record.supervisorId === id)) {
          return false
        }

        if (!tieneSesionAdministrador()) {
          window.alert('Debes iniciar sesión como administrador.')
          return false
        }

        void eliminarSupervisor(id).then(() => {
          setData((prev) => ({
            ...prev,
            supervisores: prev.supervisores.filter(
              (item) => item.id !== id,
            ),
          }))
        }).catch((error) => {
          console.error('Error eliminando supervisor:', error)
          window.alert(
            error instanceof Error
              ? error.message
              : 'No se pudo eliminar el supervisor.',
          )
        })

        return true
      },

      // CAMPOS PERSONALIZADOS
      addCustomField: (catalog, label) => {
        const trimmed = label.trim()

        if (!trimmed) return

        setData((prev) => ({
          ...prev,
          customFields: [
            ...prev.customFields,
            {
              id: nid(),
              catalog,
              label: trimmed,
            },
          ],
        }))
      },

      removeCustomField: (id) => {
        const field = data.customFields.find(
          (item) => item.id === id,
        )

        if (!field) return

        setData((prev) => {
          const strip = (extras: Record<string, string>) => {
            const next = { ...extras }
            delete next[field.id]
            return next
          }

          return {
            ...prev,

            customFields: prev.customFields.filter(
              (item) => item.id !== id,
            ),

            lotes:
              field.catalog === 'lotes'
                ? prev.lotes.map((item) => ({
                    ...item,
                    extras: strip(item.extras),
                  }))
                : prev.lotes,

            labores:
              field.catalog === 'labores'
                ? prev.labores.map((item) => ({
                    ...item,
                    extras: strip(item.extras),
                  }))
                : prev.labores,

            areas:
              field.catalog === 'areas'
                ? prev.areas.map((item) => ({
                    ...item,
                    extras: strip(item.extras),
                  }))
                : prev.areas,

            supervisores:
              field.catalog === 'supervisores'
                ? prev.supervisores.map((item) => ({
                    ...item,
                    extras: strip(item.extras),
                  }))
                : prev.supervisores,
          }
        })
      },

      // DOCUMENTOS EXCEL
      addDocumento: (documento) => {
        setData((prev) => ({
          ...prev,
          documentos: [...prev.documentos, documento],
        }))
      },

      removeDocumento: (id) => {
        setData((prev) => ({
          ...prev,
          documentos: prev.documentos.filter(
            (item) => item.id !== id,
          ),
        }))

        return true
      },

      // PROGRAMACIONES
      addProgramacion: (programacion) => {
        setData((prev) => ({
          ...prev,
          programaciones: [
            ...prev.programaciones,
            { ...programacion, id: nid() },
          ],
        }))
      },

      updateProgramacion: (id, programacion) => {
        setData((prev) => ({
          ...prev,
          programaciones: prev.programaciones.map((item) =>
            item.id === id
              ? { ...programacion, id }
              : item,
          ),
        }))
      },

      removeProgramacion: (id) => {
        setData((prev) => ({
          ...prev,
          programaciones: prev.programaciones.filter(
            (item) => item.id !== id,
          ),
        }))

        return true
      },
    }
  }, [data, appMode])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)

  if (!ctx) {
    throw new Error('useApp debe usarse dentro de AppProvider')
  }

  return ctx
}
