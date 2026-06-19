"use client"

import { X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type FilterOption = {
  value: string
  label: string
  count?: number
}

type FacetedFilterProps = {
  title: string
  paramKey: string
  options: FilterOption[]
  placeholder?: string
}

const ALL_VALUE = "__all__"

export function FacetedFilter({
  title,
  paramKey,
  options,
  placeholder = "Semua",
}: FacetedFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const raw = searchParams.get(paramKey) ?? ""
  const value = raw.split(",").filter(Boolean)[0] ?? ALL_VALUE
  const items = [{ value: ALL_VALUE, label: placeholder }, ...options]

  function update(nextValue: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (nextValue && nextValue !== ALL_VALUE) params.set(paramKey, nextValue)
    else params.delete(paramKey)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">{title}</label>
      <Select
        items={items}
        value={value}
        onValueChange={(selectedValue) => update(selectedValue as string | null)}
      >
        <SelectTrigger className="h-8 w-full rounded-lg bg-input/20 px-3 text-sm font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-lg p-1" align="start">
          <SelectGroup>
            {items.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="min-h-8 px-3 text-sm font-medium"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

type FilterResetProps = {
  paramKeys: string[]
}

export function FilterReset({ paramKeys }: FilterResetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasFilters = paramKeys.some((k) => searchParams.has(k))

  if (!hasFilters) return null

  function reset() {
    const params = new URLSearchParams(searchParams.toString())
    paramKeys.forEach((k) => params.delete(k))
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  return (
    <button
      onClick={reset}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-9 gap-1.5 text-muted-foreground hover:text-foreground"
      )}
    >
      Reset
      <X className="h-3.5 w-3.5" />
    </button>
  )
}
