"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { FacetedFilter } from "@/components/ui/faceted-filter"

export function PengeluaranFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nomor bukti..."
          className="pl-9 h-9"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim()
            startTransition(() => {
              const params = new URLSearchParams(searchParams.toString())
              if (v) params.set("q", v)
              else params.delete("q")
              params.delete("page")
              router.replace(`${pathname}?${params.toString()}`)
            })
          }}
        />
      </div>

      <FacetedFilter
        title="Status"
        paramKey="status"
        options={[
          { value: "draft", label: "Draft" },
          { value: "verified", label: "Terverifikasi" },
          { value: "void", label: "Batal" },
        ]}
      />
    </div>
  )
}
