"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { FacetedFilter, FilterReset, type FilterOption } from "@/components/ui/faceted-filter"
import { Input } from "@/components/ui/input"

const STATUS_OPTIONS: FilterOption[] = [
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Terverifikasi" },
  { value: "void", label: "Dibatalkan" },
]

type PenerimaanFiltersProps = {
  jenisOptions: FilterOption[]
  rekeningOptions: FilterOption[]
}

function SearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQ = searchParams.get("q") ?? ""
  const [val, setVal] = useState(currentQ)

  useEffect(() => {
    setVal(currentQ)
  }, [currentQ])

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (term.trim()) {
      params.set("q", term.trim())
    } else {
      params.delete("q")
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">Cari Nomor Bukti</label>
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Ketik nomor bukti..."
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            if (!e.target.value) handleSearch("")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(val)
          }}
          className="h-8 pl-8 pr-7 bg-input/20 text-xs font-medium"
        />
        {val && (
          <button
            type="button"
            onClick={() => {
              setVal("")
              handleSearch("")
            }}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function PenerimaanFilters({ jenisOptions, rekeningOptions }: PenerimaanFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchInput />
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
      <FilterReset paramKeys={["status", "jenis_id", "rekening_id", "q"]} />
    </div>
  )
}

