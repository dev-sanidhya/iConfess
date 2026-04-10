import { NextResponse } from "next/server";
import { getPaymentCatalog } from "@/lib/payment-catalog.server";

export async function GET() {
  try {
    const catalog = await getPaymentCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    console.error("[Payment Config Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
