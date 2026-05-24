"use client"

import { Check, PlusCircle, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
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
}

export function FacetedFilter({ title, paramKey, options }: FacetedFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const raw = searchParams.get(paramKey) ?? ""
  const selected = new Set(raw.split(",").filter(Boolean))

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)

    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (next.size > 0) params.set(paramKey, [...next].join(","))
    else params.delete(paramKey)
    router.push(`?${params.toString()}`)
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramKey)
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-9 gap-1.5 border-dashed"
        )}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        {title}
        {selected.size > 0 && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-4" />
            {selected.size > 2 ? (
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal text-[10px] h-4"
              >
                {selected.size} dipilih
              </Badge>
            ) : (
              [...selected].map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="rounded-sm px-1 font-normal text-[10px] h-4"
                >
                  {options.find((o) => o.value === v)?.label ?? v}
                </Badge>
              ))
            )}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Cari ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    data-checked={isSelected || undefined}
                    onSelect={() => toggle(option.value)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                    {option.count != null && (
                      <span className="ml-auto tabular-nums text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={clear}
                    className="justify-center text-center text-xs text-muted-foreground"
                  >
                    Hapus filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
