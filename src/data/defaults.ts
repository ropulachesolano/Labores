
import type { AppData } from '../types'

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`
}

export const DEFAULT_DATA: AppData = {
  areas: [
    { id: id('area', 1), nombre: 'Campo', extras: {} },
    { id: id('area', 2), nombre: 'Sanidad', extras: {} },
    { id: id('area', 3), nombre: 'Riego', extras: {} },
    { id: id('area', 4), nombre: 'Postcosecha', extras: {} },
  ],

  labores: [
    { id: id('lab', 1), nombre: 'Cosecha', areaId: 'area-1', extras: {} },
    { id: id('lab', 2), nombre: 'Raleo', areaId: 'area-1', extras: {} },
    { id: id('lab', 3), nombre: 'Deshierbo', areaId: 'area-1', extras: {} },
    { id: id('lab', 4), nombre: 'Aplicación de fungicida', areaId: 'area-2', extras: {} },
    { id: id('lab', 5), nombre: 'Monitoreo de plagas', areaId: 'area-2', extras: {} },
    { id: id('lab', 6), nombre: 'Riego por goteo', areaId: 'area-3', extras: {} },
    { id: id('lab', 7), nombre: 'Fertirriego', areaId: 'area-3', extras: {} },
    { id: id('lab', 8), nombre: 'Selección y embalaje', areaId: 'area-4', extras: {} },
  ],

  lotes: [],
  supervisores: [],
  customFields: [],
  records: [],
  documentos: [],
  programaciones: [],
}
