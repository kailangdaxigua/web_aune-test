"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "确认操作",
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!loading) onCancel();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-[#11111a] shadow-2xl">
        <div className="border-b border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        {description && (
          <div className="px-5 py-4 text-sm text-zinc-300">{description}</div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3 text-xs">
          <button
            type="button"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900 disabled:opacity-60"
            onClick={() => {
              if (!loading) onCancel();
            }}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500 px-3 py-1.5 font-medium text-white hover:bg-red-600 disabled:opacity-60"
            onClick={() => {
              if (!loading) onConfirm();
            }}
            disabled={loading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
