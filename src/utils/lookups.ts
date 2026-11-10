
import type { AppData, LaborRecord } from '../types'

export function loteLabel(data: AppData, loteId: string): string {
  const lote = data.lotes.find((item) => item.id === loteId)

  if (!lote) return 'Lote no disponible'

  const variedad = lote.variedad ? ` ${lote.variedad}` : ''

  return `${lote.codigo} · ${lote.cultivo}${variedad}`
}

export function loteSubtitle(data: AppData, loteId: string): string {
  const lote = data.lotes.find((item) => item.id === loteId)

  if (!lote) return ''

  return [lote.cultivo, lote.variedad].filter(Boolean).join(' · ')
}

export function supervisorName(data: AppData, id: string): string {
  return (
    data.supervisores.find((item) => item.id === id)?.nombre ?? '—'
  )
}

export function laborName(data: AppData, id: string): string {
  return data.labores.find((item) => item.id === id)?.nombre ?? '—'
}

export function areaName(data: AppData, id: string): string {
  return data.areas.find((item) => item.id === id)?.nombre ?? '—'
}

export function normalizarNotacionLineas(texto: string): string {
  if (!texto.trim()) return ''

  const partes = texto
    .trim()
    .split(/[,;\s]+/)
    .filter(Boolean)

  const resultado: string[] = []

  for (const parte of partes) {
    const coincidencia = parte.match(/^(\d+)\s*-\s*(\d+)$/)

    if (coincidencia) {
      resultado.push(`${coincidencia[1]} - ${coincidencia[2]}`)
    } else {
      resultado.push(parte)
    }
  }

  return resultado.join(', ')
}

export function parsearLineas(
  lineas: string,
  _loteId: string,
): number[] {
  if (!lineas.trim()) return []

  const resultado = new Set<number>()

  const partes = lineas
    .trim()
    .split(/[,;\s]+/)
    .filter(Boolean)

  for (const parte of partes) {
    const rango = parte.match(/^(\d+)\s*-\s*(\d+)$/)

    if (rango) {
      const inicio = Number(rango[1])
      const fin = Number(rango[2])

      if (
        !Number.isInteger(inicio) ||
        !Number.isInteger(fin) ||
        inicio <= 0 ||
        fin < inicio
      ) {
        continue
      }

      for (let numero = inicio; numero <= fin; numero++) {
        resultado.add(numero)
      }

      continue
    }

    if (/^\d+$/.test(parte)) {
      const numero = Number(parte)

      if (numero > 0) {
        resultado.add(numero)
      }
    }
  }

  return Array.from(resultado).sort((a, b) => a - b)
}

/**
 * Obtiene el nombre exacto de la hoja Excel asociada al registro.
 */
function obtenerNombreHojaExcel(
  data: AppData,
  loteId: string,
): string | undefined {
  for (const documento of data.documentos) {
    const hoja = documento.lotes.find(
      (item) => `${documento.id}::${item.nombreHoja}` === loteId,
    )

    if (hoja) {
      return hoja.nombreHoja
    }
  }

  return undefined
}

export function resolveRecord(data: AppData, record: LaborRecord) {
  const nombreHojaExcel = obtenerNombreHojaExcel(data, record.loteId)

  const lote = data.lotes.find(
    (item) => item.id === record.loteId,
  )

  return {
    supervisor: supervisorName(data, record.supervisorId),

    // Primero utiliza el nombre exacto de la hoja Excel.
    // Si no es un lote importado desde Excel, utiliza el catálogo.
    loteCodigo: nombreHojaExcel ?? lote?.codigo ?? '—',

    loteCultivo: loteSubtitle(data, record.loteId),
    labor: laborName(data, record.laborId),
    area: areaName(data, record.areaId),
  }
}
