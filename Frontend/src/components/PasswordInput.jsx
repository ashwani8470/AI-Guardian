import { useState } from "react";

// Password field with a show/hide (eye) button. Takes the usual input props
// (id, value, onChange, required, minLength, autoComplete, ...).
export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-md border border-hairline bg-surface py-2 pl-3 pr-10 text-sm text-textPrimary outline-none focus:border-brand ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-textSecondary transition-colors hover:text-textPrimary"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 4.5 10 6-.5.8-1.6 2.1-3.1 3.3M6.6 6.7C4.3 8.1 2.7 10.2 2 12c1 1.5 5 6 10 6 1.5 0 2.9-.4 4.1-1" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c1-1.5 5-6 10-6s9 4.5 10 6c-1 1.5-5 6-10 6S3 13.5 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
