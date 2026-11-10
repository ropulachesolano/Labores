import { Bug, Droplets, Package, Sprout } from 'lucide-react'
import type { Area } from '../types'
import { AREAS } from '../types'

const AREA_META: Record<
  Area,
  { icon: typeof Sprout; active: string; idle: string; check: string }
> = {
  Campo: {
    icon: Sprout,
    active: 'border-emerald-600 bg-emerald-700 text-white shadow-sm',
    idle: 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400',
    check: 'border-white bg-white/20',
  },
  Sanidad: {
    icon: Bug,
    active: 'border-amber-600 bg-amber-600 text-white shadow-sm',
    idle: 'border-amber-200 bg-white text-amber-950 hover:border-amber-400',
    check: 'border-white bg-white/20',
  },
  Riego: {
    icon: Droplets,
    active: 'border-sky-600 bg-sky-700 text-white shadow-sm',
    idle: 'border-sky-200 bg-white text-sky-950 hover:border-sky-400',
    check: 'border-white bg-white/20',
  },
  Postcosecha: {
    icon: Package,
    active: 'border-violet-600 bg-violet-700 text-white shadow-sm',
    idle: 'border-violet-200 bg-white text-violet-950 hover:border-violet-400',
    check: 'border-white bg-white/20',
  },
}

interface AreaFiltersProps {
  selected: Area[]
  onChange: (areas: Area[]) => void
}

export function AreaFilters({ selected, onChange }: AreaFiltersProps) {
  const toggle = (area: Area) => {
    if (selected.includes(area)) {
      onChange(selected.filter((item) => item !== area))
      return
    }
    onChange([...selected, area])
  }

  const allOn = selected.length === AREAS.length

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">Filtro por áreas</h2>
          <p className="text-xs text-stone-500">Seleccione una o varias para cruzar la planilla</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : [...AREAS])}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          {allOn ? 'Quitar todas' : 'Seleccionar todas'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AREAS.map((area) => {
          const meta = AREA_META[area]
          const Icon = meta.icon
          const isOn = selected.includes(area)
          return (
            <button
              key={area}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(area)}
              className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                isOn ? meta.active : meta.idle
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isOn ? meta.check : 'border-stone-300 bg-white'
                }`}
              >
                {isOn ? '✓' : ''}
              </span>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{area}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
