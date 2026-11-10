
import { useMemo, useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { LaborRecord } from '../types'
import { Field, Select, fieldClass } from './ui'

interface NewRecordFormProps {
  open: boolean
  fecha: string
  onClose: () => void
  onSubmit: (record: Omit<LaborRecord, 'id'>) => void
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/^LOTE\s*/, '')
    .replace(/[^A-Z0-9]/g, '')
}

function obtenerIdSublote(
  documentoId: string,
  nombreHoja: string,
  nombreSublote: string,
): string {
  return `${documentoId}::${nombreHoja}::${nombreSublote}`
}

function obtenerIdHoja(
  documentoId: string,
  nombreHoja: string,
): string {
  return `${documentoId}::${nombreHoja}`
}

function convertirLineas(texto: string): {
  lineas: number[]
  error: string
} {
  if (!texto.trim()) {
    return { lineas: [], error: 'Ingresa las líneas trabajadas.' }
  }

  const resultado = new Set<number>()

  for (const parteOriginal of texto.split(',')) {
    const parte = parteOriginal.trim()

    if (!parte) {
      return { lineas: [], error: 'Revisa la notación de líneas.' }
    }

    const rango = parte.match(/^(\d+)\s*-\s*(\d+)$/)

    if (rango) {
      const inicio = Number(rango[1])
      const fin = Number(rango[2])

      if (inicio <= 0 || fin < inicio) {
        return {
          lineas: [],
          error: `El rango "${parte}" no es válido.`,
        }
      }

      if (fin - inicio > 5000) {
        return {
          lineas: [],
          error: 'El rango ingresado es demasiado grande.',
        }
      }

      for (let numero = inicio; numero <= fin; numero++) {
        resultado.add(numero)
      }

      continue
    }

    if (!/^\d+$/.test(parte) || Number(parte) <= 0) {
      return {
        lineas: [],
        error: `La línea "${parte}" no tiene un formato válido.`,
      }
    }

    resultado.add(Number(parte))
  }

  return {
    lineas: Array.from(resultado).sort((a, b) => a - b),
    error: '',
  }
}

export function NewRecordForm({
  open,
  fecha,
  onClose,
  onSubmit,
}: NewRecordFormProps) {
  const { data } = useApp()

  const [supervisorId, setSupervisorId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [subloteId, setSubloteId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [laborId, setLaborId] = useState('')
  const [lineasTexto, setLineasTexto] = useState('')

  // Cada hoja importada representa un lote acumulado.
  // Si una hoja aparece en varias importaciones, se utiliza
  // la versión de la importación más reciente.
  const hojasDisponibles = useMemo(() => {
    const documentosOrdenados = [...data.documentos].sort(
      (a, b) =>
        new Date(b.fechaImportacion).getTime() -
        new Date(a.fechaImportacion).getTime(),
    )

    const hojas: {
      id: string
      documento: (typeof documentosOrdenados)[number]
      hoja: (typeof documentosOrdenados)[number]['lotes'][number]
    }[] = []

    const nombresIncluidos = new Set<string>()

    for (const documento of documentosOrdenados) {
      for (const hoja of documento.lotes) {
        const nombreNormalizado = normalizarTexto(hoja.nombreHoja)

        if (!nombreNormalizado || nombresIncluidos.has(nombreNormalizado)) {
          continue
        }

        nombresIncluidos.add(nombreNormalizado)

        hojas.push({
          id: obtenerIdHoja(documento.id, hoja.nombreHoja),
          documento,
          hoja,
        })
      }
    }

    return hojas
  }, [data.documentos])

  const hojaExcel = useMemo(
    () => hojasDisponibles.find((item) => item.id === loteId) ?? null,
    [hojasDisponibles, loteId],
  )

  // Los sublotes proceden de las columnas B, C, D, E...
  // El parser debe entregar cada encabezado como nombre
  // y conservar su columna y detalle de plantas por línea.
  const sublotesDisponibles = hojaExcel?.hoja.sublotes ?? []

  const subloteSeleccionado = useMemo(
    () =>
      sublotesDisponibles.find(
        (sublote) =>
          hojaExcel &&
          obtenerIdSublote(
            hojaExcel.documento.id,
            hojaExcel.hoja.nombreHoja,
            sublote.nombre,
          ) === subloteId,
      ),
    [sublotesDisponibles, hojaExcel, subloteId],
  )

  const densidad = Number(
    hojaExcel?.hoja.plantasPorHectarea ?? 0,
  )

  const labores = useMemo(
    () =>
      data.labores.filter(
        (labor) => !areaId || labor.areaId === areaId,
      ),
    [data.labores, areaId],
  )

  const resultadoLineas = useMemo(
    () => convertirLineas(lineasTexto),
    [lineasTexto],
  )

  const calculo = useMemo(() => {
    if (!subloteSeleccionado || resultadoLineas.error) {
      return {
        plantas: 0,
        hectareas: 0,
        lineasNoEncontradas: [] as number[],
      }
    }

    const detalle = subloteSeleccionado.lineasDetalle ?? []

    const lineasDisponibles = new Set(
      detalle.map((linea) => Number(linea.numero)),
    )

    const lineasNoEncontradas = resultadoLineas.lineas.filter(
      (numero) => !lineasDisponibles.has(numero),
    )

    const plantas = resultadoLineas.lineas.reduce(
      (total, numero) => {
        const linea = detalle.find(
          (item) => Number(item.numero) === numero,
        )

        return total + (Number(linea?.plantas) || 0)
      },
      0,
    )

    return {
      plantas,
      hectareas:
        densidad > 0 && lineasNoEncontradas.length === 0
          ? plantas / densidad
          : 0,
      lineasNoEncontradas,
    }
  }, [subloteSeleccionado, resultadoLineas, densidad])

  const puedeGuardar =
    hojasDisponibles.length > 0 &&
    data.supervisores.length > 0 &&
    data.labores.length > 0 &&
    Boolean(supervisorId) &&
    Boolean(loteId) &&
    Boolean(subloteSeleccionado) &&
    Boolean(laborId) &&
    Boolean(areaId) &&
    resultadoLineas.lineas.length > 0 &&
    !resultadoLineas.error &&
    calculo.lineasNoEncontradas.length === 0 &&
    calculo.plantas > 0 &&
    densidad > 0

  const handleLote = (nextLoteId: string) => {
    setLoteId(nextLoteId)
    setSubloteId('')
    setLineasTexto('')
  }

  const handleArea = (nextAreaId: string) => {
    setAreaId(nextAreaId)

    const primeraLabor = data.labores.find(
      (labor) => labor.areaId === nextAreaId,
    )

    setLaborId(primeraLabor?.id ?? '')
  }

  const handleLabor = (nextLaborId: string) => {
    setLaborId(nextLaborId)

    const labor = data.labores.find(
      (item) => item.id === nextLaborId,
    )

    if (labor) {
      setAreaId(labor.areaId)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!puedeGuardar || !subloteSeleccionado || !hojaExcel) {
      return
    }

    const labor = data.labores.find(
      (item) => item.id === laborId,
    )

    if (!labor) return

    const idGenerado = obtenerIdSublote(
      hojaExcel.documento.id,
      hojaExcel.hoja.nombreHoja,
      subloteSeleccionado.nombre,
    )

    const record: Omit<LaborRecord, 'id'> = {
      fecha,
      supervisorId,

      // Identificador de la hoja Excel seleccionada.
      // La lectura del nombre se ajustará también en la tabla.
      loteId: hojaExcel.id,

      laborId: labor.id,
      descripcion: `Líneas trabajadas: ${lineasTexto.trim()}`,
      areaId: labor.areaId,
      cantidad: 1,
      unidad: 'Grupos',

      subloteId: idGenerado,
      subloteNombre: subloteSeleccionado.nombre,
      lineas: resultadoLineas.lineas,
      lineasTexto: lineasTexto.trim(),
      plantasTrabajadas: calculo.plantas,
      hectareasTrabajadas: calculo.hectareas,
    }

    onSubmit(record)

    setSupervisorId('')
    setLoteId('')
    setSubloteId('')
    setAreaId('')
    setLaborId('')
    setLineasTexto('')

    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar formulario"
        className="absolute inset-0 bg-stone-900/50"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-3xl sm:border sm:border-stone-200 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Nuevo registro
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {fecha}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <Field label="Lote">
            <Select
              value={loteId}
              onChange={(event) => handleLote(event.target.value)}
              required
            >
              <option value="">Seleccionar lote</option>

              {hojasDisponibles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.hoja.nombreHoja}
                </option>
              ))}
            </Select>

            {hojasDisponibles.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No hay hojas de Excel importadas. Importa el archivo
                desde Configuración para cargar los lotes.
              </p>
            )}
          </Field>

          <Field label="Sublote">
            <Select
              value={subloteId}
              onChange={(event) => {
                setSubloteId(event.target.value)
                setLineasTexto('')
              }}
              disabled={!hojaExcel || sublotesDisponibles.length === 0}
              required
            >
              <option value="">Seleccionar sublote</option>

              {sublotesDisponibles.map((item) => {
                const id = obtenerIdSublote(
                  hojaExcel!.documento.id,
                  hojaExcel!.hoja.nombreHoja,
                  item.nombre,
                )

                return (
                  <option key={id} value={id}>
                    {item.nombre}
                  </option>
                )
              })}
            </Select>

            {hojaExcel && sublotesDisponibles.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Esta hoja no contiene sublotes reconocidos.
                Comprueba los encabezados de las columnas B en adelante.
              </p>
            )}
          </Field>

          {subloteSeleccionado && (
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-stone-500">
                  Plantas por hectárea
                </span>
                <strong className="text-stone-800">
                  {densidad > 0
                    ? densidad.toLocaleString('es-PE')
                    : 'No disponible'}
                </strong>
              </div>
            </div>
          )}

          <Field label="Labor">
            <Select
              value={laborId}
              onChange={(event) => handleLabor(event.target.value)}
              required
            >
              <option value="">Seleccionar labor</option>

              {labores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>

            {data.labores.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No hay labores registradas en Configuración.
              </p>
            )}
          </Field>

          <Field label="Área">
            <Select
              value={areaId}
              onChange={(event) => handleArea(event.target.value)}
              required
            >
              <option value="">Seleccionar área</option>

              {data.areas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Supervisor">
            <Select
              value={supervisorId}
              onChange={(event) => setSupervisorId(event.target.value)}
              required
            >
              <option value="">Seleccionar supervisor</option>

              {data.supervisores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>

            {data.supervisores.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No hay supervisores registrados en Configuración.
              </p>
            )}
          </Field>

          <Field label="Líneas">
            <input
              type="text"
              value={lineasTexto}
              onChange={(event) => setLineasTexto(event.target.value)}
              placeholder="Ejemplo: 1-20, 25-30, 35"
              className={fieldClass}
              disabled={!subloteSeleccionado}
              required
            />

            <p className="mt-1 text-xs text-stone-500">
              Ingresa rangos o líneas individuales separados por comas.
            </p>
          </Field>

          {resultadoLineas.error && lineasTexto.trim() && (
            <p className="text-sm text-red-600">
              {resultadoLineas.error}
            </p>
          )}

          {calculo.lineasNoEncontradas.length > 0 && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Estas líneas no existen en el sublote seleccionado:{' '}
              {calculo.lineasNoEncontradas.join(', ')}.
            </p>
          )}

          {resultadoLineas.lineas.length > 0 &&
            calculo.lineasNoEncontradas.length === 0 &&
            !resultadoLineas.error && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">
                    Plantas trabajadas
                  </p>
                  <p className="mt-1 text-xl font-bold text-stone-900">
                    {calculo.plantas.toLocaleString('es-PE')}
                  </p>
                </div>

                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">
                    Área trabajada
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {densidad > 0
                      ? `${calculo.hectareas.toFixed(2)} ha`
                      : '—'}
                  </p>
                </div>
              </div>
            )}

          {subloteSeleccionado && densidad <= 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No se puede calcular el área porque la hoja Excel no tiene
              una densidad válida en AB3.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl border border-stone-300 font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={!puedeGuardar}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Plus className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
