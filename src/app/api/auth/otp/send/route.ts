import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.otpSession.create({
      data: { phone: formattedPhone, otp, expiresAt },
    });

    // In production: call MSG91 API to send OTP via call
    // For development, we log the OTP
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] OTP for ${formattedPhone}: ${otp}`);
    } else {
      // MSG91 call OTP integration
      const msg91Url = `https://api.msg91.com/api/v5/otp?template_id=your_template_id&mobile=${formattedPhone}&authkey=${process.env.MSG91_AUTH_KEY}&otp=${otp}&voice=1`;
      await fetch(msg91Url);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
