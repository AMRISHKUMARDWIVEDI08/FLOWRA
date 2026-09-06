export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'exception';
export type PaymentType = 'invoice' | 'request' | 'payment';

export type Verification = {
  blockNumber?: string;
  from?: string;
  to?: string;
  amount?: string;
  gasUsed?: string;
  reason?: string;
};

export type Payment = {
  id: string;
  type: PaymentType;
  reference: string;
  counterparty: string;
  amount: string;
  token: 'USDC';
  status: PaymentStatus;
  createdAt: string;
  txHash?: string;
  verifiedAt?: string;
  reconciledAt?: string;
  paymentUrl?: string;
  wallet?: string;
  note?: string;
  verification?: Verification;
};
