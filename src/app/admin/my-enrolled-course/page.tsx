import { redirect } from "next/navigation";

/** Renamed to Course Content — keep the old URL working. */
export default function MyEnrolledCourseRedirect() {
  redirect("/admin/course-content");
}
