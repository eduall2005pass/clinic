import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
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

export async function saveProfileWithUniqueStudentId(
  db: Firestore,
  uid: string,
  data: NewStudentData,
): Promise<StudentProfile> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const studentId = randomStudentId();
    try {
      const saved = await runTransaction(db, async (transaction) => {
        const idRef = doc(db, "studentIds", studentId);
        const existing = await transaction.get(idRef);
        if (existing.exists()) {
          throw new Error("STUDENT_ID_TAKEN");
        }
        transaction.set(idRef, { uid });
        const profile = {
          ...data,
          uid,
          studentId,
          provider: "google",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        transaction.set(doc(db, "students", uid), profile);
        return profile;
      });
      return saved as StudentProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message !== "STUDENT_ID_TAKEN") {
        throw error;
      }
    }
  }
  throw new Error(
    "Could not generate a unique Student ID. Please try again.",
  );
}