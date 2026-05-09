import { useEffect } from "react";
import { useToastStore } from "../lib/toast.js";

function ToastItem({
  id,
  message,
  type,
  duration,
}: {
  id: string;
  message: string;
  type: "success" | "error";
  duration: number;
}) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      <span>{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-80 -translate-x-1/2 flex-col gap-2 sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
