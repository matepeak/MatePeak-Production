import { useTheme } from "next-themes";
import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;
type ToastData = NonNullable<Parameters<typeof sonnerToast.success>[1]>;
type LegacyToastPayload = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: string;
  action?: unknown;
  duration?: number;
};

const TOAST_DURATIONS = {
  default: 6000,
  success: 4000,
  info: 6000,
  warning: 7000,
  error: 8000,
  loading: Infinity,
} as const;

const withDuration = (data: ToastData | undefined, fallback: number) => ({
  ...data,
  duration: data?.duration ?? fallback,
});

const withoutDescription = (data: ToastData | undefined) => {
  if (!data) return undefined;
  const { description: _description, ...rest } = data;
  return rest as ToastData;
};

const isLegacyPayload = (value: unknown): value is LegacyToastPayload => {
  if (!value || typeof value !== "object") return false;
  return (
    "title" in value ||
    "description" in value ||
    "variant" in value ||
    "action" in value
  );
};

const normalizeLegacyAction = (action?: unknown) => {
  if (!action) return undefined;

  const toActionHandler = (handler: unknown) => {
    if (typeof handler !== "function") return undefined;
    return (_event: React.MouseEvent<HTMLButtonElement>) => {
      (handler as (...args: unknown[]) => unknown)();
    };
  };

  const directAction = action as { label?: unknown; onClick?: unknown };
  const directHandler = toActionHandler(directAction.onClick);
  if (
    typeof directAction.label === "string" &&
    directHandler
  ) {
    return { label: directAction.label, onClick: directHandler };
  }

  const actionProps = (action as { props?: Record<string, unknown> }).props || {};
  const childLabel =
    typeof actionProps.children === "string" ? actionProps.children : undefined;
  const label =
    childLabel ||
    (typeof actionProps.altText === "string" ? actionProps.altText : "Action");
  const actionHandler = toActionHandler(actionProps.onClick);
  if (!actionHandler) return undefined;
  return { label, onClick: actionHandler };
};

const renderLegacyPayload = (payload: LegacyToastPayload) => {
  const message = payload.title ?? payload.description ?? "Notification";
  const description = payload.title ? payload.description : undefined;
  const action = normalizeLegacyAction(payload.action);
  const variant = String(payload.variant || "default").toLowerCase();
  const options = withDuration({ description, action, duration: payload.duration }, TOAST_DURATIONS.default);

  if (variant === "destructive" || variant === "error") {
    return sonnerToast.error(message, withDuration(options, TOAST_DURATIONS.error));
  }
  if (variant === "warning") {
    return sonnerToast.warning(message, withDuration(options, TOAST_DURATIONS.warning));
  }
  if (variant === "info") {
    return sonnerToast.info(message, withDuration(options, TOAST_DURATIONS.info));
  }
  if (variant === "success") {
    return sonnerToast.success(
      message,
      withDuration(withoutDescription(options), TOAST_DURATIONS.success)
    );
  }

  return sonnerToast(message, withDuration(options, TOAST_DURATIONS.default));
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      dir="auto"
      gap={12}
      visibleToasts={4}
      closeButton
      richColors={false}
      expand={true}
      duration={TOAST_DURATIONS.default}
      pauseWhenPageIsHidden={false}
      icons={{
        success: <CircleCheck className="h-5 w-5" />,
        error: <CircleX className="h-5 w-5" />,
        warning: <TriangleAlert className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        loading: <Loader2 className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        duration: TOAST_DURATIONS.default,
        unstyled: false,
        classNames: {
          toast:
            "group toast group-[.toaster]:relative group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-md group-[.toaster]:rounded-xl group-[.toaster]:px-5 group-[.toaster]:pr-12 group-[.toaster]:py-4 group-[.toaster]:min-h-[72px] group-[.toaster]:items-center",
          title:
            "group-[.toast]:text-base group-[.toast]:font-semibold group-[.toast]:text-black",
          description:
            "group-[.toast]:text-sm group-[.toast]:text-gray-600 group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:hover:bg-gray-50 group-[.toast]:border group-[.toast]:border-gray-300 group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-md group-[.toast]:font-medium group-[.toast]:text-sm group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-white group-[.toast]:text-gray-700 group-[.toast]:hover:bg-gray-50 group-[.toast]:border group-[.toast]:border-gray-300 group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-md group-[.toast]:font-medium group-[.toast]:text-sm group-[.toast]:transition-colors",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-3 group-[.toast]:top-3 group-[.toast]:bg-white group-[.toast]:hover:bg-gray-100 group-[.toast]:border group-[.toast]:border-gray-200 group-[.toast]:text-gray-700 group-[.toast]:rounded-md group-[.toast]:transition-colors",
          success:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-emerald-200",
          error:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-red-200",
          warning:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-amber-200",
          info: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-blue-200",
          loading:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-gray-300",
        },
      }}
      {...props}
    />
  );
};

// Wrap the toast functions to enforce duration of 6 seconds
const toast = Object.assign(
  (message: string | React.ReactNode | LegacyToastPayload, data?: ToastData) => {
    if (isLegacyPayload(message)) {
      return renderLegacyPayload(message);
    }
    return sonnerToast(message, withDuration(data, TOAST_DURATIONS.default));
  },
  {
    success: (message: string | React.ReactNode, data?: ToastData) =>
      sonnerToast.success(message, {
        ...withDuration(withoutDescription(data), TOAST_DURATIONS.success),
      }),
    error: (message: string | React.ReactNode, data?: ToastData) =>
      sonnerToast.error(message, withDuration(data, TOAST_DURATIONS.error)),
    warning: (message: string | React.ReactNode, data?: ToastData) =>
      sonnerToast.warning(message, {
        ...withDuration(data, TOAST_DURATIONS.warning),
      }),
    info: (message: string | React.ReactNode, data?: ToastData) =>
      sonnerToast.info(message, withDuration(data, TOAST_DURATIONS.info)),
    loading: (message: string | React.ReactNode, data?: ToastData) =>
      sonnerToast.loading(message, {
        ...withDuration(data, TOAST_DURATIONS.loading),
      }),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
  }
);

export { Toaster, toast };
