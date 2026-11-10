
export const UNIDADES = ['Grupos', 'Personal'] as const
export type Unidad = (typeof UNIDADES)[number]

export type CatalogKey =
  | 'lotes'
  | 'labores'
  | 'areas'
  | 'supervisores'
  | 'documentos'

export type Area = 'Campo' | 'Sanidad' | 'Riego' | 'Postcosecha'

export const AREAS: Area[] = ['Campo', 'Sanidad', 'Riego', 'Postcosecha']

export interface DocumentoExcel {
  id: string
  nombreArchivo: string
  fechaImportacion: string
  usuario: string
  estado: 'pendiente' | 'importado' | 'actualizado' | 'error'
  hojasProcesadas: number
  lotesDetectados: number
  sublotesDetectados: number

  metadatos: {
    variedad?: string
    plantasPorHectarea?: number
    area?: number
    tancada?: number
    areasSublote?: Record<string, number>
  }

  lotes: {
    nombreHoja: string

    // Densidad de plantas correspondiente a esta hoja específica.
    plantasPorHectarea?: number

    sublotes: {
      nombre: string
      columna: string
      lineas: number
      plantas?: number

      // Detalle de plantas por cada número de línea del Excel.
      lineasDetalle?: {
        numero: number
        plantas: number
      }[]
    }[]
  }[]
}

export type TabId = 'registro' | 'resumen' | 'config'

export interface CustomField {
  id: string
  catalog: CatalogKey
  label: string
}

export interface AreaItem {
  id: string
  nombre: string
  extras: Record<string, string>
}

export interface Supervisor {
  id: string
  nombre: string
  extras: Record<string, string>
}

export interface Lote {
  id: string
  codigo: string
  cultivo: string
  variedad: string
  hectareas: number
  extras: Record<string, string>
}

export interface LaborTipo {
  id: string
  nombre: string
  areaId: string
  extras: Record<string, string>
}

/**
 * Registro de labores realizadas.
 * Los nuevos campos son opcionales para mantener
 * la compatibilidad con registros antiguos.
 */
export interface LaborRecord {
  id: string
  fecha: string
  supervisorId: string
  loteId: string
  laborId: string
  descripcion: string
  areaId: string
  cantidad: number
  unidad: Unidad

  // Datos del registro de supervisores.
  subloteId?: string
  subloteNombre?: string
  lineas?: number[]
  lineasTexto?: string
  plantasTrabajadas?: number
  hectareasTrabajadas?: number
}

export interface AdaptiveSummary {
  grupos: number
  personal: number
  registros: number
}

export interface AppData {
  areas: AreaItem[]
  lotes: Lote[]
  labores: LaborTipo[]
  supervisores: Supervisor[]
  customFields: CustomField[]
  records: LaborRecord[]
  documentos: DocumentoExcel[]
  programaciones: ProgramacionEntry[]
}

export interface AppMode {
  tipo: 'administrador' | 'supervisor'
  supervisorId?: string
}

export interface ProgramacionSupervisor {
  supervisorId: string
  nombre: string
  grupos: number
}

export interface ProgramacionEntry {
  id: string
  fecha: string
  loteId: string
  laborId: string
  areaId: string
  supervisores: ProgramacionSupervisor[]
  totalGrupos: number
  descripcionLote: string
}
