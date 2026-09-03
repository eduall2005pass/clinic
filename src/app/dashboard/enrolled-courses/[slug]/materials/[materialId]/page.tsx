import MaterialPdfViewer from "@/components/dashboard/MaterialPdfViewer";

export const dynamic = "force-dynamic";

export default async function MaterialViewPage({
  params,
}: {
  params: Promise<{ slug: string; materialId: string }>;
}) {
  const { slug, materialId } = await params;
  return <MaterialPdfViewer slug={slug} materialId={materialId} />;
}
