import type { AdaptiveSummary, LaborRecord } from '../types'

export function summarizeRecords(records: LaborRecord[]): AdaptiveSummary {
  return records.reduce<AdaptiveSummary>(
    (acc, record) => {
      if (record.unidad === 'Grupos') {
        acc.grupos += record.cantidad
      } else {
        acc.personal += record.cantidad
      }
      acc.registros += 1
      return acc
    },
    { grupos: 0, personal: 0, registros: 0 },
  )
}

export function formatUnidad(cantidad: number, unidad: LaborRecord['unidad']): string {
  if (unidad === 'Grupos') {
    return `${cantidad} ${cantidad === 1 ? 'Grupo' : 'Grupos'}`
  }
  return `${cantidad} ${cantidad === 1 ? 'Jornal' : 'Jornales'}`
}
