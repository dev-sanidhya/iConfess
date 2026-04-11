import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_PER_PHONE_24HR = 5;
const MAX_OTP_PER_IP_24HR = 20;
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

function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);
    const requestIp = getRequestIp(req);
    const now = new Date();
    const window24hr = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cooldownWindow = new Date(now.getTime() - OTP_COOLDOWN_SECONDS * 1000);

    const [recentPhoneIn24hr, recentPhoneInCooldown, recentIpIn24hr] = await Promise.all([
      prisma.otpSession.count({
        where: { phone: formattedPhone, createdAt: { gte: window24hr } },
      }),
      prisma.otpSession.count({
        where: { phone: formattedPhone, createdAt: { gte: cooldownWindow } },
      }),
      requestIp
        ? prisma.otpSession.count({
            where: { requestIp, createdAt: { gte: window24hr } },
          })
        : Promise.resolve(0),
    ]);

    if (recentPhoneInCooldown > 0) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another OTP." },
        { status: 429 }
      );
    }

    if (recentPhoneIn24hr >= MAX_OTP_PER_PHONE_24HR) {
      return NextResponse.json(
        { error: "OTP limit reached for this phone number. Please try again after 24 hours." },
        { status: 429 }
      );
    }

    if (requestIp && recentIpIn24hr >= MAX_OTP_PER_IP_24HR) {
      return NextResponse.json(
        { error: "OTP request limit reached for this network. Please try again after 24 hours." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const deliveryMode = getOtpDeliveryMode();

    await prisma.otpSession.updateMany({
      where: { phone: formattedPhone, verified: false },
      data: { expiresAt: now },
    });

    await prisma.otpSession.create({
      data: { phone: formattedPhone, requestIp, otp, expiresAt },
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
