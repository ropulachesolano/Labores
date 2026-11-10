import { Users, UsersRound } from 'lucide-react'
import type { AdaptiveSummary } from '../types'

interface SummaryBarProps {
  summary: AdaptiveSummary
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const hasGrupos = summary.grupos > 0
  const hasPersonal = summary.personal > 0

  let headline = 'Sin personal asignado'
  let detail =
    'Las labores masivas suman grupos; las fraccionadas (sanidad y similares) suman operarios por separado.'

  if (hasGrupos && hasPersonal) {
    headline = `${summary.grupos} Grupos · ${summary.personal} Operarios`
    detail =
      'Suma adaptativa: cosecha y labores masivas en grupos; sanidad y tareas individuales en jornales, sin mezclar unidades.'
  } else if (hasGrupos) {
    headline = `${summary.grupos} ${summary.grupos === 1 ? 'Grupo' : 'Grupos'}`
    detail = 'Totales de labores masivas. No se contabilizan operarios sueltos como cuadrillas.'
  } else if (hasPersonal) {
    headline = `${summary.personal} ${summary.personal === 1 ? 'Operario' : 'Operarios'}`
    detail = 'Totales de labores fraccionadas. Cada persona se cuenta de forma independiente.'
  }

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-emerald-200 bg-emerald-800 p-4 text-emerald-50 shadow-sm sm:col-span-2">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-200">
          Resumen diario · suma adaptativa
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{headline}</p>
        <p className="mt-2 text-sm leading-snug text-emerald-100/90">{detail}</p>
      </article>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <article className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-stone-500">Grupos</p>
            <p className="text-xl font-semibold text-stone-900">{summary.grupos}</p>
          </div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-stone-500">Personal / jornales</p>
            <p className="text-xl font-semibold text-stone-900">{summary.personal}</p>
          </div>
        </article>
      </div>
      <p className="sr-only">{summary.registros} registros visibles.</p>
    </section>
  )
}
