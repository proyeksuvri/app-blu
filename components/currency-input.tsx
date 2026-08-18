"use client"

import { forwardRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Props = {
  value?: number
  onChange?: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  "aria-invalid"?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className, placeholder = "0", disabled, "aria-invalid": ariaInvalid }, ref) => {
    const [display, setDisplay] = useState(() =>
      value ? value.toLocaleString("id-ID") : ""
    )

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "")
      const num = parseInt(raw, 10) || 0
      setDisplay(num ? num.toLocaleString("id-ID") : "")
      onChange?.(num)
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 select-none text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn("pl-9", className)}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"
