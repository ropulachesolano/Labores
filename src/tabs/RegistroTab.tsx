
import { useMemo, useState } from 'react'
import { Plus, CalendarDays, ClipboardList } from 'lucide-react'
import { LaborTable } from '../components/LaborTable'
import { NewRecordForm } from '../components/NewRecordForm'
import { useApp } from '../store/AppContext'
import { formatLongDate, todayISO } from '../utils/dates'
import { summarizeRecords } from '../utils/summary'

export function RegistroTab() {
  const { data, addRecord } = useApp()

  const [fecha, setFecha] = useState(todayISO)
  const [formOpen, setFormOpen] = useState(false)

  // Registros correspondientes al día seleccionado.
  const dayRecords = useMemo(() => {
    const records = Array.isArray(data?.records)
      ? data.records
      : []

    return records
      .filter((record) => record.fecha === fecha)
      .sort((a, b) => {
        const supervisorA =
          data.supervisores.find(
            (item) => item.id === a.supervisorId,
          )?.nombre ?? ''

        const supervisorB =
          data.supervisores.find(
            (item) => item.id === b.supervisorId,
          )?.nombre ?? ''

        return supervisorA.localeCompare(supervisorB)
      })
  }, [data?.records, data?.supervisores, fecha])

  const summary = useMemo(
    () => summarizeRecords(dayRecords),
    [dayRecords],
  )

  const plantasTotales = useMemo(
    () =>
      dayRecords.reduce(
        (total, record) =>
          total + (Number(record.plantasTrabajadas) || 0),
        0,
      ),
    [dayRecords],
  )

  const hectareasTotales = useMemo(
    () =>
      dayRecords.reduce(
        (total, record) =>
          total + (Number(record.hectareasTrabajadas) || 0),
        0,
      ),
    [dayRecords],
  )

  return (
    <div className="flex w-full flex-col gap-4">

      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            REGISTRO DE LABORES
          </h1>

          <p className="mt-1 text-sm text-stone-500">
            Control diario de trabajos en campo
          </p>
        </div>

        {/* Botón para nuevo registro */}
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          aria-label="Agregar nuevo registro"
          title="Agregar registro"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-md transition hover:bg-emerald-800 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {/* Selector de fecha */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-emerald-700" />

          <span className="text-sm font-semibold text-stone-800">
            Fecha de registro
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <p className="text-sm capitalize text-stone-500">
            {formatLongDate(fecha)}
          </p>
        </div>
      </section>

      {/* Resumen del día */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs text-stone-500">
            Registros
          </p>

          <p className="mt-1 text-2xl font-bold text-stone-900">
            {dayRecords.length}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs text-stone-500">
            Grupos
          </p>

          <p className="mt-1 text-2xl font-bold text-stone-900">
            {summary.grupos}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs text-stone-500">
            Plantas trabajadas
          </p>

          <p className="mt-1 text-xl font-bold text-stone-900">
            {plantasTotales.toLocaleString('es-PE')}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-xs text-stone-500">
            Área trabajada
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {hectareasTotales.toFixed(2)} ha
          </p>
        </div>
      </section>

      {/* Registros */}
      <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-700" />

            <h2 className="font-semibold text-stone-900">
              Partes registrados
            </h2>
          </div>

          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {dayRecords.length} registros
          </span>
        </div>

        {dayRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
              <ClipboardList className="h-7 w-7 text-stone-400" />
            </div>

            <p className="mt-3 font-medium text-stone-700">
              No hay registros para esta fecha
            </p>

            <p className="mt-1 max-w-xs text-sm text-stone-500">
              Presiona el botón + para agregar el primer registro de labores.
            </p>

            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Agregar registro
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <LaborTable records={dayRecords} />
          </div>
        )}
      </section>

      {/* Formulario flotante */}
      <NewRecordForm
        open={formOpen}
        fecha={fecha}
        onClose={() => setFormOpen(false)}
        onSubmit={addRecord}
      />
    </div>
  )
}
