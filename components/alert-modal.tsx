"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: "info" | "success" | "warning" | "error"
  actionLabel?: string
}

const variantConfig = {
  info: {
    icon: Info,
    iconColor: "text-primary",
    bgColor: "bg-primary/10",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-success",
    bgColor: "bg-success/10",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-warning",
    bgColor: "bg-warning/10",
  },
  error: {
    icon: XCircle,
    iconColor: "text-destructive",
    bgColor: "bg-destructive/10",
  },
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  actionLabel = "OK",
}: AlertModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn("rounded-full p-3", config.bgColor)}>
              <Icon className={cn("size-8", config.iconColor)} />
            </div>
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction className="min-w-32">
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
