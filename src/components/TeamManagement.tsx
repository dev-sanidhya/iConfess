"use client";

import { useState } from "react";
import { StaffPermission, StaffRole, StaffStatus } from "@prisma/client";
import { toast } from "sonner";

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

const employeePermissions = Object.values(StaffPermission);

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
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f0eeff" }}>Staff Access Management</h1>
        <p className="text-sm mb-5" style={{ color: "#9b98c8" }}>
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
          <input name="name" placeholder="Full name" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
          <input name="username" placeholder="Username" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
          <input type="password" name="password" placeholder="Password" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} required />
          <select name="role" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} defaultValue={StaffRole.EMPLOYEE}>
            <option value={StaffRole.EMPLOYEE}>EMPLOYEE</option>
            <option value={StaffRole.ADMIN}>ADMIN</option>
          </select>
          <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
            {employeePermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(30,30,63,0.28)", color: "#9b98c8" }}>
                <input type="checkbox" name={permission} defaultChecked />
                {permission}
              </label>
            ))}
          </div>
          <button type="submit" disabled={loading} className="md:col-span-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0f766e 0%, #34d399 100%)" }}>
            {loading ? "Saving..." : "Create Staff Account"}
          </button>
        </form>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6">
        <h2 className="text-lg font-medium mb-4" style={{ color: "#f0eeff" }}>Existing Accounts</h2>
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-2xl p-4" style={{ background: "rgba(30,30,63,0.28)" }}>
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
                    permissions: role === StaffRole.ADMIN
                      ? employeePermissions
                      : employeePermissions.filter((permission) => formData.get(`${account.id}-${permission}`) === "on"),
                  });
                }}
                className="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input name="name" defaultValue={account.name} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} />
                  <input name="username" defaultValue={account.username} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} />
                  <input name="password" type="password" placeholder="New password (optional)" className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }} />
                  <select name="role" defaultValue={account.role} className="px-4 py-2.5 rounded-xl text-sm border" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}>
                    <option value={StaffRole.EMPLOYEE}>EMPLOYEE</option>
                    <option value={StaffRole.ADMIN}>ADMIN</option>
                  </select>
                  <select name="status" defaultValue={account.status} className="px-4 py-2.5 rounded-xl text-sm border xl:col-span-1" style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}>
                    <option value={StaffStatus.ACTIVE}>ACTIVE</option>
                    <option value={StaffStatus.INACTIVE}>INACTIVE</option>
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {employeePermissions.map((permission) => (
                    <label key={`${account.id}-${permission}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(30,30,63,0.28)", color: "#9b98c8" }}>
                      <input type="checkbox" name={`${account.id}-${permission}`} defaultChecked={account.permissions.includes(permission)} />
                      {permission}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "rgba(15,118,110,0.18)", color: "#34d399" }}
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(account.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "rgba(190,24,93,0.18)", color: "#f472b6" }}
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
