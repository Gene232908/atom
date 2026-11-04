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
  /** 'shared' for normal borrower/lender group cards, 'loan' for self-loans */
  groupType?: 'shared' | 'loan';
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
  /** Amount the person says they sent, waiting for the lender to confirm. Not counted as paid yet. */
  claimCents?: number;
  /** Set when the lender said "No, I did not receive it". Shown to the person until they pay again. */
  rejectedCents?: number;
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
  /** Installment / term sequence number (e.g. 1, 2, 3...) */
  termNumber?: number;
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
  billingCycle?: string;
  /** Number of months / terms if installment (e.g. 6, 12, 24) */
  installmentsCount?: number;
  /** Exact manual monthly or per cut-off installment bill from Statement of Account (in centavos) */
  monthlyCents?: number;
  /** Transaction / payment history log for this item */
  payments?: PaymentRecord[];
  /** Where the debt came from, like Shopee or Lazada. Can be empty. */
  store: string;
  /** Card color picked by the lender. Empty means automatic. */
  color: string;
  /** Personal / self-loan specific metadata */
  isPersonalLoan?: boolean;
  totalTerms?: number;
  initialPaidTerms?: number;
  initialPaidCents?: number;
  firstDueDate?: string;
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
