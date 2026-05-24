"use client"

import { useEffect } from "react"
import { useUIStore } from "@/stores/uiStore"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, removeToast } = useUIStore()

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          duration={toast.duration}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id)
          }}
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

// Auto-dismiss timer hook
export function useAutoDismiss() {
  const { toasts, removeToast } = useUIStore()

  useEffect(() => {
    toasts.forEach((toast) => {
      const duration = toast.duration ?? 5000
      const timer = setTimeout(() => {
        removeToast(toast.id)
      }, duration)
      return () => clearTimeout(timer)
    })
  }, [toasts, removeToast])
}
