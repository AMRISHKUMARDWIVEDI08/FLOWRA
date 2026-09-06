export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'exception';

export type Payment = {
  id: string;
  type: 'invoice' | 'request' | 'payment';
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
};
