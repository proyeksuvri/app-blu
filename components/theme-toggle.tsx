"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { setTheme, theme } = useTheme()

  const trigger = collapsed ? (
    <DropdownMenuTrigger
      render={<Button variant="ghost" size="icon-sm" title="Ubah tema" />}
      className="text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
    >
      <Sun className="h-3.5 w-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-3.5 w-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle tema</span>
    </DropdownMenuTrigger>
  ) : (
    <DropdownMenuTrigger
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
        "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
      )}
    >
      <Sun className="h-3.5 w-3.5 shrink-0 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-3.5 w-3.5 shrink-0 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span>Ubah Tema</span>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent align="end" side="top" sideOffset={6}>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-3.5 w-3.5" />
          Terang
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-3.5 w-3.5" />
          Gelap
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-3.5 w-3.5" />
          Sistem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
