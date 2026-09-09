import { Link } from "react-router-dom";

const TILES = [
  {
    to: "/app/scan/text",
    title: "Text & SMS",
    body: "Paste a message to check for scam language.",
  },
  {
    to: "/app/scan/email",
    title: "Email",
    body: "Check a suspicious email before you click anything.",
  },
  {
    to: "/app/scan/url",
    title: "Links & URLs",
    body: "See if a link leads somewhere it shouldn't.",
  },
  {
    to: "/app/scan/qr",
    title: "QR codes",
    body: "Upload a QR code image before you scan it in real life.",
  },
  {
    to: "/app/scan/screenshot",
    title: "Payment screenshot",
    body: "Check a payment request or receipt screenshot.",
  },
];

export default function Overview() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">
        What do you want to check today?
      </h1>
      <p className="mt-1 text-sm text-textSecondary">
        Pick a scan type below, or review what you've already checked in your history.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group rounded-md border border-hairline bg-surface p-5 transition-colors hover:border-brand/50"
          >
            <h2 className="font-display text-base font-semibold text-textPrimary group-hover:text-brand">
              {tile.title}
            </h2>
            <p className="mt-1 text-sm text-textSecondary">{tile.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
