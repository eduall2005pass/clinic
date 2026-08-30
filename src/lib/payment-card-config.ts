/**
 * Payment Card configuration — shared between the student-facing card
 * (EnrollModal), the Admin live-preview editor and the MySQL-backed store.
 *
 * Every visible element on the student payment card is represented here:
 *   - an `enabled` flag (when OFF the element never appears on the card), and
 *   - the editable labels/placeholders/text shown on the card.
 * Students can never edit this — only the Admin Payment Card editor writes it.
 *
 * This file is client-safe: it must NOT import anything server-only (e.g.
 * mysql), because the student modal is a client component.
 */

export type PaymentCardConfig = {
  bkashNumber: string;
  nagadNumber: string;
  bkashEnabled: boolean;
  nagadEnabled: boolean;

  // Course Fee / Discount breakdown (top of the card)
  feeEnabled: boolean;
  feeLabel: string;
  discountLabel: string;

  // Coupon block
  couponEnabled: boolean;
  couponPlaceholder: string;
  applyLabel: string;

  // Payable Amount box
  payableEnabled: boolean;
  payableLabel: string;

  // Payment Methods block
  methodsLabel: string;
  bkashLabel: string;
  nagadLabel: string;

  // Payment Instructions (instructions + extra note merged on the card)
  instructionsEnabled: boolean;
  instructions: string;
  note: string;

  // Transaction ID field
  txEnabled: boolean;
  txLabel: string;
  txPlaceholder: string;

  // Payment From Number field
  senderEnabled: boolean;
  senderLabel: string;
  senderPlaceholder: string;

  // Pending-validation helper text under the fields
  pendingNoteEnabled: boolean;
  pendingNote: string;

  // Buttons
  cancelEnabled: boolean;
  cancelLabel: string;
  submitEnabled: boolean;
  submitLabel: string;
  submittingLabel: string;
};

export const DEFAULT_PAYMENT_CARD: PaymentCardConfig = {
  bkashNumber: "",
  nagadNumber: "",
  bkashEnabled: true,
  nagadEnabled: false,

  feeEnabled: true,
  feeLabel: "Course Fee",
  discountLabel: "Discount",

  couponEnabled: true,
  couponPlaceholder: "COUPON CODE",
  applyLabel: "Apply",

  payableEnabled: true,
  payableLabel: "Payable Amount",

  methodsLabel: "Payment Methods",
  bkashLabel: "bKash",
  nagadLabel: "Nagad",

  instructionsEnabled: true,
  instructions: "",
  note: "",

  txEnabled: true,
  txLabel: "Transaction ID",
  txPlaceholder: "e.g. 8N7DQK2XLM",

  senderEnabled: true,
  senderLabel: "Payment From Number",
  senderPlaceholder: "01XXXXXXXXX",

  pendingNoteEnabled: true,
  pendingNote:
    "Submit payment details — enrollment stays Pending Validation until admin verifies payment.",

  cancelEnabled: true,
  cancelLabel: "Cancel",
  submitEnabled: true,
  submitLabel: "Submit Payment",
  submittingLabel: "Submitting Payment...",
};

/** Max lengths enforced server-side; mirrored here for the admin editor. */
export const PAYMENT_CARD_MAX = {
  bkashNumber: 40,
  nagadNumber: 40,
  feeLabel: 40,
  discountLabel: 40,
  couponPlaceholder: 40,
  applyLabel: 40,
  payableLabel: 40,
  methodsLabel: 40,
  bkashLabel: 40,
  nagadLabel: 40,
  instructions: 2000,
  note: 1000,
  txLabel: 40,
  txPlaceholder: 80,
  senderLabel: 40,
  senderPlaceholder: 40,
  pendingNote: 500,
  cancelLabel: 40,
  submitLabel: 40,
  submittingLabel: 40,
} as const;