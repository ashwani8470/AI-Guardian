export default function ShieldMark({ size = 28, className = "", glow = false }) {
  const gradientId = "ag-shield-gradient";

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {glow && (
        <defs>
          <linearGradient id={gradientId} x1="4" y1="2" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2L4 5v6c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V5l-8-3z"
        fill={glow ? `url(#${gradientId})` : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2l2.3 2.3 4.7-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
