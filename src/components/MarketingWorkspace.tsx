"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DashboardData = {
  periodStart: string;
  periodEnd: string;
  contactsHandled: number;
  periodPurchasesCount: number;
  periodGrossRevenue: number;
  periodAgentEarnings: number;
  totalGrossRevenue: number;
  totalAgentEarnings: number;
};

type ProfileData = {
  id: string;
  agentId: string;
  contactLimit: number;
  revenueSharePercent: number;
};

type Tag = {
  id: string;
  name: string;
  sourceGlobalTagId?: string | null;
};

type MarketingUser = {
  id: string;
  name: string;
  countryCode: string;
  phone: string;
  phoneNormalized: string;
  notes: string | null;
  lockedReceivedConfessions: number;
  isRegistered: boolean;
  tags: Tag[];
  purchasesByType: Record<string, number>;
  lastEditedAt: string;
  lastEditedKeys: string[];
};

type VisibilityState = {
  tags: boolean;
  notes: boolean;
  purchaseTypes: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

const purchaseTypeLabels: Record<string, string> = {
  SEND_CONFESSION: "Send Confession",
  UNLOCK_CONFESSION_CARD: "Unlock Card",
  UNLOCK_CONFESSION_PAGE: "Unlock Page",
  UNLOCK_PROFILE_INSIGHTS: "Unlock Insights",
  SELF_CONFESSION: "Self Confession",
  IDENTITY_REVEAL: "Identity Reveal",
};

const MARKETING_PURCHASE_TYPES = [
  "SEND_CONFESSION",
  "UNLOCK_CONFESSION_CARD",
  "UNLOCK_CONFESSION_PAGE",
  "UNLOCK_PROFILE_INSIGHTS",
  "IDENTITY_REVEAL",
];

export default function MarketingWorkspace() {
  const [tab, setTab] = useState<"dashboard" | "users" | "contacts">("dashboard");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<MarketingUser[]>([]);
  const [agentTags, setAgentTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editedInDays, setEditedInDays] = useState<string>("");
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    tags: true,
    notes: true,
    purchaseTypes: true,
  });

  const editingUser = useMemo(() => users.find((user) => user.id === editingUserId) ?? null, [editingUserId, users]);

  const fetchDashboard = useCallback(async (selectedPeriod: "week" | "month") => {
    const response = await fetch(`/api/internal/marketing/dashboard?period=${selectedPeriod}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to fetch dashboard");
    }

    setProfile(data.profile);
    setDashboard(data.dashboard);
  }, []);

  const fetchTags = useCallback(async () => {
    const response = await fetch("/api/internal/marketing/tags");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to fetch tags");
    }

    setAgentTags(data.agentTags ?? []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedTagIds.length > 0) {
      params.set("tagIds", selectedTagIds.join(","));
    }
    if (editedInDays) {
      params.set("editedInDays", editedInDays);
    }

    const response = await fetch(`/api/internal/marketing/users?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to fetch users");
    }

    setUsers(data.users ?? []);
    if (editingUserId && !(data.users ?? []).some((user: MarketingUser) => user.id === editingUserId)) {
      setEditingUserId(null);
    }
  }, [editedInDays, editingUserId, selectedTagIds]);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchDashboard(period), fetchTags(), fetchUsers()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load marketing workspace");
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchTags, fetchUsers, period]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void fetchDashboard(period).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Unable to refresh dashboard");
    });
  }, [fetchDashboard, period]);

  useEffect(() => {
    void fetchUsers().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Unable to refresh users");
    });
  }, [fetchUsers]);

  async function createPrivateTag(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return;
    }

    const response = await fetch("/api/internal/marketing/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to create tag");
    }

    await fetchTags();
  }

  async function removeTag(tagId: string) {
    const response = await fetch(`/api/internal/marketing/tags?id=${encodeURIComponent(tagId)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to remove tag");
    }

    await Promise.all([fetchTags(), fetchUsers()]);
  }

  async function saveUserEdit(formData: FormData) {
    if (!editingUser) {
      return;
    }

    const payload = {
      name: formData.get("name"),
      countryCode: formData.get("countryCode"),
      phone: formData.get("phone"),
      notes: formData.get("notes"),
      tagIds: agentTags
        .filter((tag) => formData.get(`tag-${tag.id}`) === "on")
        .map((tag) => tag.id),
    };

    const response = await fetch(`/api/internal/marketing/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to save user");
    }

    toast.success("User updated");
    await fetchUsers();
  }

  async function deleteUser(userId: string) {
    const response = await fetch(`/api/internal/marketing/users/${userId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to remove user");
    }

    toast.success("Contact removed");
    await fetchUsers();
  }

  async function addManualContact(formData: FormData) {
    const payload = {
      name: formData.get("name"),
      countryCode: formData.get("countryCode"),
      phone: formData.get("phone"),
      notes: formData.get("notes"),
      tagIds: agentTags.filter((tag) => formData.get(`new-tag-${tag.id}`) === "on").map((tag) => tag.id),
    };

    const response = await fetch("/api/internal/marketing/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to add contact");
    }

    toast.success("Contact saved");
    await fetchUsers();
  }

  async function importFile(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name) {
      return;
    }

    const payload = new FormData();
    payload.set("file", file);

    const response = await fetch("/api/internal/marketing/import", {
      method: "POST",
      body: payload,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to import contacts");
    }

    toast.success(`Import complete. Extracted ${data.extracted}, inserted ${data.inserted}, merged ${data.merged}`);
    await fetchUsers();
    await fetchDashboard(period);
  }

  const summaryCards = dashboard
    ? [
        { label: "Users handled", value: String(dashboard.contactsHandled) },
        { label: "Earnings this period", value: formatCurrency(dashboard.periodAgentEarnings) },
        { label: "Total earnings", value: formatCurrency(dashboard.totalAgentEarnings) },
        { label: "Gross revenue this period", value: formatCurrency(dashboard.periodGrossRevenue) },
      ]
    : [];

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>Marketing Workspace</h1>
        <p className="text-sm" style={{ color: "#735a43" }}>
          Agent ID: <span style={{ color: "#3f2c1d" }}>{profile?.agentId ?? "-"}</span> | Contact limit: {profile?.contactLimit ?? "-"} | Revenue share: {profile?.revenueSharePercent ?? 0}%
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "users", label: "Users" },
            { key: "contacts", label: "Contacts Import/Export" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className="px-4 py-2 rounded-xl text-sm"
              style={{
                background: tab === item.key ? "rgba(143,106,70,0.16)" : "rgba(255,251,245,0.85)",
                color: tab === item.key ? "#8f6a46" : "#8c7257",
                border: "1px solid rgba(184,159,126,0.22)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <p style={{ color: "#735a43" }}>Loading...</p> : null}

      {tab === "dashboard" ? (
        <>
          <section className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-medium" style={{ color: "#3f2c1d" }}>Earnings Dashboard</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPeriod("week")} className="px-3 py-2 rounded-lg text-xs" style={{ background: period === "week" ? "rgba(143,106,70,0.16)" : "rgba(255,251,245,0.9)", color: "#8f6a46", border: "1px solid rgba(184,159,126,0.22)" }}>Week</button>
                <button type="button" onClick={() => setPeriod("month")} className="px-3 py-2 rounded-lg text-xs" style={{ background: period === "month" ? "rgba(143,106,70,0.16)" : "rgba(255,251,245,0.9)", color: "#8f6a46", border: "1px solid rgba(184,159,126,0.22)" }}>Month</button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.22)" }}>
                  <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "#9b7c5d" }}>{card.label}</p>
                  <p className="text-2xl font-semibold mt-2" style={{ color: "#3f2c1d" }}>{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {tab === "users" ? (
        <section className="glass rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <h2 className="text-lg font-medium" style={{ color: "#3f2c1d" }}>Users</h2>
            <select
              value={editedInDays}
              onChange={(event) => setEditedInDays(event.target.value)}
              className="px-3 py-2 rounded-lg text-xs border"
              style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
            >
              <option value="">All edits</option>
              <option value="1">Edited in last 1 day</option>
              <option value="7">Edited in last 7 days</option>
              <option value="30">Edited in last 30 days</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "#8c7257" }}>
                <input
                  type="checkbox"
                  checked={columnVisibility.tags}
                  onChange={(event) => setColumnVisibility((prev) => ({ ...prev, tags: event.target.checked }))}
                />{" "}
                Tags
              </label>
              <label className="text-xs" style={{ color: "#8c7257" }}>
                <input
                  type="checkbox"
                  checked={columnVisibility.notes}
                  onChange={(event) => setColumnVisibility((prev) => ({ ...prev, notes: event.target.checked }))}
                />{" "}
                Notes
              </label>
              <label className="text-xs" style={{ color: "#8c7257" }}>
                <input
                  type="checkbox"
                  checked={columnVisibility.purchaseTypes}
                  onChange={(event) => setColumnVisibility((prev) => ({ ...prev, purchaseTypes: event.target.checked }))}
                />{" "}
                Purchase types
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {agentTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTagIds((prev) => selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                  className="px-3 py-1.5 rounded-full text-xs"
                  style={{
                    background: selected ? "rgba(143,106,70,0.16)" : "rgba(255,251,245,0.9)",
                    color: selected ? "#8f6a46" : "#8c7257",
                    border: "1px solid rgba(184,159,126,0.25)",
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full text-sm">
              <thead>
                <tr style={{ color: "#8c7257" }}>
                  <th className="text-left py-2">Name</th>
                  <th className="text-center py-2">Locked received confessions</th>
                  {columnVisibility.tags ? <th className="text-center py-2 pr-3">Tags</th> : null}
                  {columnVisibility.notes ? <th className="text-center py-2 pl-3">Note</th> : null}
                  {columnVisibility.purchaseTypes ? MARKETING_PURCHASE_TYPES.map((type) => (
                    <th key={type} className="text-center py-2">{purchaseTypeLabels[type] ?? type}</th>
                  )) : null}
                  <th className="text-center py-2">Last edited</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setEditingUserId(user.id)}
                    style={{ borderTop: "1px solid rgba(184,159,126,0.2)", color: "#3f2c1d" }}
                  >
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        {!user.isRegistered ? (
                          <span
                            aria-label="Unregistered user"
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: "#dc2626" }}
                          />
                        ) : null}
                        <span className="inline-flex flex-col items-start leading-tight">
                          <span>{user.name}</span>
                          <span className="text-[11px]" style={{ color: "#8c7257" }}>
                            {user.countryCode} {user.phone}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-center">{user.lockedReceivedConfessions}</td>
                    {columnVisibility.tags ? <td className="py-2.5 text-center">{user.tags.map((tag) => tag.name).join(", ") || "-"}</td> : null}
                    {columnVisibility.notes ? (
                      <td className="py-2.5 text-center">
                        {user.notes && user.notes.trim() ? "Edit note" : "Add note"}
                      </td>
                    ) : null}
                    {columnVisibility.purchaseTypes ? MARKETING_PURCHASE_TYPES.map((type) => (
                      <td key={`${user.id}-${type}`} className="py-2.5 text-center">{user.purchasesByType[type] ?? 0}</td>
                    )) : null}
                    <td className="py-2.5 text-center">{new Date(user.lastEditedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingUser ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.22)" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#3f2c1d" }}>Edit user</h3>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await saveUserEdit(new FormData(event.currentTarget));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to save user");
                  }
                }}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <input name="name" defaultValue={editingUser.name} className="px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                  <input name="countryCode" defaultValue={editingUser.countryCode} className="px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                  <input name="phone" defaultValue={editingUser.phone} className="px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                </div>
                <textarea name="notes" defaultValue={editingUser.notes ?? ""} className="w-full min-h-24 px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                <div className="grid gap-2 sm:grid-cols-3">
                  {agentTags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(255,251,245,0.88)", color: "#8c7257", border: "1px solid rgba(184,159,126,0.2)" }}>
                      <input type="checkbox" name={`tag-${tag.id}`} defaultChecked={editingUser.tags.some((userTag) => userTag.id === tag.id)} />
                      {tag.name}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>Save</button>
                  <button type="button" onClick={() => setEditingUserId(null)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>Close</button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteUser(editingUser.id);
                        setEditingUserId(null);
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to remove user");
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(198,145,85,0.14)", color: "#9f6c31" }}
                  >
                    Remove contact
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "contacts" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4 h-[560px] flex flex-col">
            <div className="glass rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-medium" style={{ color: "#3f2c1d" }}>Import & Export</h2>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  try {
                    await importFile(new FormData(form));
                    form.reset();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to import contacts");
                  }
                }}
              >
                <input name="file" type="file" accept=".csv,.xlsx,.docx,.pdf" className="block w-full text-sm" style={{ color: "#3f2c1d" }} />
                <div className="flex items-center justify-between gap-3">
                  <button type="submit" className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                    Import contacts
                  </button>
                  <a
                    href="/api/internal/marketing/export"
                    className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}
                  >
                    Export contacts
                  </a>
                </div>
              </form>
            </div>

            <div className="glass rounded-2xl p-5 space-y-4 flex-1 overflow-auto">
              <h3 className="text-sm font-semibold" style={{ color: "#3f2c1d" }}>Tag management</h3>
              <form
                className="flex gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  try {
                    await createPrivateTag(new FormData(form));
                    form.reset();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to add tag");
                  }
                }}
              >
                <input name="name" placeholder="Create private tag" className="flex-1 px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                <button type="submit" className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>Add</button>
              </form>

              <div className="space-y-1">
                {agentTags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between text-xs rounded-lg px-2 py-1.5" style={{ color: "#8c7257", background: "rgba(255,251,245,0.88)" }}>
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${tag.name}`}
                      onClick={async () => {
                        try {
                          await removeTag(tag.id);
                          toast.success("Tag removed");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Unable to remove tag");
                        }
                      }}
                      className="text-sm font-semibold leading-none px-1"
                      style={{ color: "#b45309" }}
                    >
                      x
                    </button>
                  </div>
                ))}
                {agentTags.length === 0 ? (
                  <p className="text-xs" style={{ color: "#8c7257" }}>No tags in your account.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 space-y-4 h-[560px] overflow-auto">
            <h2 className="text-lg font-medium" style={{ color: "#3f2c1d" }}>Manual Add Contact</h2>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                try {
                  await addManualContact(new FormData(form));
                  form.reset();
                  await fetchDashboard(period);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to save contact");
                }
              }}
            >
              <input name="name" placeholder="Name" className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
              <div className="grid gap-3 grid-cols-3">
                <input name="countryCode" placeholder="+91" defaultValue="+91" className="px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
                <input name="phone" placeholder="Phone number" className="col-span-2 px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
              </div>
              <textarea name="notes" placeholder="Optional note" className="w-full min-h-20 px-3 py-2 rounded-lg text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
              <div className="grid gap-2 sm:grid-cols-3">
                {agentTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(255,251,245,0.88)", color: "#8c7257", border: "1px solid rgba(184,159,126,0.2)" }}>
                    <input type="checkbox" name={`new-tag-${tag.id}`} />
                    {tag.name}
                  </label>
                ))}
              </div>
              <button type="submit" className="px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                Save contact
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
