import { PaymentStatus } from "@prisma/client";
import PaymentsManagementPanel from "@/components/PaymentsManagementPanel";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/staff-guards";

type AdminPaymentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseStatusParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return PaymentStatus.PENDING;
  }

  return Object.values(PaymentStatus).includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : PaymentStatus.PENDING;
}

function parseSearchFieldParam(value: string | string[] | undefined) {
  return value === "transaction" ? "transaction" : "phone";
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const selectedStatus = parseStatusParam(params.status);
  const searchField = parseSearchFieldParam(params.searchField);
  const searchQuery = typeof params.query === "string" ? params.query.trim() : "";

  const payments = await prisma.payment.findMany({
    where: {
      status: selectedStatus,
      ...(searchQuery
        ? searchField === "transaction"
          ? { gatewayTransactionId: { contains: searchQuery } }
          : { user: { phone: { contains: searchQuery } } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
    take: 100,
  });

  return (
    <PaymentsManagementPanel
      title="Payments Management"
      payments={payments}
      statusFilter={selectedStatus}
      filterBasePath="/admin/payments"
      searchField={searchField}
      searchQuery={searchQuery}
    />
  );
}
