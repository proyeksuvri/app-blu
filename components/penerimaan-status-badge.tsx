import { cn } from "@/lib/utils"

type Status = "draft" | "verified" | "void"

const config: Record<Status, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-secondary text-secondary-foreground ring-border" },
  verified: { label: "Terverifikasi", classes: "bg-primary text-primary-foreground ring-primary/20" },
  void: { label: "Dibatalkan", classes: "bg-destructive/10 text-destructive ring-destructive/20" },
}

export function PenerimaanStatusBadge({ status }: { status: Status }) {
  const { label, classes } = config[status] ?? config.draft
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1", classes)}>
      {label}
    </span>
  )
}
