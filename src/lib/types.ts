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
