import { Link } from "react-router-dom";

function TextIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 5h16M4 10h16M4 15h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 7l7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9.5 14.5l5-5M8 16l-1.8 1.8a3 3 0 01-4.2-4.2L4 11.6M16 8l1.8-1.8a3 3 0 014.2 4.2L20 12.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QrIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 15.5h2M18.5 18.5h2M15.5 20.5h2M20.5 15.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ScreenshotIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 15.5l3-3.2 2.3 2 2.7-3.3 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.2" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}

const TILES = [
  {
    to: "/app/scan/text",
    title: "Text & SMS",
    body: "Paste a message to check for scam language.",
    Icon: TextIcon,
  },
  {
    to: "/app/scan/email",
    title: "Email",
    body: "Check a suspicious email before you click anything.",
    Icon: EmailIcon,
  },
  {
    to: "/app/scan/url",
    title: "Links & URLs",
    body: "See if a link leads somewhere it shouldn't.",
    Icon: LinkIcon,
  },
  {
    to: "/app/scan/qr",
    title: "QR codes",
    body: "Upload a QR code image before you scan it in real life.",
    Icon: QrIcon,
  },
  {
    to: "/app/scan/screenshot",
    title: "Payment screenshot",
    body: "Check a payment request or receipt screenshot.",
    Icon: ScreenshotIcon,
  },
];

export default function Overview() {
  return (
    <div>
      <div className="rounded-lg border border-hairline bg-gradient-to-br from-surface to-surfaceRaised px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-textPrimary sm:text-3xl">
          What do you want to check today?
        </h1>
        <p className="mt-2 max-w-lg text-sm text-textSecondary">
          Pick a scan type below, or review what you've already checked in your history.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TILES.map(({ to, title, body, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group relative overflow-hidden rounded-lg border border-hairline bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand transition-colors group-hover:bg-brand/20">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-base font-semibold text-textPrimary group-hover:text-brand">
              {title}
            </h2>
            <p className="mt-1 text-sm text-textSecondary">{body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
              Check now →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
