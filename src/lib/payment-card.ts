import { exec, query } from "@/lib/mysql";

/**
 * Payment Card configuration (Admin → Enrollment Control → Payment Card).
 * Stored in MySQL — the frontend never hard-codes payment numbers; students
 * will later fetch the saved config dynamically from /api/payment-card.
 */

export type PaymentCardConfig = {
  bkashNumber: string;
  nagadNumber: string;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  couponEnabled: boolean;
  instructions: string;
  note: string;
};

type PaymentCardRow = {
  bkash_number: string | null;
  nagad_number: string | null;
  bkash_enabled: number;
  nagad_enabled: number;
  coupon_enabled?: number;
  instructions: string | null;
  note: string | null;
};

export const DEFAULT_PAYMENT_CARD: PaymentCardConfig = {
  bkashNumber: "",
  nagadNumber: "",
  bkashEnabled: true,
  nagadEnabled: false,
  couponEnabled: true,
  instructions: "",
  note: "",
};

async function ensurePaymentCardTable(): Promise<void> {
  await exec(
    `CREATE TABLE IF NOT EXISTS payment_card (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      bkash_number VARCHAR(40) NULL,
      nagad_number VARCHAR(40) NULL,
      bkash_enabled TINYINT(1) NOT NULL DEFAULT 1,
      nagad_enabled TINYINT(1) NOT NULL DEFAULT 0,
      coupon_enabled TINYINT(1) NOT NULL DEFAULT 1,
      instructions TEXT NULL,
      note TEXT NULL,
      updated_by VARCHAR(191) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  // Existing deployments created the table before the coupon toggle existed.
  try {
    await exec(
      "ALTER TABLE payment_card ADD COLUMN coupon_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER nagad_enabled",
    );
  } catch {
    // Column already exists — nothing to migrate.
  }
}

function rowToConfig(row: PaymentCardRow): PaymentCardConfig {
  return {
    bkashNumber: row.bkash_number ?? "",
    nagadNumber: row.nagad_number ?? "",
    bkashEnabled: row.bkash_enabled === 1,
    nagadEnabled: row.nagad_enabled === 1,
    couponEnabled: row.coupon_enabled !== 0,
    instructions: row.instructions ?? "",
    note: row.note ?? "",
  };
}

/** Current payment card configuration (defaults when unset). */
export async function getPaymentCard(): Promise<PaymentCardConfig> {
  try {
    await ensurePaymentCardTable();
    const rows = await query<PaymentCardRow[]>(
      "SELECT bkash_number, bkash_enabled, nagad_number, nagad_enabled, coupon_enabled, instructions, note FROM payment_card WHERE id = 'default' LIMIT 1",
    );
    if (rows.length === 0) return { ...DEFAULT_PAYMENT_CARD };
    return rowToConfig(rows[0]);
  } catch {
    return { ...DEFAULT_PAYMENT_CARD };
  }
}

/** Persist the payment card configuration. */
export async function savePaymentCard(
  config: PaymentCardConfig,
  adminUid: string,
): Promise<void> {
  await ensurePaymentCardTable();
  await exec(
    `INSERT INTO payment_card
       (id, bkash_number, bkash_enabled, nagad_number, nagad_enabled, coupon_enabled, instructions, note, updated_by)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       bkash_number = VALUES(bkash_number),
       bkash_enabled = VALUES(bkash_enabled),
       nagad_number = VALUES(nagad_number),
       nagad_enabled = VALUES(nagad_enabled),
       coupon_enabled = VALUES(coupon_enabled),
       instructions = VALUES(instructions),
       note = VALUES(note),
       updated_by = VALUES(updated_by)`,
    [
      config.bkashNumber.trim() || null,
      config.bkashEnabled ? 1 : 0,
      config.nagadNumber.trim() || null,
      config.nagadEnabled ? 1 : 0,
      config.couponEnabled ? 1 : 0,
      config.instructions.trim() || null,
      config.note.trim() || null,
      adminUid,
    ],
  );
}
