type UserRow = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: Date | null;
  createdAt: Date;
  _count: {
    sentConfessions: number;
    receivedConfessions: number;
    payments: number;
  };
};

export default function UsersManagementPanel({
  title,
  users,
  phoneQuery = "",
}: {
  title: string;
  users: UserRow[];
  phoneQuery?: string;
}) {
  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f0eeff" }}>{title}</h1>
        <p className="text-sm" style={{ color: "#9b98c8" }}>
          Users are shown with their fixed DOB, current profile identity handles, and activity counts for support workflows.
        </p>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6">
        <form className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            name="phone"
            defaultValue={phoneQuery}
            placeholder="Search by phone number"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #0f766e 0%, #34d399 100%)" }}
          >
            Search
          </button>
        </form>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr style={{ color: "#6f6b98" }}>
              <th className="text-left py-3">User</th>
              <th className="text-left py-3">Phone</th>
              <th className="text-left py-3">Gender</th>
              <th className="text-left py-3">DOB</th>
              <th className="text-left py-3">Sent</th>
              <th className="text-left py-3">Received</th>
              <th className="text-left py-3">Payments</th>
              <th className="text-left py-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t" style={{ borderColor: "#1e1e3f", color: "#f0eeff" }}>
                <td className="py-3">
                  <div>
                    <p>{user.name}</p>
                    <p className="text-xs" style={{ color: "#9b98c8" }}>{user.phone}</p>
                  </div>
                </td>
                <td className="py-3">{user.phone}</td>
                <td className="py-3">{user.gender}</td>
                <td className="py-3">{user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "Not set"}</td>
                <td className="py-3">{user._count.sentConfessions}</td>
                <td className="py-3">{user._count.receivedConfessions}</td>
                <td className="py-3">{user._count.payments}</td>
                <td className="py-3">{user.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-sm mt-4" style={{ color: "#9b98c8" }}>
            No users found for this phone search.
          </p>
        )}
      </section>
    </div>
  );
}
