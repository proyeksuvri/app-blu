import { Inbox } from "lucide-react"

export function EmptyState({ message = "Belum ada data" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/30">
      <Inbox className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
