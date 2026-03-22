import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

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
      richColors
      expand={true}
      duration={6000}
      pauseWhenPageIsHidden={false}
      toastOptions={{
        duration: 6000,
        unstyled: false,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:px-6 group-[.toaster]:py-4 group-[.toaster]:backdrop-blur-md group-[.toaster]:min-h-[72px] group-[.toaster]:items-center",
          title:
            "group-[.toast]:text-base group-[.toast]:font-semibold group-[.toast]:text-inherit",
          description:
            "group-[.toast]:text-sm group-[.toast]:text-inherit group-[.toast]:opacity-90 group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-white/90 group-[.toast]:text-slate-900 group-[.toast]:hover:bg-white group-[.toast]:border group-[.toast]:border-black/10 group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-sm group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-white/80 group-[.toast]:text-slate-700 group-[.toast]:hover:bg-white group-[.toast]:border group-[.toast]:border-black/10 group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-sm group-[.toast]:transition-colors",
          closeButton:
            "group-[.toast]:bg-white/80 group-[.toast]:hover:bg-white group-[.toast]:border-black/10 group-[.toast]:text-current group-[.toast]:rounded-lg group-[.toast]:transition-colors",
          success:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-green-50 group-[.toast]:to-emerald-50 group-[.toast]:border-green-200 group-[.toast]:text-green-900",
          error:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-red-50 group-[.toast]:to-rose-50 group-[.toast]:border-red-200 group-[.toast]:text-red-900",
          warning:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-yellow-50 group-[.toast]:to-amber-50 group-[.toast]:border-yellow-200 group-[.toast]:text-amber-900",
          info: "group-[.toast]:bg-gradient-to-r group-[.toast]:from-blue-50 group-[.toast]:to-cyan-50 group-[.toast]:border-blue-200 group-[.toast]:text-blue-900",
          loading:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-gray-50 group-[.toast]:to-slate-50 group-[.toast]:border-gray-300 group-[.toast]:text-slate-900",
        },
      }}
      {...props}
    />
  );
};

// Wrap the toast functions to enforce duration of 6 seconds
const toast = Object.assign(
  (message: string | React.ReactNode, data?: any) =>
    sonnerToast(message, { ...data, duration: data?.duration ?? 6000 }),
  {
    success: (message: string | React.ReactNode, data?: any) =>
      sonnerToast.success(message, {
        ...data,
        duration: data?.duration ?? 6000,
      }),
    error: (message: string | React.ReactNode, data?: any) =>
      sonnerToast.error(message, { ...data, duration: data?.duration ?? 6000 }),
    warning: (message: string | React.ReactNode, data?: any) =>
      sonnerToast.warning(message, {
        ...data,
        duration: data?.duration ?? 6000,
      }),
    info: (message: string | React.ReactNode, data?: any) =>
      sonnerToast.info(message, { ...data, duration: data?.duration ?? 6000 }),
    loading: (message: string | React.ReactNode, data?: any) =>
      sonnerToast.loading(message, {
        ...data,
        duration: data?.duration ?? Infinity,
      }),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
  }
);

export { Toaster, toast };
