import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const ext = file.name.split(".").pop() || "png";
    const filename = `upload_${Date.now()}.${ext}`;
    const publicDir = path.join(process.cwd(), "public");
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(publicDir, filename), buffer);

    return NextResponse.json({ url: `/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
