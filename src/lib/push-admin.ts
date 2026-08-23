import { exec, query } from "@/lib/mysql";
import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

// Firebase Cloud Messaging (FCM) web push. Browser registration tokens are
// stored in MySQL (`push_tokens`); admins broadcast via the Admin Panel.

export type PushSubscription = {
  token: string;
  uid: string;
  email: string | null;
  userAgent: string | null;
  createdAt: string;
};

type PushTokenRow = {
  token: string;
  uid: string;
  email: string | null;
  user_agent: string | null;
  created_at: unknown;
};

function parseDateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  return String(value ?? "");
}

let messagingApp: App | null = null;

/** Lazily initialized Firebase app for Cloud Messaging. */
function getMessagingInstance(): Messaging | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  if (!messagingApp) {
    messagingApp =
      getApps().find((app) => app.name === "push-messaging") ??
      initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        },
        "push-messaging",
      );
  }
  return getMessaging(messagingApp);
}

async function ensureTable(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS push_tokens (
    token VARCHAR(512) NOT NULL PRIMARY KEY,
    uid VARCHAR(191) NOT NULL,
    email VARCHAR(191) NULL,
    user_agent VARCHAR(512) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY push_tokens_uid_idx (uid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

/** Save/refresh a browser registration token for a signed-in student. */
export async function savePushToken(
  token: string,
  uid: string,
  email: string | null,
  userAgent: string | null,
): Promise<void> {
  await ensureTable();
  await exec(
    `INSERT INTO push_tokens (token, uid, email, user_agent)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE uid = VALUES(uid), email = VALUES(email), user_agent = VALUES(user_agent)`,
    [token.slice(0, 512), uid, email, userAgent?.slice(0, 512) ?? null],
  );
}

/** Remove a token (unsubscribe / expired). */
export async function deletePushToken(token: string): Promise<void> {
  await ensureTable();
  await exec(`DELETE FROM push_tokens WHERE token = ?`, [token]);
}

/** All stored subscriptions, optionally filtered to one user (admin view). */
export async function fetchPushSubscriptions(
  targetUid?: string,
): Promise<PushSubscription[]> {
  await ensureTable();
  const rows = targetUid
    ? await query<PushTokenRow[]>(
        `SELECT token, uid, email, user_agent, created_at FROM push_tokens WHERE uid = ? ORDER BY created_at DESC LIMIT 1000`,
        [targetUid],
      )
    : await query<PushTokenRow[]>(
        `SELECT token, uid, email, user_agent, created_at FROM push_tokens ORDER BY created_at DESC LIMIT 1000`,
      );
  return rows.map((row) => ({
    token: row.token,
    uid: row.uid,
    email: row.email,
    userAgent: row.user_agent,
    createdAt: parseDateValue(row.created_at),
  }));
}

/** Resolve a student's Firebase UID from their email. */
export async function resolveStudentUidByEmail(
  email: string,
): Promise<string | null> {
  const rows = await query<{ uid: string }[]>(
    `SELECT uid FROM students WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  return rows[0]?.uid ?? null;
}

export type PushSendResult = {
  sent: number;
  failed: number;
  total: number;
};

/**
 * Send a notification — to every registered token when no targetUid is
 * given (broadcast), otherwise only to that user's devices. Tokens that
 * FCM reports as invalid/unregistered are pruned from the table.
 */
export async function sendPush(input: {
  title: string;
  body: string;
  url?: string;
  targetUid?: string;
}): Promise<PushSendResult> {
  const messaging = getMessagingInstance();
  if (!messaging) {
    throw new Error("Firebase Admin is not configured.");
  }
  const subscriptions = await fetchPushSubscriptions(input.targetUid);
  const result: PushSendResult = { sent: 0, failed: 0, total: subscriptions.length };
  if (subscriptions.length === 0) return result;
  const staleTokens: string[] = [];

  // FCM v1 accepts batches of up to 500.
  for (let i = 0; i < subscriptions.length; i += 500) {
    const batch = subscriptions.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((sub) => sub.token),
      notification: { title: input.title, body: input.body },
      webpush: {
        fcmOptions: { link: input.url || "/dashboard/notifications" },
      },
      data: { url: input.url || "/dashboard/notifications" },
    });
    response.responses.forEach((item, index) => {
      if (item.success) {
        result.sent += 1;
      } else {
        result.failed += 1;
        const code = item.error?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(batch[index].token);
        }
      }
    });
  }

  for (const token of staleTokens) {
    await deletePushToken(token).catch(() => undefined);
  }
  return result;
}
