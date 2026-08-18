import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { supabaseServer } from "@/lib/supabase";
import { storagePublicUrl } from "@/lib/supabase";
import { randomStudentId } from "@/lib/student-id";
import type { StudentProfile } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

type StudentRow = {
  uid: string;
  student_id: string;
  full_name: string;
  gender: string;
  institution: string;
  hsc_batch: string;
  contact_number: string;
  email: string;
  facebook_url: string;
  profile_picture_url: string;
  provider: string;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: StudentRow): StudentProfile {
  return {
    uid: row.uid,
    studentId: row.student_id,
    fullName: row.full_name,
    gender: row.gender,
    institution: row.institution,
    hscBatch: row.hsc_batch,
    contactNumber: row.contact_number,
    email: row.email,
    facebookUrl: row.facebook_url,
    profilePictureUrl: row.profile_picture_url,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !supabaseServer) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
  const { data, error } = await supabaseServer
    .from("students")
    .select("*")
    .eq("uid", user.uid)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "Could not load the profile." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    profile: data ? mapProfile(data as StudentRow) : null,
  });
}

const REQUIRED_FIELDS = [
  "fullName",
  "gender",
  "institution",
  "hscBatch",
  "contactNumber",
] as const;

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseServer) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const readField = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const fields: Record<(typeof REQUIRED_FIELDS)[number], string> = {
    fullName: readField("fullName"),
    gender: readField("gender"),
    institution: readField("institution"),
    hscBatch: readField("hscBatch"),
    contactNumber: readField("contactNumber"),
  };
  if (REQUIRED_FIELDS.some((name) => fields[name].length === 0)) {
    return NextResponse.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  const email = readField("email");
  const facebookUrl = readField("facebookUrl");

  let profilePictureUrl = "";
  const picture = formData.get("picture");
  if (picture instanceof File && picture.size > 0) {
    if (!picture.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please choose a valid image file." },
        { status: 400 },
      );
    }
    const extension = picture.name.includes(".")
      ? `.${picture.name.split(".").pop()?.toLowerCase() ?? ""}`
      : ".jpg";
    const storagePath = `student-profiles/${user.uid}/profile-picture-${Date.now()}${extension}`;
    const { error: uploadError } = await supabaseServer.storage
      .from("student-profiles")
      .upload(storagePath, picture);
    if (uploadError) {
      return NextResponse.json(
        { error: "Could not upload the profile picture." },
        { status: 400 },
      );
    }
    profilePictureUrl = storagePublicUrl("student-profiles", storagePath);
  }

  const now = new Date().toISOString();
  let studentId = "";
  let saved = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomStudentId();
    const { count } = await supabaseServer
      .from("student_ids")
      .upsert(
        { student_id: candidate, uid: user.uid },
        { onConflict: "student_id", ignoreDuplicates: true, count: "exact" },
      );
    if (!count || count === 0) continue;
    studentId = candidate;
    const { error: insertError } = await supabaseServer.from("students").insert({
      uid: user.uid,
      student_id: studentId,
      full_name: fields.fullName,
      gender: fields.gender,
      institution: fields.institution,
      hsc_batch: fields.hscBatch,
      contact_number: fields.contactNumber,
      email,
      facebook_url: facebookUrl,
      profile_picture_url: profilePictureUrl,
      provider: "google",
      created_at: now,
      updated_at: now,
    });
    if (!insertError) {
      saved = true;
      break;
    }
    // The student row could not be created (e.g. already registered) —
    // free the reserved ID and stop.
    await supabaseServer
      .from("student_ids")
      .delete()
      .eq("student_id", studentId);
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This account is already registered." },
        { status: 409 },
      );
    }
  }
  if (!saved) {
    return NextResponse.json(
      { error: "Could not generate a unique Student ID. Please try again." },
      { status: 500 },
    );
  }

  const profile: StudentProfile = {
    uid: user.uid,
    studentId,
    fullName: fields.fullName,
    gender: fields.gender,
    institution: fields.institution,
    hscBatch: fields.hscBatch,
    contactNumber: fields.contactNumber,
    email,
    facebookUrl,
    profilePictureUrl,
    provider: "google",
    createdAt: now,
    updatedAt: now,
  };
  return NextResponse.json({ profile }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseServer) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const readField = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : null;
  };
  const fullName = readField("fullName");
  const institution = readField("institution");
  if (!fullName || !institution) {
    return NextResponse.json(
      { error: "Name and institution cannot be empty." },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {
    full_name: fullName,
    institution,
    updated_at: new Date().toISOString(),
  };

  const picture = formData.get("picture");
  if (picture instanceof File && picture.size > 0) {
    if (!picture.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please choose a valid image file." },
        { status: 400 },
      );
    }
    const extension = picture.name.includes(".")
      ? `.${picture.name.split(".").pop()?.toLowerCase() ?? ""}`
      : ".jpg";
    const storagePath = `student-profiles/${user.uid}/profile-picture-${Date.now()}${extension}`;
    const { error: uploadError } = await supabaseServer.storage
      .from("student-profiles")
      .upload(storagePath, picture);
    if (uploadError) {
      return NextResponse.json(
        { error: "Could not upload the profile picture." },
        { status: 400 },
      );
    }
    update.profile_picture_url = storagePublicUrl(
      "student-profiles",
      storagePath,
    );
  }

  const { data, error } = await supabaseServer
    .from("students")
    .update(update)
    .eq("uid", user.uid)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { error: "Could not save your changes." },
      { status: 500 },
    );
  }
  return NextResponse.json({ profile: mapProfile(data as StudentRow) });
}