
import { useApp } from '../store/AppContext'
import type { LaborRecord } from '../types'
import { resolveRecord } from '../utils/lookups'
import { EmptyState } from './ui'

interface LaborTableProps {
  records: LaborRecord[]
  emptyText?: string
}

function formatNumber(value?: number): string {
  if (value === undefined || !Number.isFinite(Number(value))) return '—'

  return new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function getLineas(record: LaborRecord): string {
  if (record.lineasTexto?.trim()) return record.lineasTexto

  if (record.lineas?.length) {
    return record.lineas.join(', ')
  }

  return '—'
}

export function LaborTable({
  records,
  emptyText = 'No hay registros para esta fecha. Presione + para agregar una labor.',
}: LaborTableProps) {
  const { data } = useApp()

  if (records.length === 0) {
    return <EmptyState title="Sin registros" text={emptyText} />
  }

  return (
    <>
      {/* Tabla para computadoras */}
      <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Lote</th>
                <th className="px-4 py-3 font-semibold">Sublote</th>
                <th className="px-4 py-3 font-semibold">Labor</th>
                <th className="px-4 py-3 font-semibold">Área</th>
                <th className="px-4 py-3 font-semibold">Supervisor</th>
                <th className="px-4 py-3 font-semibold">Líneas</th>
                <th className="px-4 py-3 text-right font-semibold">Plantas</th>
                <th className="px-4 py-3 text-right font-semibold">Área (ha)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {records.map((record) => {
                const row = resolveRecord(data, record)

                return (
                  <tr key={record.id} className="hover:bg-stone-50/80">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-800">
                      {row.loteCodigo}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                      {record.subloteNombre || '—'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-stone-800">
                      {row.labor}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                        {row.area}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                      {row.supervisor}
                    </td>

                    <td className="px-4 py-3 text-stone-700">
                      {getLineas(record)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-stone-800">
                      {formatNumber(record.plantasTrabajadas)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-stone-900">
                      {formatNumber(record.hectareasTrabajadas)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas para celulares */}
      <div className="grid gap-3 md:hidden">
        {records.map((record) => {
          const row = resolveRecord(data, record)

          return (
            <article
              key={record.id}
              className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900">
                    {row.labor}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {row.supervisor}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                  {row.area}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-stone-100 pt-3">
                <div>
                  <p className="text-xs text-stone-500">Lote</p>
                  <p className="text-sm font-semibold text-stone-800">
                    {row.loteCodigo}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-stone-500">Sublote</p>
                  <p className="text-sm font-medium text-stone-800">
                    {record.subloteNombre || '—'}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-stone-500">Líneas trabajadas</p>
                  <p className="text-sm font-medium text-stone-800">
                    {getLineas(record)}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-stone-50 p-2.5">
                  <p className="text-xs text-stone-500">Plantas</p>
                  <p className="text-base font-semibold tabular-nums text-stone-900">
                    {formatNumber(record.plantasTrabajadas)}
                  </p>
                </div>

                <div className="rounded-lg bg-stone-50 p-2.5">
                  <p className="text-xs text-stone-500">Área (ha)</p>
                  <p className="text-base font-semibold tabular-nums text-stone-900">
                    {formatNumber(record.hectareasTrabajadas)}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
