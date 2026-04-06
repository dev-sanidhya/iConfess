import { ConfessionStatus } from "@prisma/client";

type ConfessionRow = {
  id: string;
  createdAt: Date;
  status: string;
  isSelfConfession: boolean;
  mutualDetected: boolean;
  sender: {
    name: string;
    phone: string;
  };
  target: {
    name: string;
    phone: string;
  } | null;
  targetPhone: string | null;
};

export default function ConfessionsManagementPanel({
  title,
  confessions,
  phoneQuery = "",
  statusQuery = "",
}: {
  title: string;
  confessions: ConfessionRow[];
  phoneQuery?: string;
  statusQuery?: string;
}) {
  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f0eeff" }}>{title}</h1>
        <p className="text-sm" style={{ color: "#9b98c8" }}>
          This queue is designed for support review of delivery state, self-confessions, and mutual matches.
        </p>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            type="text"
            name="phone"
            defaultValue={phoneQuery}
            placeholder="Search by phone number"
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
          />
          <select
            name="status"
            defaultValue={statusQuery}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
          >
            <option value="">All statuses</option>
            {Object.values(ConfessionStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #0f766e 0%, #34d399 100%)" }}
          >
            Apply
          </button>
        </form>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr style={{ color: "#6f6b98" }}>
              <th className="text-left py-3">Sender</th>
              <th className="text-left py-3">Target</th>
              <th className="text-left py-3">Status</th>
              <th className="text-left py-3">Self</th>
              <th className="text-left py-3">Mutual</th>
              <th className="text-left py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {confessions.map((confession) => (
              <tr key={confession.id} className="border-t" style={{ borderColor: "#1e1e3f", color: "#f0eeff" }}>
                <td className="py-3">
                  <p>{confession.sender.name}</p>
                  <p className="text-xs" style={{ color: "#9b98c8" }}>{confession.sender.phone}</p>
                </td>
                <td className="py-3">
                  {confession.target ? (
                    <div>
                      <p>{confession.target.name}</p>
                      <p className="text-xs" style={{ color: "#9b98c8" }}>{confession.target.phone}</p>
                    </div>
                  ) : (
                    confession.targetPhone ?? "Pending match"
                  )}
                </td>
                <td className="py-3">{confession.status}</td>
                <td className="py-3">{confession.isSelfConfession ? "Yes" : "No"}</td>
                <td className="py-3">{confession.mutualDetected ? "Yes" : "No"}</td>
                <td className="py-3">{confession.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {confessions.length === 0 && (
          <p className="text-sm mt-4" style={{ color: "#9b98c8" }}>
            No confessions found for the selected phone number or status.
          </p>
        )}
      </section>
    </div>
  );
}
