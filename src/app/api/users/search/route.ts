import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // SQLite uses LIKE (case-insensitive by default for ASCII), no mode:"insensitive"
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        name: { contains: query },
      },
      include: {
        college:       { select: { collegeName: true, branch: true, yearOfPassing: true } },
        workplace:     { select: { companyName: true, city: true } },
        gym:           { select: { gymName: true, city: true } },
        neighbourhood: { select: { city: true, premisesName: true } },
        _count:        { select: { receivedConfessions: true } },
      },
      take: 20,
    });

    const results = users.map((u) => ({
      id:              u.id,
      name:            u.name,
      confessionCount: u._count.receivedConfessions,
      college:         u.college
        ? `${u.college.collegeName} · ${u.college.branch} · ${u.college.yearOfPassing}`
        : null,
      workplace: u.workplace
        ? `${u.workplace.companyName} · ${u.workplace.city}`
        : null,
      gym: u.gym
        ? `${u.gym.gymName} · ${u.gym.city}`
        : null,
      neighbourhood: u.neighbourhood
        ? `${u.neighbourhood.premisesName} · ${u.neighbourhood.city}`
        : null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
