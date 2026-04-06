import { Gender } from "@prisma/client";
import { getAgeBucketOptions, type AgeBucketKey } from "@/lib/age";
import { getAnalyticsSnapshot } from "@/lib/internal-analytics";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseDateParam(value: string | string[] | undefined, endOfDay = false) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const gender = typeof params.gender === "string" && Object.values(Gender).includes(params.gender as Gender)
    ? (params.gender as Gender)
    : null;
  const ageBucket = typeof params.ageBucket === "string" ? (params.ageBucket as AgeBucketKey) : null;
  const specificAge = typeof params.specificAge === "string" && params.specificAge
    ? Number.parseInt(params.specificAge, 10)
    : null;

  const snapshot = await getAnalyticsSnapshot({
    startDate: parseDateParam(params.startDate),
    endDate: parseDateParam(params.endDate, true),
    gender,
    ageBucket,
    specificAge: Number.isFinite(specificAge) ? specificAge : null,
  });

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-2 mb-5">
          <h1 className="text-2xl font-semibold" style={{ color: "#3f2c1d" }}>Admin Analytics</h1>
          <p className="text-sm" style={{ color: "#735a43" }}>
            This first build covers the locked dashboard metrics, age buckets, specific-age filtering, payment analytics, and click/scroll visit sessions.
          </p>
        </div>

        <form className="grid gap-3 md:grid-cols-5">
          <input
            type="date"
            name="startDate"
            defaultValue={typeof params.startDate === "string" ? params.startDate : ""}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
          />
          <input
            type="date"
            name="endDate"
            defaultValue={typeof params.endDate === "string" ? params.endDate : ""}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
          />
          <select
            name="gender"
            defaultValue={gender ?? ""}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
          >
            <option value="">All genders</option>
            {Object.values(Gender).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            name="ageBucket"
            defaultValue={ageBucket ?? ""}
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
          >
            <option value="">All age buckets</option>
            {getAgeBucketOptions().map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="number"
            min={13}
            name="specificAge"
            defaultValue={typeof params.specificAge === "string" ? params.specificAge : ""}
            placeholder="Specific age"
            className="px-4 py-2.5 rounded-xl text-sm border"
            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
          />
          <button
            type="submit"
            className="md:col-span-5 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
          >
            Apply Filters
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Registered users", value: snapshot.registrations.total },
          { label: "Total visits", value: snapshot.visits.totalVisits },
          { label: "Unique self-confession users", value: snapshot.selfConfessions.uniqueUsers },
          { label: "Mutual-confession users", value: snapshot.confessions.mutualUsers },
        ].map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "#9b7c5d" }}>{card.label}</p>
            <p className="text-3xl font-semibold mt-3" style={{ color: "#3f2c1d" }}>{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Purchases by Feature</h2>
          <div className="space-y-3">
            {snapshot.purchases.map((item) => (
              <div key={String(item.type)} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.2)" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>{String(item.type)}</p>
                  <p className="text-sm" style={{ color: "#8f6a46" }}>{item.totalPurchases} purchases</p>
                </div>
                <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>{item.uniqueUsers} unique users</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Profile Completion</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(snapshot.profileCompletion).map(([key, value]) => (
              <div key={key} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.2)" }}>
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>{key}</p>
                <p className="text-2xl font-semibold mt-2" style={{ color: "#3f2c1d" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Confession Activity</h2>
          <div className="space-y-3 text-sm" style={{ color: "#9b7c5d" }}>
            <p>Total sent: <span style={{ color: "#3f2c1d" }}>{snapshot.confessions.totalSent}</span></p>
            <p>Total received: <span style={{ color: "#3f2c1d" }}>{snapshot.confessions.totalReceived}</span></p>
            <p>Users who sent: <span style={{ color: "#3f2c1d" }}>{snapshot.confessions.usersWhoSent}</span></p>
            <p>Users who received: <span style={{ color: "#3f2c1d" }}>{snapshot.confessions.usersWhoReceived}</span></p>
            <p>Mutual confession records: <span style={{ color: "#3f2c1d" }}>{snapshot.confessions.mutualConfessionRecords}</span></p>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Confession Method Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(snapshot.confessionMethod).map(([key, value]) => (
              <div key={key} className="rounded-2xl p-4" style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.2)" }}>
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>{key}</p>
                <p className="text-2xl font-semibold mt-2" style={{ color: "#3f2c1d" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Visits Distribution</h2>
          <div className="space-y-2">
            {snapshot.visits.visitCountDistribution.map((item) => (
              <div key={item.count} className="flex items-center justify-between text-sm" style={{ color: "#9b7c5d" }}>
                <span>{item.count} visits</span>
                <span style={{ color: "#3f2c1d" }}>{item.users} users</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium mb-4" style={{ color: "#3f2c1d" }}>Self-Confession Distribution</h2>
          <div className="space-y-2">
            {snapshot.selfConfessions.selfCountDistribution.map((item) => (
              <div key={item.count} className="flex items-center justify-between text-sm" style={{ color: "#9b7c5d" }}>
                <span>{item.count} self-confessions</span>
                <span style={{ color: "#3f2c1d" }}>{item.users} users</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
