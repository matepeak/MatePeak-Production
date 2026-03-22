import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"
import { toast as sonnerToast } from "@/components/ui/sonner"

type LegacyToast = Omit<ToastProps, "id"> & {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const normalizeAction = (action?: ToastActionElement) => {
  if (!action) return undefined

  const actionProps = (action as React.ReactElement<any>).props || {}
  const childLabel =
    typeof actionProps.children === "string" ? actionProps.children : undefined
  const label = childLabel || actionProps.altText || "Action"

  if (typeof actionProps.onClick !== "function") {
    return undefined
  }

  return {
    label,
    onClick: actionProps.onClick,
  }
}

const normalizeMessage = (payload: LegacyToast) => {
  const message = payload.title ?? payload.description ?? "Notification"
  const description = payload.title ? payload.description : undefined
  return { message, description }
}

function toast(payload: LegacyToast) {
  const { message, description } = normalizeMessage(payload)
  const action = normalizeAction(payload.action)

  const show = () => {
    if (payload.variant === "destructive") {
      return sonnerToast.error(message, { description, action })
    }

    return sonnerToast(message, { description, action })
  }

  let id = show()

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (nextPayload: LegacyToast) => {
      sonnerToast.dismiss(id)
      id = toast(nextPayload).id
      return id
    },
  }
}

function useToast() {
  return {
    toasts: [] as Array<LegacyToast & { id: string }>,
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  }
}

export { useToast, toast }
