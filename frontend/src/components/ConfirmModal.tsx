import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative shadow-2xl w-full p-6 animate-fade-in max-w-md mx-0 sm:mx-4 rounded-none sm:rounded-xl h-full sm:h-auto flex flex-col justify-center"
        style={{ background: "#0e0c09", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md text-[#6b6455] hover:text-[#e8e3d8] transition-colors"
          style={{ background: "transparent" }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className="shrink-0 rounded-full p-2.5"
            style={{ background: isDanger ? "rgba(217, 107, 92,0.1)" : "rgba(255,165,2,0.1)" }}
          >
            <AlertTriangle
              className="h-5 w-5"
              style={{ color: isDanger ? "#d96b5c" : "#e3b454" }}
            />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-[#e8e3d8]">{title}</h3>
            <p className="text-sm text-[#8a8271] mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#e8e3d8] disabled:opacity-50 transition-all duration-150"
            style={{ background: "#12100b", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 transition-all duration-150"
            style={{ background: isDanger ? "#d96b5c" : "#e3b454" }}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
