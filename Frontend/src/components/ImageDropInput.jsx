import { useEffect, useMemo, useRef } from "react";
import { useT } from "../i18n";

export default function ImageDropInput({ file, onChange }) {
  const t = useT();
  const inputRef = useRef(null);

  // Preview is derived from the `file` prop, so clearing the file from the
  // parent (or with the ✕ button) also clears the preview. The small blob URL
  // is released by the browser when the page unloads.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  // When the file is cleared, reset the native input so the same image can be picked again.
  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  function handleFile(f) {
    if (!f) return;
    onChange(f);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className="relative cursor-pointer rounded-md border border-dashed border-hairline bg-surface p-8 text-center transition-colors hover:border-brand/50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {file && (
        <button
          type="button"
          title={t("common.removeImage")}
          aria-label={t("common.removeImage")}
          onClick={(e) => {
            e.stopPropagation(); // don't reopen the file picker
            onChange(null);
          }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surfaceRaised text-textSecondary transition-colors hover:text-textPrimary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      {preview ? (
        <img src={preview} alt="Selected file preview" className="mx-auto max-h-48 rounded-md" />
      ) : (
        <>
          <p className="text-sm text-textPrimary">{t("common.dropHere")}</p>
          <p className="mt-1 text-xs text-textSecondary">{t("common.imageTypes")}</p>
        </>
      )}
      {file && <p className="mt-3 text-xs text-textSecondary">{file.name}</p>}
    </div>
  );
}
