import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { query, exec, parseDate, isMysqlConfigured } from "@/lib/mysql";
import { saveFile } from "@/lib/storage";
import { randomStudentId } from "@/lib/student-id";
import type { StudentProfile } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const PROFILE_PICTURE_DIR = "student-profiles";

type StudentRow = {
  uid: string;
  student_id: string;
  full_name: string;
  gender: string;
  institution: string;
  hsc_batch: string;
  student_level: string;
  contact_number: string;
  email: string;
  facebook_url: string;
  profile_picture_url: string;
  provider: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapProfile(row: StudentRow): StudentProfile {
  return {
    uid: row.uid,
    studentId: row.student_id,
    fullName: row.full_name,
    gender: row.gender,
    institution: row.institution,
    hscBatch: row.hsc_batch,
    studentLevel: row.student_level ?? "",
    contactNumber: row.contact_number,
    email: row.email,
    facebookUrl: row.facebook_url,
    profilePictureUrl: row.profile_picture_url,
    provider: row.provider,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
  try {
    const rows = await query<StudentRow[]>(
      "SELECT * FROM students WHERE uid = ? LIMIT 1",
      [user.uid],
    );
    const data = rows[0];
    return NextResponse.json({
      profile: data ? mapProfile(data) : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load the profile." },
      { status: 500 },
    );
  }
}

const REQUIRED_FIELDS = [
  "fullName",
  "gender",
  "institution",
  "hscBatch",
  "contactNumber",
] as const;

const STUDENT_LEVELS = [
  "SSC Academic",
  "HSC Academic",
  "Medical Admission",
  "Varsity Admission",
] as const;

async function uploadProfilePicture(picture: File) {
  const extension = picture.name.includes(".")
    ? `.${picture.name.split(".").pop()?.toLowerCase() ?? ""}`
    : ".jpg";
  const fileName = `profile-picture-${Date.now()}${extension}`;
  return saveFile(PROFILE_PICTURE_DIR, fileName, await picture.arrayBuffer());
}

/** Best-effort: make sure the student_level column exists before writing. */
let levelSchemaReady: Promise<void> | null = null;
function ensureLevelColumn(): Promise<void> {
  if (!levelSchemaReady) {
    levelSchemaReady = exec(
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS student_level VARCHAR(32) NOT NULL DEFAULT '' AFTER hsc_batch`,
    )
      .then(() => undefined)
      .catch((error) => {
        levelSchemaReady = null;
        throw error;
      });
  }
  return levelSchemaReady;
}

export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
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
  // Student level/category — defaults to HSC Academic for legacy clients.
  const rawStudentLevel = readField("studentLevel");
  const studentLevel =
    (STUDENT_LEVELS as readonly string[]).includes(rawStudentLevel)
      ? rawStudentLevel
      : "HSC Academic";

  let profilePictureUrl = "";
  const picture = formData.get("picture");
  if (picture instanceof File && picture.size > 0) {
    if (!picture.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please choose a valid image file." },
        { status: 400 },
      );
    }
    try {
      profilePictureUrl = await uploadProfilePicture(picture);
    } catch {
      return NextResponse.json(
        { error: "Could not upload the profile picture." },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  let studentId = "";
  let saved = false;
  try {
    await ensureLevelColumn();
  } catch {
    // Column may already exist or DB may not allow DDL — the insert will
    // surface a real error if the column is genuinely missing.
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomStudentId();
    try {
      await query("INSERT INTO student_ids (student_id, uid) VALUES (?, ?)", [
        candidate,
        user.uid,
      ]);
    } catch {
      continue;
    }
    studentId = candidate;
    try {
      await query(
        `INSERT INTO students
          (uid, student_id, full_name, gender, institution, hsc_batch,
           student_level, contact_number, email, facebook_url, profile_picture_url,
           provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google', NOW(), NOW())`,
        [
          user.uid,
          studentId,
          fields.fullName,
          fields.gender,
          fields.institution,
          fields.hscBatch,
          studentLevel,
          fields.contactNumber,
          email,
          facebookUrl,
          profilePictureUrl,
        ],
      );
      saved = true;
      break;
    } catch (insertError) {
      await query("DELETE FROM student_ids WHERE student_id = ?", [studentId]);
      if (
        insertError instanceof Error &&
        (insertError as { code?: string }).code === "ER_DUP_ENTRY"
      ) {
        return NextResponse.json(
          { error: "This account is already registered." },
          { status: 409 },
        );
      }
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
    studentLevel,
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
  if (!isMysqlConfigured) {
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
  const facebookUrl = readField("facebookUrl");

  const picture = formData.get("picture");
  if (picture instanceof File && picture.size > 0) {
    if (!picture.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please choose a valid image file." },
        { status: 400 },
      );
    }
    try {
      const profilePictureUrl = await uploadProfilePicture(picture);
      await query("UPDATE students SET profile_picture_url = ? WHERE uid = ?", [
        profilePictureUrl,
        user.uid,
      ]);
    } catch {
      return NextResponse.json(
        { error: "Could not upload the profile picture." },
        { status: 400 },
      );
    }
  }

  try {
    const result = await exec(
      "UPDATE students SET full_name = ?, institution = ?, facebook_url = ?, updated_at = NOW() WHERE uid = ?",
      [fullName, institution, facebookUrl, user.uid],
    );
    if (!result.affectedRows) {
      return NextResponse.json(
        { error: "Could not save your changes." },
        { status: 500 },
      );
    }
    const rows = await query<StudentRow[]>(
      "SELECT * FROM students WHERE uid = ? LIMIT 1",
      [user.uid],
    );
    if (!rows[0]) {
      return NextResponse.json(
        { error: "Could not save your changes." },
        { status: 500 },
      );
    }
    return NextResponse.json({ profile: mapProfile(rows[0]) });
  } catch {
    return NextResponse.json(
      { error: "Could not save your changes." },
      { status: 500 },
    );
  }
}
