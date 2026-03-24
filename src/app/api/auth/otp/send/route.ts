import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

// Rate limiting constants
const MAX_OTP_PER_PHONE_15MIN = 3;  // max 3 OTPs per phone in 15 minutes
const MAX_OTP_PER_PHONE_1HR = 5;    // max 5 OTPs per phone in 1 hour
const OTP_EXPIRY_MINUTES = 10;

type TwoFactorResponse = {
  Status?: string;
  Details?: string;
};

function getOtpDeliveryMode() {
  const mode = process.env.OTP_DELIVERY_MODE?.trim().toLowerCase();

  if (mode === "mock") return "mock";
  if (mode === "sms") return "sms";
  if (mode === "voice") return "voice";

  return process.env.TWOFACTOR_API_KEY ? "sms" : "mock";
}

async function sendOtpVia2Factor(mode: "sms" | "voice", phone: string, otp: string) {
  const apiKey = process.env.TWOFACTOR_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("TWOFACTOR_API_KEY is not configured");
  }

  const method = mode === "sms" ? "POST" : "GET";
  const endpoint = mode === "sms" ? "SMS" : "VOICE";
  const url = `https://2factor.in/API/V1/${apiKey}/${endpoint}/${phone}/${otp}`;
  const response = await fetch(url, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const body = await response.text();
  let result: TwoFactorResponse | null = null;

  try {
    result = JSON.parse(body) as TwoFactorResponse;
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.Details || `2Factor HTTP ${response.status}`);
  }

  if (!result || result.Status !== "Success") {
    throw new Error(result?.Details || "2Factor rejected the OTP request");
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);

    // ── Rate limiting ──────────────────────────────────────────────
    const now = new Date();
    const window15min = new Date(now.getTime() - 15 * 60 * 1000);
    const window1hr   = new Date(now.getTime() - 60 * 60 * 1000);

    const [recentIn15min, recentIn1hr] = await Promise.all([
      prisma.otpSession.count({
        where: { phone: formattedPhone, createdAt: { gte: window15min } },
      }),
      prisma.otpSession.count({
        where: { phone: formattedPhone, createdAt: { gte: window1hr } },
      }),
    ]);

    if (recentIn15min >= MAX_OTP_PER_PHONE_15MIN) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    if (recentIn1hr >= MAX_OTP_PER_PHONE_1HR) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again after an hour." },
        { status: 429 }
      );
    }
    // ───────────────────────────────────────────────────────────────

    const otp = generateOtp();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const deliveryMode = getOtpDeliveryMode();

    // Invalidate any existing unverified sessions for this phone
    await prisma.otpSession.updateMany({
      where: { phone: formattedPhone, verified: false },
      data: { expiresAt: now }, // expire them immediately
    });

    // Create new OTP session
    await prisma.otpSession.create({
      data: { phone: formattedPhone, otp, expiresAt },
    });

    try {
      if (deliveryMode === "mock") {
        console.log(`\n[OTP MOCK] ${formattedPhone}: ${otp}\n`);
      } else {
        await sendOtpVia2Factor(deliveryMode, phone, otp);
      }
    } catch (error) {
      await prisma.otpSession.deleteMany({
        where: { phone: formattedPhone, otp, verified: false },
      });

      console.error("[2factor] Error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to send OTP call. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, deliveryMode });
  } catch (err) {
    console.error("[OTP Send Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
