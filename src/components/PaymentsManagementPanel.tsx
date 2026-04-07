import { PaymentStatus, PaymentType } from "@prisma/client";
import PaymentStatusForm from "@/components/PaymentStatusForm";

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

function getPaymentContext(payment: PaymentRow) {
  if (!payment.metadata || typeof payment.metadata !== "object" || Array.isArray(payment.metadata)) {
    return payment.gatewayTransactionId ?? "-";
  }

  const metadata = payment.metadata as Record<string, unknown>;
  if (typeof metadata.confessionId === "string") {
    return `Confession ${metadata.confessionId.slice(-6).toUpperCase()}`;
  }

  if (typeof metadata.targetUserId === "string") {
    return `User ${metadata.targetUserId.slice(-6).toUpperCase()}`;
  }

  return payment.gatewayTransactionId ?? "-";
}

export default function PaymentsManagementPanel({
  title,
  payments,
}: {
  title: string;
  payments: PaymentRow[];
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
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr style={{ color: "#9b7c5d" }}>
              <th className="text-left py-3">User</th>
              <th className="text-left py-3">Type</th>
              <th className="text-left py-3">Amount</th>
              <th className="text-left py-3">Context</th>
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
                <td className="py-3">{getPaymentContext(payment)}</td>
                <td className="py-3"><PaymentStatusForm paymentId={payment.id} status={payment.status} /></td>
                <td className="py-3">{payment.gateway ?? "manual/dev"}</td>
                <td className="py-3">{payment.gatewayTransactionId ?? "-"}</td>
                <td className="py-3">{payment.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
