import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#2D6A4F] text-white hover:bg-[#1B4332] rounded-lg font-medium",
        outline:
          "border border-[#2D6A4F]/20 bg-background hover:bg-muted hover:text-foreground rounded-lg font-medium",
        secondary:
          "border border-[#2D6A4F] text-[#2D6A4F] bg-transparent hover:bg-[#D8F3DC] rounded-lg font-medium",
        ghost:
          "hover:bg-muted hover:text-foreground rounded-lg font-medium",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#DC2626]/90 rounded-lg font-medium",
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 py-2",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs",
        sm: "h-8 gap-1 rounded-lg px-3 text-xs",
        lg: "h-10 gap-1.5 px-5 rounded-lg",
        icon: "size-8 rounded-lg",
        "icon-xs":
          "size-6 rounded-lg",
        "icon-sm":
          "size-7 rounded-lg",
        "icon-lg": "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
