import { createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem';

export const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_USDC = '0x3600000000000000000000000000000000000000' as const;

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const client = createPublicClient({ transport: http(ARC_TESTNET_RPC) });

export type VerificationResult = { verified: boolean; reconciled: boolean; reason: string; blockNumber?: string; from?: string; to?: string; amount?: string; gasUsed?: string };

export async function verifyUSDCTransfer(txHash: `0x${string}`, expectedTo: string, expectedAmount: string, expectedFrom?: string): Promise<VerificationResult> {
  const [tx, receipt] = await Promise.all([client.getTransaction({ hash: txHash }), client.getTransactionReceipt({ hash: txHash })]);
  if (!tx) return { verified: false, reconciled: false, reason: 'Transaction was not found on Arc.' };
  if (receipt.status !== 'success') return { verified: false, reconciled: false, reason: 'The transaction reverted on Arc.', blockNumber: receipt.blockNumber.toString() };
  const expectedUnits = BigInt(Math.round(Number(expectedAmount) * 1_000_000));
  const transfer = receipt.logs.find((log) => log.address.toLowerCase() === ARC_USDC.toLowerCase() && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aebd3b4a2f5');
  if (!transfer) return { verified: false, reconciled: false, reason: 'No Arc USDC Transfer event was found.' };
  let decoded;
  try { decoded = decodeEventLog({ abi: [transferEvent], data: transfer.data, topics: transfer.topics }); } catch { decoded = null; }
  if (!decoded || decoded.eventName !== 'Transfer') return { verified: false, reconciled: false, reason: 'The USDC Transfer event could not be decoded.' };
  const from = String(decoded.args.from); const to = String(decoded.args.to); const amount = BigInt(decoded.args.value as bigint);
  const recipientOk = to.toLowerCase() === expectedTo.toLowerCase();
  const senderOk = !expectedFrom || from.toLowerCase() === expectedFrom.toLowerCase();
  const amountOk = amount === expectedUnits;
  const reconciled = recipientOk && senderOk && amountOk;
  return { verified: true, reconciled, reason: reconciled ? 'Confirmed, verified and reconciled against the payment request.' : 'Transaction confirmed, but one or more payment fields do not match the request.', blockNumber: receipt.blockNumber.toString(), from, to, amount: (Number(amount) / 1_000_000).toFixed(6), gasUsed: receipt.gasUsed.toString() };
}
