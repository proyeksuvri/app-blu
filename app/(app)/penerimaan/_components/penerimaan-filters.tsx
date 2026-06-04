"use client"

import { FacetedFilter, FilterReset, type FilterOption } from "@/components/ui/faceted-filter"

const STATUS_OPTIONS: FilterOption[] = [
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Terverifikasi" },
  { value: "void", label: "Dibatalkan" },
]

type PenerimaanFiltersProps = {
  jenisOptions: FilterOption[]
}

export function PenerimaanFilters({ jenisOptions }: PenerimaanFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FacetedFilter title="Status" paramKey="status" options={STATUS_OPTIONS} />
      {jenisOptions.length > 0 && (
        <FacetedFilter title="Jenis" paramKey="jenis_id" options={jenisOptions} />
      )}
      <FilterReset paramKeys={["status", "jenis_id"]} />
    </div>
  )
}
