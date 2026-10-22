import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  word: string;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({ word, busy, error, onCancel, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelAction = useRef(onCancel);
  const busyState = useRef(busy);
  cancelAction.current = onCancel;
  busyState.current = busy;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => confirmRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyState.current) cancelAction.current();
      if (event.key !== "Tab") return;
      event.preventDefault();
      (document.activeElement === confirmRef.current ? cancelRef : confirmRef).current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return createPortal(
    <div className="confirm-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <div className="confirm-dialog-top">
          <span className="confirm-dialog-icon"><Trash2 size={22} /></span>
          <button type="button" className="confirm-dialog-close" onClick={onCancel}
            disabled={busy} aria-label="Закрыть"><X size={20} /></button>
        </div>
        <span className="panel-kicker">УДАЛЕНИЕ СЛОВА</span>
        <h2 id="confirm-title">Удалить «{word}»?</h2>
        <p id="confirm-description">Карточка исчезнет из словаря и практики. Связанные с ней ответы больше не будут учитываться в статистике.</p>
        <div className="confirm-dialog-note"><AlertTriangle size={17} /> Это действие нельзя отменить</div>
        {error && <div className="confirm-dialog-error" role="alert">{error}</div>}
        <div className="confirm-dialog-actions">
          <button type="button" ref={cancelRef} className="secondary-button" onClick={onCancel} disabled={busy}>Оставить слово</button>
          <button type="button" ref={confirmRef} className="confirm-delete-button" onClick={onConfirm} disabled={busy}>
            <Trash2 size={17} /> {busy ? "Удаляем…" : "Да, удалить"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
