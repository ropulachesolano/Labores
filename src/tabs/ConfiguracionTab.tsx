
import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Field, Select, fieldClass } from '../components/ui'
import { useApp } from '../store/AppContext'
import type { CatalogKey, DocumentoExcel } from '../types'
import { leerArchivoExcel } from '../utils/excelParser'

function ExtraFields({
  catalog,
  extras,
  onChange,
}: {
  catalog: CatalogKey
  extras: Record<string, string>
  onChange: (extras: Record<string, string>) => void
}) {
  const { data } = useApp()
  const fields = data.customFields.filter((field) => field.catalog === catalog)

  if (fields.length === 0) return null

  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <Field key={field.id} label={field.label}>
          <input
            value={extras[field.id] ?? ''}
            onChange={(event) =>
              onChange({ ...extras, [field.id]: event.target.value })
            }
            className={fieldClass}
          />
        </Field>
      ))}
    </div>
  )
}

function CustomFieldEditor({ catalog }: { catalog: CatalogKey }) {
  const { data, addCustomField, removeCustomField } = useApp()
  const [label, setLabel] = useState('')
  const fields = data.customFields.filter((field) => field.catalog === catalog)

  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Campos personalizados
      </p>

      <form
        className="flex gap-2"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          addCustomField(catalog, label)
          setLabel('')
        }}
      >
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nombre del nuevo campo"
          className={fieldClass}
        />

        <button
          type="submit"
          className="shrink-0 rounded-lg bg-stone-800 px-3 text-sm font-medium text-white hover:bg-stone-900"
        >
          Agregar campo
        </button>
      </form>

      {fields.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {fields.map((field) => (
            <li
              key={field.id}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-stone-700 ring-1 ring-stone-200"
            >
              {field.label}
              <button
                type="button"
                onClick={() => removeCustomField(field.id)}
                aria-label={`Quitar ${field.label}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-stone-400 hover:text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ConfiguracionTab() {
  const {
    data,
    addLote,
    removeLote,
    addLabor,
    removeLabor,
    addArea,
    removeArea,
    addSupervisor,
    removeSupervisor,
    addDocumento,
    removeDocumento,
  } = useApp()

  const [lote, setLote] = useState({
    codigo: '',
    cultivo: '',
    variedad: '',
    hectareas: 1,
    extras: {} as Record<string, string>,
  })

  const [labor, setLabor] = useState({
    nombre: '',
    areaId: data.areas[0]?.id ?? '',
    extras: {} as Record<string, string>,
  })

  const [areaNombre, setAreaNombre] = useState('')
  const [areaExtras, setAreaExtras] = useState<Record<string, string>>({})
  const [supervisorNombre, setSupervisorNombre] = useState('')
  const [supervisorExtras, setSupervisorExtras] = useState<
    Record<string, string>
  >({})

  const [importando, setImportando] = useState(false)
  const [archivoError, setArchivoError] = useState<string | null>(null)
  const [archivoMensaje, setArchivoMensaje] = useState('')

  // Los documentos se leen directamente desde AppContext.
  // Así no existe una copia local que pueda quedar desactualizada.
  const documentos = data.documentos

  const failIfUsed = (ok: boolean) => {
    setArchivoMensaje('')
    if (!ok) {
      setArchivoError(
        'No se puede eliminar: el ítem está en uso en labores o en la planilla.',
      )
    } else {
      setArchivoError(null)
    }
  }

  const handleExcelImport = async (file: File) => {
    setImportando(true)
    setArchivoError(null)
    setArchivoMensaje('')

    try {
      const result = await leerArchivoExcel(file)

      if (!result.success || !result.data) {
        setArchivoError(result.error || 'Error al procesar el archivo.')
        return
      }

      const doc = result.data

      // Buscar un documento con el mismo nombre.
      const documentoExistente = data.documentos.find(
        (item) =>
          item.nombreArchivo.trim().toLowerCase() ===
          doc.nombreArchivo.trim().toLowerCase(),
      )

      if (documentoExistente) {
        const confirmar = window.confirm(
          `Ya existe el archivo "${doc.nombreArchivo}".\n\n¿Deseas reemplazar sus datos procesados por los nuevos?\n\nSe conservará el identificador del documento y no se eliminarán los registros de labores.`,
        )

        if (!confirmar) return

        // Sustituir el documento conservando su identificador.
        removeDocumento(documentoExistente.id)

        const documentoActualizado: DocumentoExcel = {
          ...doc,
          id: documentoExistente.id,
        }

        addDocumento(documentoActualizado)

        setArchivoMensaje(
          'El archivo Excel fue reemplazado correctamente.',
        )
      } else {
        addDocumento(doc)

        setArchivoMensaje(
          'El archivo Excel fue importado correctamente.',
        )
      }
    } catch (error) {
      console.error('Error al importar Excel:', error)
      setArchivoError('Ocurrió un error inesperado al importar el Excel.')
    } finally {
      setImportando(false)
    }
  }

  const eliminarDocumento = (doc: DocumentoExcel) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar el documento "${doc.nombreArchivo}"?\n\nEsta acción eliminará su base de datos Excel guardada en la aplicación. No elimina los registros de labores.`,
    )

    if (!confirmar) return

    const eliminado = removeDocumento(doc.id)

    if (eliminado) {
      setArchivoError(null)
      setArchivoMensaje('Documento Excel eliminado correctamente.')
    } else {
      setArchivoError('No se pudo eliminar el documento.')
    }
  }

  const verContenido = (doc: DocumentoExcel) => {
    window.alert(
      'Vista previa: ' +
        doc.nombreArchivo +
        '\n' +
        'Hojas procesadas: ' +
        doc.hojasProcesadas +
        '\n' +
        'Lotes detectados: ' +
        doc.lotesDetectados +
        '\n' +
        'Sublotes detectados: ' +
        doc.sublotesDetectados +
        '\n' +
        'Metadatos: ' +
        JSON.stringify(doc.metadatos, null, 2),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {noticePlaceholder(archivoError)}
      {archivoMensaje && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {archivoMensaje}
        </p>
      )}

      {/* SECCIÓN LOTES */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Lotes</h2>
        <p className="mb-3 text-sm text-stone-500">
          Nombre, cultivo, variedad y hectáreas del fundo.
        </p>

        <CustomFieldEditor catalog="lotes" />

        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!lote.codigo.trim() || !lote.cultivo.trim()) return

            addLote({
              codigo: lote.codigo.trim(),
              cultivo: lote.cultivo.trim(),
              variedad: lote.variedad.trim(),
              hectareas: Number(lote.hectareas) || 0,
              extras: lote.extras,
            })

            setLote({
              codigo: '',
              cultivo: '',
              variedad: '',
              hectareas: 1,
              extras: {},
            })
          }}
        >
          <Field label="Lote / código">
            <input
              value={lote.codigo}
              onChange={(event) =>
                setLote((prev) => ({
                  ...prev,
                  codigo: event.target.value,
                }))
              }
              placeholder="Ej. 104B"
              className={fieldClass}
              required
            />
          </Field>

          <Field label="Cultivo">
            <input
              value={lote.cultivo}
              onChange={(event) =>
                setLote((prev) => ({
                  ...prev,
                  cultivo: event.target.value,
                }))
              }
              className={fieldClass}
              required
            />
          </Field>

          <Field label="Variedad">
            <input
              value={lote.variedad}
              onChange={(event) =>
                setLote((prev) => ({
                  ...prev,
                  variedad: event.target.value,
                }))
              }
              className={fieldClass}
            />
          </Field>

          <Field label="Hectáreas">
            <input
              type="number"
              min={0}
              step="0.1"
              value={lote.hectareas}
              onChange={(event) =>
                setLote((prev) => ({
                  ...prev,
                  hectareas: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <ExtraFields
              catalog="lotes"
              extras={lote.extras}
              onChange={(extras) =>
                setLote((prev) => ({ ...prev, extras }))
              }
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 sm:col-span-2"
          >
            <Plus className="h-4 w-4" />
            Agregar lote
          </button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {data.lotes.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-stone-500">
              Sin lotes aún.
            </li>
          )}

          {data.lotes.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium text-stone-800">
                  {item.codigo}
                </span>
                <span className="text-stone-500">
                  {' '}
                  · {item.cultivo}
                  {item.variedad ? ` ${item.variedad}` : ''} ·{' '}
                  {item.hectareas} ha
                </span>
              </span>

              <button
                type="button"
                onClick={() => failIfUsed(removeLote(item.id))}
                aria-label="Eliminar lote"
              >
                <Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* SECCIÓN LABORES */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Labores</h2>
        <p className="mb-3 text-sm text-stone-500">
          Tareas agrícolas editables, asociadas a un área.
        </p>

        <CustomFieldEditor catalog="labores" />

        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!labor.nombre.trim() || !labor.areaId) return

            addLabor({
              nombre: labor.nombre.trim(),
              areaId: labor.areaId,
              extras: labor.extras,
            })

            setLabor((prev) => ({
              ...prev,
              nombre: '',
              extras: {},
            }))
          }}
        >
          <Field label="Nombre de la labor">
            <input
              value={labor.nombre}
              onChange={(event) =>
                setLabor((prev) => ({
                  ...prev,
                  nombre: event.target.value,
                }))
              }
              className={fieldClass}
              required
            />
          </Field>

          <Field label="Área">
            <Select
              value={labor.areaId}
              onChange={(event) =>
                setLabor((prev) => ({
                  ...prev,
                  areaId: event.target.value,
                }))
              }
            >
              {data.areas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <ExtraFields
              catalog="labores"
              extras={labor.extras}
              onChange={(extras) =>
                setLabor((prev) => ({ ...prev, extras }))
              }
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 sm:col-span-2"
          >
            <Plus className="h-4 w-4" />
            Agregar labor
          </button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {data.labores.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium text-stone-800">
                  {item.nombre}
                </span>
                <span className="text-stone-500">
                  {' '}
                  ·{' '}
                  {data.areas.find((area) => area.id === item.areaId)
                    ?.nombre ?? '—'}
                </span>
              </span>

              <button
                type="button"
                onClick={() => failIfUsed(removeLabor(item.id))}
                aria-label="Eliminar labor"
              >
                <Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* SECCIÓN ÁREAS */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Áreas</h2>
        <p className="mb-3 text-sm text-stone-500">
          Campo, Sanidad, Riego, Postcosecha u otras que defina.
        </p>

        <CustomFieldEditor catalog="areas" />

        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!areaNombre.trim()) return

            addArea({
              nombre: areaNombre.trim(),
              extras: areaExtras,
            })

            setAreaNombre('')
            setAreaExtras({})
          }}
        >
          <Field label="Nombre del área">
            <input
              value={areaNombre}
              onChange={(event) => setAreaNombre(event.target.value)}
              className={fieldClass}
              required
            />
          </Field>

          <ExtraFields
            catalog="areas"
            extras={areaExtras}
            onChange={setAreaExtras}
          />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Agregar área
          </button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {data.areas.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium text-stone-800">
                {item.nombre}
              </span>

              <button
                type="button"
                onClick={() => failIfUsed(removeArea(item.id))}
                aria-label="Eliminar área"
              >
                <Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* SECCIÓN SUPERVISORES */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">
          Supervisores / personal a cargo
        </h2>
        <p className="mb-3 text-sm text-stone-500">
          Quienes firman o responden por el parte diario.
        </p>

        <CustomFieldEditor catalog="supervisores" />

        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!supervisorNombre.trim()) return

            addSupervisor({
              nombre: supervisorNombre.trim(),
              extras: supervisorExtras,
            })

            setSupervisorNombre('')
            setSupervisorExtras({})
          }}
        >
          <Field label="Nombre">
            <input
              value={supervisorNombre}
              onChange={(event) => setSupervisorNombre(event.target.value)}
              className={fieldClass}
              required
            />
          </Field>

          <ExtraFields
            catalog="supervisores"
            extras={supervisorExtras}
            onChange={setSupervisorExtras}
          />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Agregar supervisor
          </button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {data.supervisores.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-stone-500">
              Sin supervisores aún.
            </li>
          )}

          {data.supervisores.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium text-stone-800">
                {item.nombre}
              </span>

              <button
                type="button"
                onClick={() => failIfUsed(removeSupervisor(item.id))}
                aria-label="Eliminar supervisor"
              >
                <Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* BASE DE DATOS DEL FUNDO - EXCEL */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">
          BASE DE DATOS DEL FUNDO
        </h2>

        <p className="mb-3 text-sm text-stone-500">
          Gestión de documentos Excel del fundo agrícola.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Subir archivo Excel
          </label>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              const file = event.target.files?.[0]

              // Limpiar el selector permite volver a elegir el mismo archivo.
              event.currentTarget.value = ''

              if (file) {
                handleExcelImport(file)
              }
            }}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={importando}
          />

          {importando && (
            <p className="mt-2 text-sm text-emerald-600">
              Importando y procesando Excel...
            </p>
          )}

          {archivoError && (
            <p className="mt-2 text-sm text-red-600">{archivoError}</p>
          )}
        </div>

        {documentos.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-stone-700">
              Documentos importados
            </h3>

            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Archivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Hojas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Lotes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Sublotes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-200">
                  {documentos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {doc.nombreArchivo}
                      </td>

                      <td className="px-4 py-3 text-stone-500">
                        {new Date(doc.fechaImportacion).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-stone-500">
                        {doc.hojasProcesadas}
                      </td>

                      <td className="px-4 py-3 text-stone-500">
                        {doc.lotesDetectados}
                      </td>

                      <td className="px-4 py-3 text-stone-500">
                        {doc.sublotesDetectados}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                            doc.estado === 'importado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.estado === 'actualizado'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {doc.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => verContenido(doc)}
                            className="font-medium text-emerald-600 underline hover:text-emerald-800"
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarDocumento(doc)}
                            title="Eliminar documento Excel"
                            aria-label={`Eliminar ${doc.nombreArchivo}`}
                            className="text-stone-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {documentos.length === 0 && (
          <p className="mt-3 text-sm text-stone-500">
            No hay documentos Excel importados aún. Usa el selector de arriba
            para subir un archivo.
          </p>
        )}
      </section>
    </div>
  )
}

function noticePlaceholder(message: string | null) {
  if (!message) return null

  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {message}
    </p>
  )
}
