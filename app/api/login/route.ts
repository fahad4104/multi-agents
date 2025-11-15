import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;

  const correctPassword = process.env.SITE_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { success: false, message: "SITE_PASSWORD is not set on the server." },
      { status: 500 }
    );
  }

  if (!password || password !== correctPassword) {
    return NextResponse.json(
      { success: false, message:"اسأل فهد" },
      { status: 401 }
    );
  }

  // إذا كانت كلمة السر صحيحة نحط كوكي بسيطة
  const res = NextResponse.json({ success: true });

  // اسم الكوكي: site_auth وقيمتها 1
  res.cookies.set("site_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12, // 12 ساعة
  });

  return res;
}
