"use client";

import { useState } from "react";
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
};

type TeamManagementProps = {
  initialAccounts: StaffAccount[];
};

const employeePermissions = [...STAFF_PERMISSIONS];

export default function TeamManagement({ initialAccounts }: TeamManagementProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState(false);

  async function refreshAccounts() {
    const response = await fetch("/api/internal/staff/accounts");
    const data = await response.json();
    if (response.ok) {
      setAccounts(data.accounts);
    }
  }

  async function handleCreate(formData: FormData) {
    setLoading(true);
    try {
      const payload = {
        name: formData.get("name"),
        username: formData.get("username"),
        password: formData.get("password"),
        role: formData.get("role"),
        permissions: employeePermissions.filter((permission) => formData.get(permission) === "on"),
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

      toast.success("Staff account created");
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

      toast.success("Staff account deleted");
      await refreshAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete account");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, updates: Partial<StaffAccount> & { password?: string }) {
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

      toast.success("Staff account updated");
      await refreshAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>Staff Access Management</h1>
        <p className="text-sm mb-5" style={{ color: "#735a43" }}>
          Admins can create, change, and delete both admin and employee login credentials here.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleCreate(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <input name="name" placeholder="Full name" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <input name="username" placeholder="Username" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <input type="password" name="password" placeholder="Password" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} required />
          <select name="role" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} defaultValue={STAFF_ROLES[1]}>
            <option value={STAFF_ROLES[1]}>EMPLOYEE</option>
            <option value={STAFF_ROLES[0]}>ADMIN</option>
          </select>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
            {employeePermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,251,245,0.88)", color: "#8c7257", border: "1px solid rgba(184,159,126,0.2)" }}>
                <input type="checkbox" name={permission} defaultChecked />
                {permission}
              </label>
            ))}
          </div>
          <button type="submit" disabled={loading} className="md:col-span-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}>
            {loading ? "Saving..." : "Create Staff Account"}
          </button>
        </form>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6">
        <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Existing Accounts</h2>
        <div className="space-y-3">
          {accounts.map((account) => (
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
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input name="name" defaultValue={account.name} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                  <input name="username" defaultValue={account.username} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                  <input name="password" type="password" placeholder="New password (optional)" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }} />
                  <select name="role" defaultValue={account.role} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}>
                    <option value={STAFF_ROLES[1]}>EMPLOYEE</option>
                    <option value={STAFF_ROLES[0]}>ADMIN</option>
                  </select>
                  <select name="status" defaultValue={account.status} className="px-4 py-2.5 rounded-xl text-sm border xl:col-span-1" style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}>
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
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(account.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "rgba(198,145,85,0.14)", color: "#9f6c31" }}
                  >
                    Delete
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
