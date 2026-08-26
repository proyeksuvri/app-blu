"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

export function MahasiswaFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQ = searchParams.get("q") ?? ""
  const [val, setVal] = useState(currentQ)

  useEffect(() => { setVal(currentQ) }, [currentQ])

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (term.trim()) params.set("q", term.trim())
    else params.delete("q")
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex min-w-72 flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Cari Mahasiswa</label>
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Nama, NIM, atau No. Virtual Akun..."
            value={val}
            onChange={(e) => { setVal(e.target.value); if (!e.target.value) handleSearch("") }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(val) }}
            className="h-8 pl-8 pr-7 bg-input/20 text-xs font-medium"
          />
          {val && (
            <button
              type="button"
              onClick={() => { setVal(""); handleSearch("") }}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
