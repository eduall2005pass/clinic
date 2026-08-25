import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  createCourseCategory,
  deleteCourseCategory,
  fetchActiveCourseCategories,
  fetchAllCourseCategories,
  reorderCourseCategories,
  setCourseCategoryImage,
  updateCourseCategory,
  type CategoryPatch,
} from "@/lib/course-categories-store";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 60;

export async function GET() {
  const categories = await fetchActiveCourseCategories();
  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create a category (multipart, optional image). */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Category name is required." },
      { status: 400 },
    );
  }

  try {
    let categories = await createCourseCategory({
      name,
      slug: asOptionalString(formData.get("slug")),
      description: asOptionalString(formData.get("description")),
      href: asOptionalString(formData.get("href")),
    });

    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const created = categories[categories.length - 1];
      if (created) {
        categories = await setCourseCategoryImage(created.id, file);
      }
    }

    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create the category.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Update categories. Accepts JSON:
 *  - { id, ...patch }          → edit one category
 *  - { id, removeImage: true } → remove its image
 *  - { order: [id, …] }        → change display order
 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (
      Array.isArray(body.order) &&
      body.order.every((item) => typeof item === "string")
    ) {
      const categories = await reorderCourseCategories(body.order as string[]);
      return NextResponse.json({ categories });
    }

    if (typeof body.id !== "string" || body.id.length === 0) {
      return NextResponse.json({ error: "Missing category id." }, { status: 400 });
    }

    if (body.removeImage === true) {
      const categories = await setCourseCategoryImage(body.id, null);
      return NextResponse.json({ categories });
    }

    const patch: CategoryPatch = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.slug === "string") patch.slug = body.slug;
    if (typeof body.description === "string" || body.description === null) {
      patch.description = body.description as string | null;
    }
    if (typeof body.href === "string" || body.href === null) {
      patch.href = body.href as string | null;
    }
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;

    const categories = await updateCourseCategory(body.id, patch);
    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the category.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Replace a category's image (multipart: id + file). */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const id = formData?.get("id");
  const file = formData?.get("file");

  if (!formData || typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Missing category id." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  try {
    const categories = await setCourseCategoryImage(id, file);
    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = body?.id;
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json(
      { error: "Missing category id." },
      { status: 400 },
    );
  }
  try {
    const categories = await deleteCourseCategory(id);
    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete the category.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function asOptionalString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
