import { exec, query } from "@/lib/mysql";
import {
  PaymentCardConfig,
  DEFAULT_PAYMENT_CARD,
} from "@/lib/payment-card-config";

export type { PaymentCardConfig };

type PaymentCardRow = {
  bkash_number: string | null;
  nagad_number: string | null;
  bkash_enabled: number;
  nagad_enabled: number;
  coupon_enabled?: number;
  instructions: string | null;
  note: string | null;
  fee_enabled: number;
  fee_label: string | null;
  discount_label: string | null;
  coupon_placeholder: string | null;
  apply_label: string | null;
  payable_enabled: number;
  payable_label: string | null;
  methods_label: string | null;
  bkash_label: string | null;
  nagad_label: string | null;
  instructions_enabled: number;
  tx_enabled: number;
  tx_label: string | null;
  tx_placeholder: string | null;
  sender_enabled: number;
  sender_label: string | null;
  sender_placeholder: string | null;
  pending_note_enabled: number;
  pending_note: string | null;
  cancel_enabled: number;
  cancel_label: string | null;
  submit_enabled: number;
  submit_label: string | null;
  submitting_label: string | null;
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
  // Full-config columns (labels, placeholders, per-element toggles).
  try {
    await exec(`ALTER TABLE payment_card
      ADD COLUMN fee_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER note,
      ADD COLUMN fee_label VARCHAR(40) NOT NULL DEFAULT 'Course Fee' AFTER fee_enabled,
      ADD COLUMN discount_label VARCHAR(40) NOT NULL DEFAULT 'Discount' AFTER fee_label,
      ADD COLUMN coupon_placeholder VARCHAR(40) NOT NULL DEFAULT 'COUPON CODE' AFTER discount_label,
      ADD COLUMN apply_label VARCHAR(40) NOT NULL DEFAULT 'Apply' AFTER coupon_placeholder,
      ADD COLUMN payable_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER apply_label,
      ADD COLUMN payable_label VARCHAR(40) NOT NULL DEFAULT 'Payable Amount' AFTER payable_enabled,
      ADD COLUMN methods_label VARCHAR(40) NOT NULL DEFAULT 'Payment Methods' AFTER payable_label,
      ADD COLUMN bkash_label VARCHAR(40) NOT NULL DEFAULT 'bKash' AFTER methods_label,
      ADD COLUMN nagad_label VARCHAR(40) NOT NULL DEFAULT 'Nagad' AFTER bkash_label,
      ADD COLUMN instructions_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER nagad_label,
      ADD COLUMN tx_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER instructions_enabled,
      ADD COLUMN tx_label VARCHAR(40) NOT NULL DEFAULT 'Transaction ID' AFTER tx_enabled,
      ADD COLUMN tx_placeholder VARCHAR(80) NOT NULL DEFAULT 'e.g. 8N7DQK2XLM' AFTER tx_label,
      ADD COLUMN sender_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER tx_placeholder,
      ADD COLUMN sender_label VARCHAR(40) NOT NULL DEFAULT 'Payment From Number' AFTER sender_enabled,
      ADD COLUMN sender_placeholder VARCHAR(40) NOT NULL DEFAULT '01XXXXXXXXX' AFTER sender_label,
      ADD COLUMN pending_note_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER sender_placeholder,
      ADD COLUMN pending_note VARCHAR(500) NOT NULL DEFAULT 'Submit payment details — enrollment stays Pending Validation until admin verifies payment.' AFTER pending_note_enabled,
      ADD COLUMN cancel_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER pending_note,
      ADD COLUMN cancel_label VARCHAR(40) NOT NULL DEFAULT 'Cancel' AFTER cancel_enabled,
      ADD COLUMN submit_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER cancel_label,
      ADD COLUMN submit_label VARCHAR(40) NOT NULL DEFAULT 'Submit Payment' AFTER submit_enabled,
      ADD COLUMN submitting_label VARCHAR(40) NOT NULL DEFAULT 'Submitting Payment...' AFTER submit_label`);
  } catch {
    // Columns already exist.
  }
}

const D = DEFAULT_PAYMENT_CARD;

function rowToConfig(row: PaymentCardRow): PaymentCardConfig {
  return {
    bkashNumber: row.bkash_number ?? D.bkashNumber,
    nagadNumber: row.nagad_number ?? D.nagadNumber,
    bkashEnabled: row.bkash_enabled === 1,
    nagadEnabled: row.nagad_enabled === 1,
    couponEnabled: row.coupon_enabled !== 0,
    instructions: row.instructions ?? D.instructions,
    note: row.note ?? D.note,
    feeEnabled: row.fee_enabled === 1,
    feeLabel: row.fee_label ?? D.feeLabel,
    discountLabel: row.discount_label ?? D.discountLabel,
    couponPlaceholder: row.coupon_placeholder ?? D.couponPlaceholder,
    applyLabel: row.apply_label ?? D.applyLabel,
    payableEnabled: row.payable_enabled === 1,
    payableLabel: row.payable_label ?? D.payableLabel,
    methodsLabel: row.methods_label ?? D.methodsLabel,
    bkashLabel: row.bkash_label ?? D.bkashLabel,
    nagadLabel: row.nagad_label ?? D.nagadLabel,
    instructionsEnabled: row.instructions_enabled === 1,
    txEnabled: row.tx_enabled === 1,
    txLabel: row.tx_label ?? D.txLabel,
    txPlaceholder: row.tx_placeholder ?? D.txPlaceholder,
    senderEnabled: row.sender_enabled === 1,
    senderLabel: row.sender_label ?? D.senderLabel,
    senderPlaceholder: row.sender_placeholder ?? D.senderPlaceholder,
    pendingNoteEnabled: row.pending_note_enabled === 1,
    pendingNote: row.pending_note ?? D.pendingNote,
    cancelEnabled: row.cancel_enabled === 1,
    cancelLabel: row.cancel_label ?? D.cancelLabel,
    submitEnabled: row.submit_enabled === 1,
    submitLabel: row.submit_label ?? D.submitLabel,
    submittingLabel: row.submitting_label ?? D.submittingLabel,
  };
}

/** Current payment card configuration (defaults when unset). */
export async function getPaymentCard(): Promise<PaymentCardConfig> {
  try {
    await ensurePaymentCardTable();
    const rows = await query<PaymentCardRow[]>(
      `SELECT bkash_number, bkash_enabled, nagad_number, nagad_enabled,
              coupon_enabled, instructions, note,
              fee_enabled, fee_label, discount_label,
              coupon_placeholder, apply_label,
              payable_enabled, payable_label,
              methods_label, bkash_label, nagad_label,
              instructions_enabled,
              tx_enabled, tx_label, tx_placeholder,
              sender_enabled, sender_label, sender_placeholder,
              pending_note_enabled, pending_note,
              cancel_enabled, cancel_label,
              submit_enabled, submit_label, submitting_label
       FROM payment_card WHERE id = 'default' LIMIT 1`,
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
  const s = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) || null : null;
  const b = (v: unknown) => (v === true ? 1 : 0);
  await exec(
    `INSERT INTO payment_card
       (id, bkash_number, bkash_enabled, nagad_number, nagad_enabled,
        coupon_enabled, instructions, note,
        fee_enabled, fee_label, discount_label,
        coupon_placeholder, apply_label,
        payable_enabled, payable_label,
        methods_label, bkash_label, nagad_label,
        instructions_enabled,
        tx_enabled, tx_label, tx_placeholder,
        sender_enabled, sender_label, sender_placeholder,
        pending_note_enabled, pending_note,
        cancel_enabled, cancel_label,
        submit_enabled, submit_label, submitting_label,
        updated_by)
     VALUES (?,?,?,?,?, ?,?, ?, ?,?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?, ?,?)
     ON DUPLICATE KEY UPDATE
       bkash_number=VALUES(bkash_number), bkash_enabled=VALUES(bkash_enabled),
       nagad_number=VALUES(nagad_number), nagad_enabled=VALUES(nagad_enabled),
       coupon_enabled=VALUES(coupon_enabled), instructions=VALUES(instructions), note=VALUES(note),
       fee_enabled=VALUES(fee_enabled), fee_label=VALUES(fee_label),
       discount_label=VALUES(discount_label), coupon_placeholder=VALUES(coupon_placeholder),
       apply_label=VALUES(apply_label), payable_enabled=VALUES(payable_enabled),
       payable_label=VALUES(payable_label), methods_label=VALUES(methods_label),
       bkash_label=VALUES(bkash_label), nagad_label=VALUES(nagad_label),
       instructions_enabled=VALUES(instructions_enabled),
       tx_enabled=VALUES(tx_enabled), tx_label=VALUES(tx_label),
       tx_placeholder=VALUES(tx_placeholder), sender_enabled=VALUES(sender_enabled),
       sender_label=VALUES(sender_label), sender_placeholder=VALUES(sender_placeholder),
       pending_note_enabled=VALUES(pending_note_enabled), pending_note=VALUES(pending_note),
       cancel_enabled=VALUES(cancel_enabled), cancel_label=VALUES(cancel_label),
       submit_enabled=VALUES(submit_enabled), submit_label=VALUES(submit_label),
       submitting_label=VALUES(submitting_label), updated_by=VALUES(updated_by)`,
    [
      "default",
      s(config.bkashNumber, 40),
      b(config.bkashEnabled),
      s(config.nagadNumber, 40),
      b(config.nagadEnabled),
      b(config.couponEnabled),
      s(config.instructions, 2000),
      s(config.note, 1000),
      b(config.feeEnabled),
      s(config.feeLabel, 40),
      s(config.discountLabel, 40),
      s(config.couponPlaceholder, 40),
      s(config.applyLabel, 40),
      b(config.payableEnabled),
      s(config.payableLabel, 40),
      s(config.methodsLabel, 40),
      s(config.bkashLabel, 40),
      s(config.nagadLabel, 40),
      b(config.instructionsEnabled),
      b(config.txEnabled),
      s(config.txLabel, 40),
      s(config.txPlaceholder, 80),
      b(config.senderEnabled),
      s(config.senderLabel, 40),
      s(config.senderPlaceholder, 40),
      b(config.pendingNoteEnabled),
      s(config.pendingNote, 500),
      b(config.cancelEnabled),
      s(config.cancelLabel, 40),
      b(config.submitEnabled),
      s(config.submitLabel, 40),
      s(config.submittingLabel, 40),
      adminUid,
    ],
  );
}
