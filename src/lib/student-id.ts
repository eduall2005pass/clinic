import type { User } from "firebase/auth";
import type { StudentProfile } from "./auth-context";

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomStudentId(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `MS-${code}`;
}

export type NewStudentData = Omit<
  StudentProfile,
  "uid" | "studentId" | "provider" | "createdAt" | "updatedAt"
>;

type ProfileEditableFields = Omit<NewStudentData, "profilePictureUrl">;

async function profileRequest(
  user: User,
  url: string,
  method: "POST" | "PATCH",
  data: ProfileEditableFields,
  pictureFile: File | null | undefined,
): Promise<StudentProfile> {
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append("fullName", data.fullName);
  formData.append("gender", data.gender);
  formData.append("institution", data.institution);
  formData.append("hscBatch", data.hscBatch);
  formData.append("contactNumber", data.contactNumber);
  formData.append("email", data.email);
  formData.append("facebookUrl", data.facebookUrl);
  if (pictureFile) {
    formData.append("picture", pictureFile);
  }
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = (await response.json().catch(() => null)) as {
    profile?: StudentProfile;
    error?: string;
  } | null;
  if (!response.ok || !body?.profile) {
    throw new Error(
      body?.error ?? "Could not save your profile. Please try again.",
    );
  }
  return body.profile;
}

export async function saveProfileWithUniqueStudentId(
  user: User,
  data: NewStudentData,
  pictureFile?: File | null,
): Promise<StudentProfile> {
  return profileRequest(user, "/api/me", "POST", data, pictureFile);
}

export async function updateStudentProfile(
  user: User,
  data: ProfileEditableFields,
  pictureFile?: File | null,
): Promise<StudentProfile> {
  return profileRequest(user, "/api/me", "PATCH", data, pictureFile);
}