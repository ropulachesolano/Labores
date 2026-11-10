import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { LaborTable } from '../components/LaborTable'
import { Field, Select, fieldClass } from '../components/ui'
import { useApp } from '../store/AppContext'
import {
  addDays,
  endOfMonth,
  formatLongDate,
  formatShortDate,
  inRange,
  startOfMonth,
  startOfWeek,
  todayISO,
} from '../utils/dates'
import { loteLabel, supervisorName } from '../utils/lookups'
import { summarizeRecords } from '../utils/summary'

export function ResumenTab() {
  const { data } = useApp()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [from, setFrom] = useState(startOfMonth(todayISO()))
  const [to, setTo] = useState(todayISO())
  const [analysisLote, setAnalysisLote] = useState('')
  const [analysisLabor, setAnalysisLabor] = useState('')

  const byDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const record of data.records) {
      map.set(record.fecha, (map.get(record.fecha) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [data.records])

  const rangeRecords = useMemo(
    () => data.records.filter((record) => inRange(record.fecha, from, to)),
    [data.records, from, to],
  )
  const rangeSummary = useMemo(() => summarizeRecords(rangeRecords), [rangeRecords])

  const analysisRecords = useMemo(
    () =>
      data.records.filter((record) => {
        if (analysisLote && record.loteId !== analysisLote) return false
        if (analysisLabor && record.laborId !== analysisLabor) return false
        return Boolean(analysisLote && analysisLabor)
      }),
    [data.records, analysisLote, analysisLabor],
  )

  const analysisDays = useMemo(
    () => [...new Set(analysisRecords.map((record) => record.fecha))].sort(),
    [analysisRecords],
  )
  const analysisSummary = useMemo(() => summarizeRecords(analysisRecords), [analysisRecords])
  const analysisSupervisors = useMemo(() => {
    const ids = [...new Set(analysisRecords.map((record) => record.supervisorId))]
    return ids.map((id) => supervisorName(data, id))
  }, [analysisRecords, data])

  const dayRecords = selectedDay
    ? data.records.filter((record) => record.fecha === selectedDay)
    : []

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Historial por fecha</h2>
        <p className="mb-3 text-sm text-stone-500">Seleccione un día para ver la planilla completa.</p>
        {byDate.length === 0 ? (
          <p className="text-sm text-stone-500">Aún no hay partes diarios guardados.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {byDate.map(([fecha, count]) => (
              <li key={fecha}>
                <button
                  type="button"
                  onClick={() => setSelectedDay(fecha)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50 ${
                    selectedDay === fecha ? 'bg-emerald-50' : ''
                  }`}
                >
                  <span>
                    <span className="block font-medium capitalize text-stone-800">
                      {formatLongDate(fecha)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {count} {count === 1 ? 'registro' : 'registros'}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedDay && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold capitalize text-stone-900">
              Planilla · {formatLongDate(selectedDay)}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              Cerrar detalle
            </button>
          </div>
          <LaborTable records={dayRecords} emptyText="No hay registros en este día." />
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Totales y acumulados</h2>
        <p className="mb-3 text-sm text-stone-500">Suma de grupos y jornales en un rango de fechas.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
            onClick={() => {
              const today = todayISO()
              setFrom(startOfWeek(today))
              setTo(addDays(startOfWeek(today), 6))
            }}
          >
            Esta semana
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
            onClick={() => {
              const today = todayISO()
              setFrom(startOfMonth(today))
              setTo(endOfMonth(today))
            }}
          >
            Este mes
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desde">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl bg-emerald-800 p-4 text-emerald-50">
            <p className="text-xs uppercase tracking-wide text-emerald-200">Grupos</p>
            <p className="text-2xl font-semibold">{rangeSummary.grupos}</p>
          </article>
          <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Jornales / personal</p>
            <p className="text-2xl font-semibold text-stone-900">{rangeSummary.personal}</p>
          </article>
          <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Registros</p>
            <p className="text-2xl font-semibold text-stone-900">{rangeSummary.registros}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Análisis por labor y lote</h2>
        <p className="mb-3 text-sm text-stone-500">
          Filtre un lote y una labor para ver jornales acumulados, duración y supervisores a cargo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lote">
            <Select value={analysisLote} onChange={(event) => setAnalysisLote(event.target.value)}>
              <option value="">Seleccionar lote</option>
              {data.lotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {loteLabel(data, item.id)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Labor">
            <Select value={analysisLabor} onChange={(event) => setAnalysisLabor(event.target.value)}>
              <option value="">Seleccionar labor</option>
              {data.labores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {analysisLote && analysisLabor ? (
          analysisRecords.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No hay registros para esa combinación.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs text-stone-500">Jornales / personal total</p>
                  <p className="text-2xl font-semibold text-stone-900">{analysisSummary.personal}</p>
                  <p className="mt-1 text-xs text-stone-500">Grupos: {analysisSummary.grupos}</p>
                </article>
                <article className="rounded-xl border border-stone-200 p-4">
                  <p className="text-xs text-stone-500">Días que duró la labor</p>
                  <p className="text-2xl font-semibold text-stone-900">{analysisDays.length}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatShortDate(analysisDays[0])} — {formatShortDate(analysisDays[analysisDays.length - 1])}
                  </p>
                </article>
              </div>
              <article className="rounded-xl border border-stone-200 p-4">
                <p className="text-xs text-stone-500">Supervisores a cargo</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-stone-800">
                  {analysisSupervisors.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </article>
            </div>
          )
        ) : (
          <p className="mt-4 text-sm text-stone-500">Elija lote y labor para calcular el acumulado.</p>
        )}
      </section>
    </div>
  )
}
