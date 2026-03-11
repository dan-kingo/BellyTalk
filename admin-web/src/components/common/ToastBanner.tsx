import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastBannerVariant = "success" | "error" | "info";

interface ToastBannerProps {
  message: string;
  variant?: ToastBannerVariant;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<
  ToastBannerVariant,
  {
    container: string;
    icon: typeof CheckCircle2;
    iconClassName: string;
  }
> = {
  success: {
    container:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
    icon: CheckCircle2,
    iconClassName: "text-green-600 dark:text-green-400",
  },
  error: {
    container:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
    icon: AlertCircle,
    iconClassName: "text-red-600 dark:text-red-400",
  },
  info: {
    container:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    icon: Info,
    iconClassName: "text-blue-600 dark:text-blue-400",
  },
};

const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  variant = "info",
  onClose,
  className = "",
}) => {
  const config = variantStyles[variant];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${config.container} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconClassName}`} />
        <p className="flex-1">{message}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ToastBanner;
