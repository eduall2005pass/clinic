import { fetchUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!/^[0-9a-f-]{16,64}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const upload = await fetchUpload(id);
  if (!upload) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(upload.data), {
    status: 200,
    headers: {
      "Content-Type": upload.mimeType,
      "Content-Length": String(upload.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${upload.fileName.replace(/"/g, "")}"`,
    },
  });
}
