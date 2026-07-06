"use client"

import { FacetedFilter, FilterReset, type FilterOption } from "@/components/ui/faceted-filter"

const STATUS_OPTIONS: FilterOption[] = [
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Terverifikasi" },
  { value: "void", label: "Dibatalkan" },
]

type PenerimaanFiltersProps = {
  jenisOptions: FilterOption[]
  rekeningOptions: FilterOption[]
}

export function PenerimaanFilters({ jenisOptions, rekeningOptions }: PenerimaanFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FacetedFilter
        title="Status"
        paramKey="status"
        options={STATUS_OPTIONS}
        placeholder="Semua status"
      />
      {jenisOptions.length > 0 && (
        <FacetedFilter
          title="Jenis"
          paramKey="jenis_id"
          options={jenisOptions}
          placeholder="Semua jenis"
        />
      )}
      {rekeningOptions.length > 0 && (
        <FacetedFilter
          title="Rekening Bank"
          paramKey="rekening_id"
          options={rekeningOptions}
          placeholder="Semua rekening"
        />
      )}
      <FilterReset paramKeys={["status", "jenis_id", "rekening_id"]} />
    </div>
  )
}
