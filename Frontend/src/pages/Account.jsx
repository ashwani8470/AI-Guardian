import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">My account</h1>
      <p className="mt-1 text-sm text-textSecondary">Your account details.</p>

      <div className="mt-8 max-w-md space-y-4 rounded-md border border-hairline bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-textSecondary/70">Name</p>
          <p className="mt-1 text-sm text-textPrimary">{user?.name || "—"}</p>
        </div>
        <div className="border-t border-hairline pt-4">
          <p className="text-xs uppercase tracking-wide text-textSecondary/70">Email</p>
          <p className="mt-1 text-sm text-textPrimary">{user?.email || "—"}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-textSecondary">
        Password changes and other account settings are coming soon.
      </p>
    </div>
  );
}
