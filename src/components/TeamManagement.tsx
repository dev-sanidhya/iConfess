"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  STAFF_PERMISSIONS,
  STAFF_ROLES,
  STAFF_STATUSES,
  type StaffPermission,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-types";

type StaffAccount = {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: StaffPermission[];
  createdAt: string | Date;
  updatedAt: string | Date;
  marketingAgentProfile?: {
    agentId: string;
    contactLimit: number;
    revenueSharePercent: number;
  } | null;
};

type GlobalTag = {
  id: string;
  name: string;
};

type TeamManagementProps = {
  initialAccounts: StaffAccount[];
};

const employeePermissions = [...STAFF_PERMISSIONS];

export default function TeamManagement({ initialAccounts }: TeamManagementProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [globalTags, setGlobalTags] = useState<GlobalTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [createRole, setCreateRole] = useState<StaffRole>("EMPLOYEE");

  const employeeAccounts = useMemo(() => accounts.filter((account) => account.role !== "MARKETING_AGENT"), [accounts]);
  const marketingAccounts = useMemo(() => accounts.filter((account) => account.role === "MARKETING_AGENT"), [accounts]);

  useEffect(() => {
    void refreshGlobalTags();
  }, []);

  async function refreshAccounts() {
    const response = await fetch("/api/internal/staff/accounts");
    const data = await response.json();
    if (response.ok) {
      setAccounts(data.accounts);
    }
  }

  async function refreshGlobalTags() {
    const response = await fetch("/api/internal/marketing/global-tags");
    const data = await response.json();
    if (response.ok) {
      setGlobalTags(data.tags ?? []);
    }
  }

  async function handleCreate(formData: FormData) {
    setLoading(true);
    try {
      const role = (formData.get("role") as StaffRole) ?? "EMPLOYEE";
      const payload = {
        name: formData.get("name"),
        username: formData.get("username"),
        password: formData.get("password"),
        role,
        permissions: role === "MARKETING_AGENT"
          ? []
          : employeePermissions.filter((permission) => formData.get(permission) === "on"),
        contactLimit: Number(formData.get("contactLimit") ?? 500),
        revenueSharePercent: Number(formData.get("revenueSharePercent") ?? 0),
      };

      const response = await fetch("/api/internal/staff/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success(role === "MARKETING_AGENT" ? "Marketing agent created" : "Staff account created");
      await refreshAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/internal/staff/accounts?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Account deleted");
      await refreshAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete account");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(
    id: string,
    updates: Partial<StaffAccount> & {
      password?: string;
      contactLimit?: number;
      revenueSharePercent?: number;
    }
  ) {
    setLoading(true);
    try {
      const response = await fetch("/api/internal/staff/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Account updated");
      await refreshAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account");
    } finally {
      setLoading(false);
    }
  }

  async function createGlobalTag(name: string) {
    try {
      const response = await fetch("/api/internal/marketing/global-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Tag saved");
      await refreshGlobalTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save tag");
    }
  }

  async function deleteGlobalTag(id: string) {
    try {
      const response = await fetch(`/api/internal/marketing/global-tags?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success("Tag removed");
      await refreshGlobalTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete tag");
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>User Access</h1>
        <p className="text-sm mb-5" style={{ color: "#735a43" }}>
          Keep employee access and marketing agent access as separate flows.
        </p>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
            event.currentTarget.reset();
            setCreateRole("EMPLOYEE");
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <input name="name" placeholder="Full name" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <input name="username" placeholder="Username" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <input type="password" name="password" placeholder="Password" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <select
            name="role"
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value as StaffRole)}
          >
            <option value={STAFF_ROLES[1]}>EMPLOYEE</option>
            <option value={STAFF_ROLES[2]}>MARKETING_AGENT</option>
            <option value={STAFF_ROLES[0]}>ADMIN</option>
          </select>

          {createRole === "MARKETING_AGENT" ? (
            <>
              <input
                name="contactLimit"
                type="number"
                min={1}
                defaultValue={500}
                placeholder="Contact limit"
                className="px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
              />
              <input
                name="revenueSharePercent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={0}
                placeholder="Revenue share (%)"
                className="px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
              />
            </>
          ) : null}

          {createRole !== "MARKETING_AGENT" ? (
            <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
              {employeePermissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,251,245,0.88)", color: "#8c7257", border: "1px solid rgba(184,159,126,0.2)" }}>
                  <input type="checkbox" name={permission} defaultChecked />
                  {permission}
                </label>
              ))}
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="md:col-span-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
            {loading ? "Saving..." : "Create Account"}
          </button>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Employee Access</h2>
          <div className="space-y-3">
            {employeeAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const role = formData.get("role") as StaffRole;
                    await handleUpdate(account.id, {
                      name: String(formData.get("name") ?? account.name),
                      username: String(formData.get("username") ?? account.username ?? ""),
                      password: String(formData.get("password") ?? ""),
                      role,
                      status: formData.get("status") as StaffStatus,
                      permissions: role === "ADMIN"
                        ? employeePermissions
                        : employeePermissions.filter((permission) => formData.get(`${account.id}-${permission}`) === "on"),
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <input name="name" defaultValue={account.name} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                    <input name="username" defaultValue={account.username} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                    <input name="password" type="password" placeholder="New password (optional)" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                    <select name="role" defaultValue={account.role} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}>
                      <option value={STAFF_ROLES[1]}>EMPLOYEE</option>
                      <option value={STAFF_ROLES[0]}>ADMIN</option>
                    </select>
                    <select name="status" defaultValue={account.status} className="px-4 py-2.5 rounded-xl text-sm border md:col-span-2" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}>
                      <option value={STAFF_STATUSES[0]}>ACTIVE</option>
                      <option value={STAFF_STATUSES[1]}>INACTIVE</option>
                    </select>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {employeePermissions.map((permission) => (
                      <label key={`${account.id}-${permission}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,251,245,0.88)", color: "#8c7257", border: "1px solid rgba(184,159,126,0.2)" }}>
                        <input type="checkbox" name={`${account.id}-${permission}`} defaultChecked={account.permissions.includes(permission)} />
                        {permission}
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>
                      Save changes
                    </button>
                    <button type="button" onClick={() => handleDelete(account.id)} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(198,145,85,0.14)", color: "#9f6c31" }}>
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            ))}
            {employeeAccounts.length === 0 ? (
              <p className="text-sm" style={{ color: "#8c7257" }}>No employee/admin accounts yet.</p>
            ) : null}
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Marketing Agent Access</h2>
            <div className="space-y-3">
              {marketingAccounts.map((account) => (
                <div key={account.id} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      await handleUpdate(account.id, {
                        name: String(formData.get("name") ?? account.name),
                        username: String(formData.get("username") ?? account.username),
                        password: String(formData.get("password") ?? ""),
                        role: "MARKETING_AGENT",
                        status: formData.get("status") as StaffStatus,
                        permissions: [],
                        contactLimit: Number(formData.get("contactLimit") ?? account.marketingAgentProfile?.contactLimit ?? 500),
                        revenueSharePercent: Number(formData.get("revenueSharePercent") ?? account.marketingAgentProfile?.revenueSharePercent ?? 0),
                      });
                    }}
                    className="space-y-3"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <input name="name" defaultValue={account.name} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                      <input name="username" defaultValue={account.username} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                      <input name="password" type="password" placeholder="New password (optional)" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                      <select name="status" defaultValue={account.status} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}>
                        <option value={STAFF_STATUSES[0]}>ACTIVE</option>
                        <option value={STAFF_STATUSES[1]}>INACTIVE</option>
                      </select>
                      <input name="contactLimit" type="number" min={1} defaultValue={account.marketingAgentProfile?.contactLimit ?? 500} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                      <input name="revenueSharePercent" type="number" min={0} max={100} step="0.01" defaultValue={account.marketingAgentProfile?.revenueSharePercent ?? 0} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                    </div>

                    <div className="text-xs" style={{ color: "#8c7257" }}>
                      Agent ID: <span style={{ color: "#3f2c1d" }}>{account.marketingAgentProfile?.agentId ?? "Will be generated on save"}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>
                        Save changes
                      </button>
                      <button type="button" onClick={() => handleDelete(account.id)} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(198,145,85,0.14)", color: "#9f6c31" }}>
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              ))}
              {marketingAccounts.length === 0 ? (
                <p className="text-sm" style={{ color: "#8c7257" }}>No marketing agents yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#3f2c1d" }}>Marketing Global Tags</h3>
            <form
              className="flex gap-2 mb-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                if (!name) {
                  return;
                }

                await createGlobalTag(name);
                event.currentTarget.reset();
              }}
            >
              <input name="name" placeholder="Add tag" className="px-3 py-2 rounded-xl text-sm border flex-1" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
              <button type="submit" className="px-3 py-2 rounded-xl text-xs font-medium text-white" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
                Save
              </button>
              <button type="button" onClick={refreshGlobalTags} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>
                Refresh
              </button>
            </form>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {globalTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.2)", color: "#3f2c1d" }}>
                  <span>{tag.name}</span>
                  <button type="button" onClick={() => deleteGlobalTag(tag.id)} className="text-xs" style={{ color: "#9f6c31" }}>
                    Delete
                  </button>
                </div>
              ))}
              {globalTags.length === 0 ? <p className="text-xs" style={{ color: "#8c7257" }}>No global tags yet.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
