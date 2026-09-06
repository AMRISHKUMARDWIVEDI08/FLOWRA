import { describe, expect, it } from 'vitest';
import { buildPaymentUrl, summarizePayments } from './ledger';
import type { Payment } from './types';

const base: Payment = { id: '1', type: 'request', reference: 'REQ-123456', counterparty: 'client', amount: '25.50', token: 'USDC', status: 'paid', createdAt: '2026-09-06T00:00:00Z', wallet: '0x1111111111111111111111111111111111111111' };

describe('FLOWRA ledger helpers', () => {
  it('summarizes received, sent, pending and exceptions', () => {
    const result = summarizePayments([base, { ...base, id: '2', type: 'payment', status: 'paid', amount: '5' }, { ...base, id: '3', status: 'processing', amount: '10' }, { ...base, id: '4', status: 'exception', amount: '3' }]);
    expect(result.received).toBe(25.5);
    expect(result.sent).toBe(5);
    expect(result.pending).toBe(1);
    expect(result.exceptions).toBe(1);
    expect(result.total).toBe(4);
  });

  it('encodes a payment link with the receiving address', () => {
    const url = buildPaymentUrl('https://flowra.example', base);
    expect(url).toContain('pay=REQ-123456');
    expect(url).toContain('amount=25.50');
    expect(url).toContain('to=0x1111111111111111111111111111111111111111');
  });
});
