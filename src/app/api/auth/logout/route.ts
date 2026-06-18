import { NextResponse } from "next/server";
import { COOKIE_NOME } from "@/lib/server-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NOME, "", { path: "/", maxAge: 0 });
  return res;
}
