import { useRef, useState } from "react";

export default function ImageDropInput({ file, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleFile(f) {
    if (!f) return;
    onChange(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className="cursor-pointer rounded-md border border-dashed border-hairline bg-surface p-8 text-center transition-colors hover:border-brand/50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {preview ? (
        <img src={preview} alt="Selected file preview" className="mx-auto max-h-48 rounded-md" />
      ) : (
        <>
          <p className="text-sm text-textPrimary">Click to upload, or drag an image here</p>
          <p className="mt-1 text-xs text-textSecondary">PNG or JPG</p>
        </>
      )}
      {file && <p className="mt-3 text-xs text-textSecondary">{file.name}</p>}
    </div>
  );
}
