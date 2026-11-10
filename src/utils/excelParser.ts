
import * as XLSX from 'xlsx'
import type { DocumentoExcel } from '../types'

type FilaExcel = unknown[]
type LoteExcel = DocumentoExcel['lotes'][number]

type LineaDetalle = {
  numero: number
  plantas: number
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function convertirNumero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') {
    return undefined
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : undefined
  }

  const texto = String(valor)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')

  if (!texto) return undefined

  const numero = Number(texto)

  return Number.isFinite(numero) ? numero : undefined
}

function generarId(): string {
  return typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Reconoce encabezados como:
 * 121
 * 121 A
 * 121 B
 * 121 C
 * 121 BC
 * 121 ABC
 * 121 S/D
 */
function esEncabezadoSublote(valor: unknown): boolean {
  const nombre = normalizarTexto(valor)

  if (!nombre || nombre === 'LINEA') {
    return false
  }

  const coincidencia = nombre.match(/^(\d+)(.*)$/)

  if (!coincidencia) {
    return false
  }

  const sufijo = coincidencia[2].trim()

  // También admite el nombre del lote sin sufijo.
  if (!sufijo) {
    return true
  }

  // El sufijo solo puede contener letras, espacios,
  // guiones o barras.
  return /^[A-Z]+(?:[\s/-]*[A-Z]+)*$/.test(sufijo)
}

/**
 * Lee la densidad desde AB3.
 */
function leerPlantasPorHectarea(
  worksheet: XLSX.WorkSheet,
): number {
  const celda = worksheet['AB3'] as XLSX.CellObject | undefined

  if (!celda) {
    console.warn('Excel: no se encontró la celda AB3')
    return 0
  }

  const valor = convertirNumero(celda.v ?? celda.w)

  console.log('Densidad AB3:', {
    valor: celda.v,
    texto: celda.w,
    resultado: valor,
  })

  return valor !== undefined && valor > 0 ? valor : 0
}

/**
 * Analiza una hoja del Excel.
 */
function analizarHoja(
  nombreHoja: string,
  worksheet: XLSX.WorkSheet,
): LoteExcel {
  console.log('================================')
  console.log('PROCESANDO LOTE:', nombreHoja)
  console.log('RANGO:', worksheet['!ref'])

  const plantasPorHectarea = leerPlantasPorHectarea(worksheet)

  const rows = XLSX.utils.sheet_to_json<FilaExcel>(worksheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: true,
  })

  // Buscar la fila que contiene LINEA.
  const filaEncabezado = rows.findIndex((fila) =>
    fila.some((celda) => normalizarTexto(celda) === 'LINEA'),
  )

  if (filaEncabezado === -1) {
    console.warn('No se encontró LINEA en:', nombreHoja)

    return {
      nombreHoja,
      plantasPorHectarea,
      sublotes: [],
    }
  }

  const encabezados = rows[filaEncabezado]

  const columnaLinea = encabezados.findIndex(
    (celda) => normalizarTexto(celda) === 'LINEA',
  )

  console.log('FILA DE ENCABEZADOS:', filaEncabezado + 1)
  console.log('ENCABEZADOS:', encabezados)

  const sublotes: LoteExcel['sublotes'] = []

  // Recorrer todas las columnas posteriores a LINEA.
  for (
    let columna = columnaLinea + 1;
    columna < encabezados.length;
    columna++
  ) {
    const encabezado = encabezados[columna]
    const nombre = normalizarTexto(encabezado)

    if (!esEncabezadoSublote(nombre)) {
      continue
    }

    const lineasDetalle: LineaDetalle[] = []

    // Recorrer todas las filas, incluso cuando las primeras
    // filas de una columna estén vacías.
    for (
      let indiceFila = filaEncabezado + 1;
      indiceFila < rows.length;
      indiceFila++
    ) {
      const fila = rows[indiceFila]

      const numeroLinea = convertirNumero(fila[columnaLinea])
      const plantas = convertirNumero(fila[columna])

      if (
        numeroLinea === undefined ||
        !Number.isInteger(numeroLinea) ||
        numeroLinea <= 0 ||
        plantas === undefined
      ) {
        continue
      }

      lineasDetalle.push({
        numero: numeroLinea,
        plantas,
      })
    }

    // Si no tiene datos en ninguna línea, no se incorpora.
    if (lineasDetalle.length === 0) {
      console.warn(
        `Sublote ${nombre}: no tiene datos numéricos en toda la hoja.`,
      )
      continue
    }

    const totalPlantas = lineasDetalle.reduce(
      (total, linea) => total + linea.plantas,
      0,
    )

    const sublote = {
      nombre,
      columna: XLSX.utils.encode_col(columna),
      lineas: lineasDetalle.length,
      plantas: totalPlantas,
      lineasDetalle,
    }

    sublotes.push(sublote)

    console.log('SUBLOTE RECONOCIDO:', {
      nombre,
      columna: sublote.columna,
      primeraLinea: lineasDetalle[0]?.numero,
      ultimaLinea: lineasDetalle[lineasDetalle.length - 1]?.numero,
      cantidadLineas: lineasDetalle.length,
      totalPlantas,
    })
  }

  console.log('RESULTADO DEL LOTE:', nombreHoja)
  console.log('TOTAL SUBLOTES:', sublotes.length)
  console.table(
    sublotes.map((sublote) => ({
      sublote: sublote.nombre,
      columna: sublote.columna,
      lineas: sublote.lineas,
      plantas: sublote.plantas,
    })),
  )

  return {
    nombreHoja,
    plantasPorHectarea,
    sublotes,
  }
}

/**
 * Convierte el libro Excel completo en DocumentoExcel.
 */
export function parsearWorkbook(
  workbook: XLSX.WorkBook,
  nombreArchivo = 'Workbook procesado',
): DocumentoExcel {
  console.log('INICIO DEL PROCESAMIENTO DEL EXCEL')
  console.log('ARCHIVO:', nombreArchivo)
  console.log('HOJAS:', workbook.SheetNames)

  const lotes: LoteExcel[] = workbook.SheetNames.map((nombreHoja) => {
    const worksheet = workbook.Sheets[nombreHoja]

    return analizarHoja(nombreHoja, worksheet)
  })

  const sublotesDetectados = lotes.reduce(
    (total, lote) => total + lote.sublotes.length,
    0,
  )

  const lotesDetectados = lotes.filter(
    (lote) => lote.sublotes.length > 0,
  ).length

  const primeraDensidadValida = lotes.find(
    (lote) =>
      lote.plantasPorHectarea !== undefined &&
      lote.plantasPorHectarea > 0,
  )?.plantasPorHectarea

  const documento: DocumentoExcel = {
    id: generarId(),
    nombreArchivo,
    fechaImportacion: new Date().toISOString(),
    usuario: 'Usuario actual',
    estado: 'importado',
    hojasProcesadas: workbook.SheetNames.length,
    lotesDetectados,
    sublotesDetectados,
    metadatos: {
      plantasPorHectarea: primeraDensidadValida ?? 0,
      area: 0,
      tancada: 2000,
    },
    lotes,
  }

  console.log('DOCUMENTO EXCEL GENERADO:', documento)

  return documento
}

/**
 * Lee el archivo seleccionado desde la interfaz.
 */
export async function leerArchivoExcel(
  file: File,
): Promise<{
  success: boolean
  data?: DocumentoExcel
  error?: string
}> {
  console.log('INICIANDO LECTURA:', file.name)

  try {
    const arrayBuffer = await file.arrayBuffer()

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellFormula: true,
      cellNF: true,
      cellText: true,
    })

    console.log('ARCHIVO LEÍDO:', workbook.SheetNames)

    const documento = parsearWorkbook(workbook, file.name)

    if (documento.lotes.length === 0) {
      return {
        success: false,
        error: 'El archivo Excel no contiene hojas para procesar.',
      }
    }

    if (documento.sublotesDetectados === 0) {
      console.warn('No se detectaron sublotes.')
    }

    return {
      success: true,
      data: documento,
    }
  } catch (error) {
    console.error('ERROR AL PROCESAR EXCEL:', error)

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo Excel.',
    }
  }
}
