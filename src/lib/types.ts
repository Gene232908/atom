/** unpaid = not paid yet, claimed = person says they paid, paid = lender confirmed. */
export type ShareStatus = 'unpaid' | 'claimed' | 'paid';

export interface Member {
  name: string;
  email: string;
  photo: string;
  joinedAt: number;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  members: Record<string, Member>;
  inviteCode: string;
  paymentNote: string;
  hasQr: boolean;
  /** Card color picked by the lender. Empty means automatic. */
  color: string;
  /** Unpaid amount (in centavos) per person. Kept up to date by the lender's app. */
  totals: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface Share {
  name: string;
  status: ShareStatus;
  updatedAt: number;
  /** Amount in centavos already paid towards this share (for installments / cut-offs) */
  paidCents?: number;
  /** Latest payment reference number (e.g. GCash / Maya reference string) */
  refNumber?: string;
}

export interface PaymentRecord {
  id: string;
  uid: string;
  payerName: string;
  amountCents: number;
  /** Alphanumeric payment reference number (e.g. GCash / Bank reference code) */
  refNumber: string;
  paidAt: number;
  note?: string;
  /** 'pending' = waiting for lender confirmation, 'confirmed' = lender verified */
  status: 'pending' | 'confirmed';
}

export interface Item {
  id: string;
  description: string;
  /** Money is saved in centavos so there are no rounding mistakes. */
  priceCents: number;
  splitCents: number;
  shares: Record<string, Share>;
  /** Format: YYYY-MM-DD */
  dueDate: string | null;
  /** Billing cycle or cutoff info, e.g. "Monthly (Every 15th)", "Every cutoff" */
  billingCycle?: string;
  /** Number of months / terms if installment (e.g. 6, 12, 24) */
  installmentsCount?: number;
  /** Transaction / payment history log for this item */
  payments?: PaymentRecord[];
  /** Where the debt came from, like Shopee or Lazada. Can be empty. */
  store: string;
  /** Card color picked by the lender. Empty means automatic. */
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Invite {
  groupId: string;
  groupName: string;
  ownerName: string;
}

export interface PersonSummary {
  uid: string;
  name: string;
  email: string;
  photo: string;
  isOwner: boolean;
  inList: boolean;
  owes: number;
  waiting: number;
  paid: number;
}
