import { cn } from "@/lib/utils"

type Status = "draft" | "verified" | "void"

const config: Record<Status, { label: string; classes: string }> = {
  draft:    { label: "Draft",      classes: "bg-amber-500/10  text-amber-400  ring-amber-500/20" },
  verified: { label: "Terverifikasi", classes: "bg-green-500/10  text-green-400  ring-green-500/20" },
  void:     { label: "Dibatalkan", classes: "bg-muted/50 text-muted-foreground ring-border" },
}

export function PenerimaanStatusBadge({ status }: { status: Status }) {
  const { label, classes } = config[status] ?? config.draft
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1", classes)}>
      {label}
    </span>
  )
}
