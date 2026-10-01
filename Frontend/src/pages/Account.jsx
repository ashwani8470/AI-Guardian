import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import DataControls from "../components/DataControls";
import { useT } from "../i18n";

export default function Account() {
  const { updateUser } = useAuth();
  const t = useT();
  const genderLabel = (g) => (g ? t(`account.${g}`) : "—");

  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    gender: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const data = await api.getProfile();
        if (!cancelled) {
          setProfile(data);
          setForm({
            name: data.name || "",
            phone_number: data.phone_number || "",
            gender: data.gender || "",
            address: data.address || "",
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit() {
    setError("");
    setMode("edit");
  }

  function cancelEdit() {
    // Reset the form back to the last-saved profile values.
    if (profile) {
      setForm({
        name: profile.name || "",
        phone_number: profile.phone_number || "",
        gender: profile.gender || "",
        address: profile.address || "",
      });
    }
    setError("");
    setMode("view");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateProfile({
        name: form.name,
        phone_number: form.phone_number,
        gender: form.gender,
        address: form.address,
      });
      setProfile(updated);
      updateUser(updated);
      setMode("view");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("nav.account")}</h1>
        <p className="mt-4 text-sm text-textSecondary">{t("common.loading")}</p>
      </div>
    );
  }

  if (mode === "view") {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("nav.account")}</h1>
        <p className="mt-1 text-sm text-textSecondary">{t("account.subtitle")}</p>

        <div className="mt-8 max-w-md space-y-4 rounded-md border border-hairline bg-surface p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.name")}</p>
            <p className="mt-1 text-sm text-textPrimary">{profile?.name || "—"}</p>
          </div>
          <div className="border-t border-hairline pt-4">
            <p className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.email")}</p>
            <p className="mt-1 text-sm text-textPrimary">{profile?.email || "—"}</p>
          </div>
          <div className="border-t border-hairline pt-4">
            <p className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.phone")}</p>
            <p className="mt-1 text-sm text-textPrimary">{profile?.phone_number || "—"}</p>
          </div>
          <div className="border-t border-hairline pt-4">
            <p className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.gender")}</p>
            <p className="mt-1 text-sm text-textPrimary">
              {genderLabel(profile?.gender)}
            </p>
          </div>
          <div className="border-t border-hairline pt-4">
            <p className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.address")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-textPrimary">
              {profile?.address || "—"}
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          onClick={startEdit}
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          {t("account.edit")}
        </button>

        <DataControls />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("nav.account")}</h1>
      <p className="mt-1 text-sm text-textSecondary">{t("account.editSubtitle")}</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-md space-y-4 rounded-md border border-hairline bg-surface p-5"
      >
        <div>
          <label className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.name")}</label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange("name")}
            className="mt-1 w-full rounded border border-hairline bg-transparent px-3 py-2 text-sm text-textPrimary"
          />
        </div>

        <div className="border-t border-hairline pt-4">
          <label className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.email")}</label>
          <p className="mt-1 text-sm text-textPrimary">{profile?.email}</p>
          <p className="mt-1 text-xs text-textSecondary/60">{t("account.emailNote")}</p>
        </div>

        <div className="border-t border-hairline pt-4">
          <label className="text-xs uppercase tracking-wide text-textSecondary/70">
            {t("account.phone")}
          </label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={handleChange("phone_number")}
            className="mt-1 w-full rounded border border-hairline bg-transparent px-3 py-2 text-sm text-textPrimary"
          />
        </div>

        <div className="border-t border-hairline pt-4">
          <label className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.gender")}</label>
          <select
            value={form.gender}
            onChange={handleChange("gender")}
            className="mt-1 w-full rounded border border-hairline bg-transparent px-3 py-2 text-sm text-textPrimary"
          >
            <option value="">{t("account.preferNot")}</option>
            <option value="male">{t("account.male")}</option>
            <option value="female">{t("account.female")}</option>
            <option value="other">{t("account.other")}</option>
          </select>
        </div>

        <div className="border-t border-hairline pt-4">
          <label className="text-xs uppercase tracking-wide text-textSecondary/70">{t("account.address")}</label>
          <textarea
            value={form.address}
            onChange={handleChange("address")}
            rows={3}
            className="mt-1 w-full rounded border border-hairline bg-transparent px-3 py-2 text-sm text-textPrimary"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("account.saving") : t("account.save")}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="rounded border border-hairline px-4 py-2 text-sm font-medium text-textSecondary hover:text-textPrimary disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
