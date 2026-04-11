import { PaymentStatus, PaymentType } from "@prisma/client";
import FormAutoSubmitSelect from "@/components/FormAutoSubmitSelect";
import PaymentStatusForm from "@/components/PaymentStatusForm";
import TransactionIdCopyButton from "@/components/TransactionIdCopyButton";

type PaymentRow = {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  createdAt: Date;
  gateway: string | null;
  gatewayTransactionId: string | null;
  metadata: unknown;
  user: {
    name: string;
    phone: string;
  };
};

function getStatusLabel(status: PaymentStatus) {
  if (status === PaymentStatus.PENDING) return "Verifying";
  if (status === PaymentStatus.SUCCESS) return "Success";
  if (status === PaymentStatus.FAILED) return "Failed";
  return "Refunded";
}

function formatCreatedAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("hour")}:${getPart("minute")} ${getPart("day")}-${getPart("month")}-${getPart("year")}`;
}

export default function PaymentsManagementPanel({
  title,
  payments,
  statusFilter,
  filterBasePath,
  searchField = "phone",
  searchQuery = "",
}: {
  title: string;
  payments: PaymentRow[];
  statusFilter?: PaymentStatus;
  filterBasePath?: string;
  searchField?: "phone" | "transaction";
  searchQuery?: string;
}) {
  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>{title}</h1>
        <p className="text-sm" style={{ color: "#735a43" }}>
          Payment records are now tracked in one dedicated table so support and analytics can work off the same source of truth.
        </p>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        {statusFilter && filterBasePath ? (
          <form action={filterBasePath} className="mb-5 grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_220px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="searchField" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                Search In
              </label>
              <FormAutoSubmitSelect
                id="searchField"
                name="searchField"
                defaultValue={searchField}
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(255,251,245,0.92)",
                  borderColor: "rgba(184,159,126,0.35)",
                  color: "#3f2c1d",
                }}
              >
                <option value="phone">Phone Number</option>
                <option value="transaction">Transaction ID</option>
              </FormAutoSubmitSelect>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="query" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                Search
              </label>
              <input
                id="query"
                type="text"
                name="query"
                defaultValue={searchQuery}
                placeholder={searchField === "transaction" ? "Search by transaction ID" : "Search by phone number"}
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(255,251,245,0.92)",
                  borderColor: "rgba(184,159,126,0.35)",
                  color: "#3f2c1d",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "#9b7c5d" }}>
                Status
              </label>
              <FormAutoSubmitSelect
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="min-w-48 rounded-xl border px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(255,251,245,0.92)",
                  borderColor: "rgba(184,159,126,0.35)",
                  color: "#3f2c1d",
                }}
              >
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
                ))}
              </FormAutoSubmitSelect>
            </div>
          </form>
        ) : null}

        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr style={{ color: "#9b7c5d" }}>
              <th className="text-left py-3">User</th>
              <th className="text-left py-3">Type</th>
              <th className="text-left py-3">Amount</th>
              <th className="text-left py-3">Status</th>
              <th className="text-left py-3">Gateway</th>
              <th className="text-left py-3">Txn Id</th>
              <th className="text-left py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t" style={{ borderColor: "rgba(184,159,126,0.22)", color: "#3f2c1d" }}>
                <td className="py-3">
                  <div>
                    <p>{payment.user.name}</p>
                    <p className="text-xs" style={{ color: "#9b7c5d" }}>{payment.user.phone}</p>
                  </div>
                </td>
                <td className="py-3">{payment.type}</td>
                <td className="py-3">Rs. {payment.amount}</td>
                <td className="py-3"><PaymentStatusForm paymentId={payment.id} status={payment.status} /></td>
                <td className="py-3">{payment.gateway ?? "manual/dev"}</td>
                <td className="py-3">
                  {payment.gatewayTransactionId ? (
                    <div className="flex items-center gap-2">
                      <span>{payment.gatewayTransactionId}</span>
                      <TransactionIdCopyButton value={payment.gatewayTransactionId} />
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-3">{formatCreatedAt(payment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
