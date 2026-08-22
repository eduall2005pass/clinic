"use client";

import { AccessMessage } from "@/components/auth/AccessGuard";

export default function ProfileSecurityPage() {
  return (
    <AccessMessage
      title="Account Security"
      message="Password and sign-in method are managed by your Google account. Panel-wide security policy lives under Administration → Security."
      actionLabel="Security Settings"
      actionHref="/admin/administration/security"
    />
  );
}
