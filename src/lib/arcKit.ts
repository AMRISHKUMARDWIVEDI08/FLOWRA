import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';

export type WalletConnection = {
  provider: EIP1193Provider;
  adapter: Awaited<ReturnType<typeof createViemAdapterFromProvider>>;
  address: string;
  walletName: string;
};

type ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type ProviderDetail = {
  info: ProviderInfo;
  provider: EIP1193Provider;
};

export const ARC_CHAIN = 'Arc_Testnet' as const;
export const kit = new AppKit();

async function discoverWallets(): Promise<ProviderDetail[]> {
  const providers = new Map<string, ProviderDetail>();
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ProviderDetail>;
    if (custom.detail?.info?.uuid) providers.set(custom.detail.info.uuid, custom.detail);
  };
  window.addEventListener('eip6963:announceProvider', handler as EventListener);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  window.removeEventListener('eip6963:announceProvider', handler as EventListener);
  return [...providers.values()];
}

export async function connectArcWallet(): Promise<WalletConnection> {
  const providers = await discoverWallets();
  const selected = providers.find((p) => p.info.rdns === 'io.metamask' || p.info.name === 'MetaMask') ?? providers[0];
  if (!selected) throw new Error('No EIP-6963 browser wallet found. Install MetaMask or another compatible wallet.');

  await selected.provider.request({ method: 'eth_requestAccounts', params: undefined });
  const accounts = (await selected.provider.request({ method: 'eth_accounts', params: undefined })) as string[];
  const address = accounts[0];
  if (!address) throw new Error('Wallet connected but no account was returned.');

  const adapter = await createViemAdapterFromProvider({ provider: selected.provider });
  return { provider: selected.provider, adapter, address, walletName: selected.info.name };
}

export async function sendUSDC(connection: WalletConnection, to: string, amount: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error('Recipient address is invalid.');
  if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) throw new Error('Enter a valid USDC amount.');

  const result = await kit.send({
    from: { adapter: connection.adapter, chain: ARC_CHAIN },
    to,
    amount,
    token: 'USDC',
  });

  return result;
}
