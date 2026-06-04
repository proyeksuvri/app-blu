import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  aktif: boolean
  label?: [string, string]
}

export function StatusBadge({
  aktif,
  label = ["Aktif", "Nonaktif"],
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        aktif
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
          : "bg-muted/50 text-muted-foreground ring-border"
      )}
    >
      {aktif ? label[0] : label[1]}
    </span>
  )
}
