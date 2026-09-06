import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Check, ChevronRight, Clipboard,
  FileText, Link2, Plus, QrCode, ReceiptText, Search, Send, ShieldCheck,
  Sparkles, WalletCards, X,
} from 'lucide-react';
import './styles.css';
import type { Payment } from './lib/types';
import { loadPayments, savePayments } from './lib/storage';
import { connectArcWallet, sendUSDC, type WalletConnection } from './lib/arcKit';

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function App() {
  const [payments, setPayments] = useState<Payment[]>(() => loadPayments());
  const [tab, setTab] = useState<'overview' | 'payments' | 'invoices' | 'settings'>('overview');
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'request' | 'invoice' | 'send' | null>(null);

  const paid = payments.filter((p) => p.status === 'paid');
  const pending = payments.filter((p) => p.status === 'pending' || p.status === 'processing');
  const exceptions = payments.filter((p) => p.status === 'exception' || p.status === 'failed');
  const totalReceived = paid.filter((p) => p.type !== 'payment').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const nav = [
    ['overview', 'Overview', BarChart3], ['payments', 'Payments', WalletCards],
    ['invoices', 'Invoices', FileText], ['settings', 'Settings', ShieldCheck],
  ] as const;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function addPayment(payment: Payment) {
    const next = [payment, ...payments];
    setPayments(next); savePayments(next); setModal(null); notify('Saved to FLOWRA.');
  }

  async function handleConnect() {
    setBusy(true);
    try {
      const connection = await connectArcWallet();
      setWallet(connection);
      notify(`Connected: ${connection.address.slice(0, 6)}…${connection.address.slice(-4)}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Wallet connection failed.');
    } finally { setBusy(false); }
  }

  async function handleSend(to: string, amount: string, note: string) {
    if (!wallet) throw new Error('Connect an Arc-compatible browser wallet first.');
    setBusy(true);
    try {
      const result = await sendUSDC(wallet, to, amount);
      const txHash = result?.steps?.find((step: any) => step?.txHash)?.txHash ?? result?.txHash;
      addPayment({
        id: makeId('pay'), type: 'payment', reference: `PAY-${Date.now().toString().slice(-6)}`,
        counterparty: to, amount, token: 'USDC', status: txHash ? 'processing' : 'pending',
        createdAt: new Date().toISOString(), txHash, wallet: wallet.address, note,
      });
      notify(txHash ? 'USDC transaction submitted. Verify it on-chain before marking paid.' : 'Payment started; status pending.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Payment failed.'); }
    finally { setBusy(false); }
  }

  const recent = payments.slice(0, 8);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>F</span></div><div><strong>FLOWRA</strong><small>simple global payments</small></div></div>
      <nav>{nav.map(([id, label, Icon]) => <button className={tab === id ? 'nav-item active' : 'nav-item'} key={id} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span>{tab === id && <ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav>
      <div className="sidebar-foot"><div className="network-dot"><span/> Arc Testnet</div><p>Circle App Kit powered</p></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">Payment workspace</span><h1>{tab === 'overview' ? 'Good to see you.' : tab[0].toUpperCase() + tab.slice(1)}</h1></div><button className="connect-btn" onClick={handleConnect} disabled={busy}><WalletCards size={17}/>{wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : 'Connect wallet'}</button></header>
      {tab === 'overview' && <>
        <section className="hero"><div><span className="pill"><Sparkles size={14}/> Built around real payment flows</span><h2>Move money.<br/>Know what happened.</h2><p>Receive, send and reconcile USDC payments with Arc settlement and Circle's App Kit.</p><div className="hero-actions"><button className="primary" onClick={() => setModal('request')}><Plus size={17}/> Request payment</button><button className="secondary" onClick={() => setModal('send')}><Send size={17}/> Send USDC</button></div></div><div className="proof-card"><div className="proof-head"><span>Payment proof</span><span className="status-dot">LIVE</span></div><div className="proof-amount">{totalReceived.toLocaleString(undefined,{maximumFractionDigits:2})}<span> USDC</span></div><div className="proof-row"><span>Settlement</span><b>Arc Testnet</b></div><div className="proof-row"><span>Wallet</span><b>{wallet ? `${wallet.address.slice(0,8)}…` : 'Not connected'}</b></div><div className="proof-row"><span>Reconciliation</span><b className="ok"><Check size={14}/> Ready</b></div></div></section>
        <section className="stats-grid"><Stat label="Received" value={`${totalReceived.toLocaleString(undefined,{maximumFractionDigits:2})} USDC`} icon={ArrowDownLeft}/><Stat label="Pending" value={`${pending.length}`} icon={ReceiptText}/><Stat label="Needs attention" value={`${exceptions.length}`} icon={ShieldCheck}/><Stat label="Payments" value={`${payments.length}`} icon={BarChart3}/></section>
        <section className="content-grid"><div className="panel"><div className="panel-title"><div><span className="eyebrow">Activity</span><h3>Recent payments</h3></div><button className="link-btn" onClick={() => setTab('payments')}>View all <ChevronRight size={15}/></button></div>{recent.length === 0 ? <EmptyState/> : <PaymentTable payments={recent}/>}</div><div className="panel side-panel"><div className="panel-title"><div><span className="eyebrow">Quick actions</span><h3>Get paid faster</h3></div></div><QuickAction icon={Link2} title="Payment link" text="Share one link to collect USDC." onClick={() => setModal('request')}/><QuickAction icon={QrCode} title="QR code" text="Put a receive QR at checkout." onClick={() => setModal('request')}/><QuickAction icon={FileText} title="Invoice" text="Create a payment-ready invoice." onClick={() => setModal('invoice')}/></div></section>
      </>}
      {tab === 'payments' && <PaymentsPage payments={payments} onSend={() => setModal('send')}/>} {tab === 'invoices' && <InvoicesPage payments={payments} onNew={() => setModal('invoice')}/>} {tab === 'settings' && <SettingsPage wallet={wallet} onConnect={handleConnect}/>} 
    </main>
    {modal === 'request' && <RequestModal onClose={() => setModal(null)} onSave={addPayment}/>} {modal === 'invoice' && <InvoiceModal onClose={() => setModal(null)} onSave={addPayment}/>} {modal === 'send' && <SendModal onClose={() => setModal(null)} onSend={handleSend} busy={busy} connected={!!wallet}/>} {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Stat({label,value,icon:Icon}:{label:string;value:string;icon:any}) { return <div className="stat-card"><div className="stat-icon"><Icon size={17}/></div><span>{label}</span><strong>{value}</strong></div>; }
function QuickAction({icon:Icon,title,text,onClick}:{icon:any;title:string;text:string;onClick:()=>void}) { return <button className="quick-action" onClick={onClick}><div className="quick-icon"><Icon size={17}/></div><div><b>{title}</b><p>{text}</p></div><ChevronRight size={16}/></button>; }
function EmptyState() { return <div className="empty"><WalletCards size={22}/><b>No payments yet</b><p>Connect a wallet, request a payment, or create an invoice to start.</p></div>; }
function PaymentTable({payments}:{payments:Payment[]}) { return <div className="table-wrap"><table><thead><tr><th>Payment</th><th>Counterparty</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td><b>{p.reference}</b><small>{new Date(p.createdAt).toLocaleString()}</small></td><td><span className="mono">{p.counterparty.startsWith('0x')?`${p.counterparty.slice(0,8)}…${p.counterparty.slice(-6)}`:p.counterparty}</span></td><td><b>{p.amount} USDC</b></td><td><Status status={p.status}/></td></tr>)}</tbody></table></div>; }
function Status({status}:{status:Payment['status']}) { const label=status==='paid'?'Paid':status==='processing'?'Processing':status==='pending'?'Pending':status==='exception'?'Exception':'Failed'; return <span className={`status ${status}`}><span/>{label}</span>; }
function PaymentsPage({payments,onSend}:{payments:Payment[];onSend:()=>void}) { const [q,setQ]=useState(''); const filtered=useMemo(()=>payments.filter(p=>`${p.reference} ${p.counterparty} ${p.amount}`.toLowerCase().includes(q.toLowerCase())),[payments,q]); return <section className="page"><div className="page-head"><div><span className="eyebrow">Ledger</span><h2>All payments</h2><p>Every request and transaction recorded by FLOWRA.</p></div><button className="primary" onClick={onSend}><Send size={17}/> Send USDC</button></div><div className="toolbar"><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search reference, address, amount…"/></div></div>{filtered.length?<PaymentTable payments={filtered}/>:<EmptyState/>}</section>; }
function InvoicesPage({payments,onNew}:{payments:Payment[];onNew:()=>void}) { const invoices=payments.filter(p=>p.type==='invoice'); return <section className="page"><div className="page-head"><div><span className="eyebrow">Collections</span><h2>Invoices</h2><p>Create payment-ready invoices and track reconciliation.</p></div><button className="primary" onClick={onNew}><Plus size={17}/> New invoice</button></div>{invoices.length?<PaymentTable payments={invoices}/>:<EmptyState/>}</section>; }
function SettingsPage({wallet,onConnect}:{wallet:WalletConnection|null;onConnect:()=>void}) { return <section className="page"><div className="page-head"><div><span className="eyebrow">Infrastructure</span><h2>Settings</h2><p>FLOWRA is configured for Arc Testnet using Circle App Kit.</p></div></div><div className="settings-grid"><div className="settings-card"><div className="proof-row"><span>Network</span><b>Arc Testnet</b></div><div className="proof-row"><span>Integration</span><b>Circle App Kit</b></div><div className="proof-row"><span>Wallet</span><b>{wallet?`${wallet.walletName} · ${wallet.address.slice(0,10)}…`:'Not connected'}</b></div><div className="proof-row"><span>Runtime mode</span><b className="ok"><Check size={14}/> Testnet</b></div>{!wallet&&<button className="primary full" onClick={onConnect}><WalletCards size={17}/> Connect wallet</button>}</div><div className="settings-card"><h3>Security</h3><p className="muted">Privileged Circle Wallets operations are deliberately kept out of the browser path. This build uses the browser-wallet App Kit adapter for user-signed Arc transactions.</p><div className="security-note"><ShieldCheck size={17}/><span>Never paste API keys or entity secrets into the frontend.</span></div></div></div></section>; }
function ModalShell({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) { return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">FLOWRA</span><h3>{title}</h3></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>; }
function RequestModal({onClose,onSave}:{onClose:()=>void;onSave:(p:Payment)=>void}) { const [amount,setAmount]=useState('');const [name,setName]=useState('');const [note,setNote]=useState('');const ref=`REQ-${Date.now().toString().slice(-6)}`;const url=`${window.location.origin}/?pay=${ref}`;const submit=()=>{if(!amount||Number(amount)<=0||!name)return;onSave({id:makeId('req'),type:'request',reference:ref,counterparty:name,amount,token:'USDC',status:'pending',createdAt:new Date().toISOString(),note,paymentUrl:url});};return <ModalShell title="Request payment" onClose={onClose}><label>Customer / payer<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Acme Studio"/></label><label>Amount<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="100.00"/></label><label>Note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Invoice, service, order…"/></label><div className="link-preview"><Link2 size={16}/><span>{url}</span><button onClick={()=>navigator.clipboard?.writeText(url)} aria-label="Copy payment link"><Clipboard size={15}/></button></div><button className="primary full" onClick={submit}>Create payment request</button></ModalShell>; }
function InvoiceModal({onClose,onSave}:{onClose:()=>void;onSave:(p:Payment)=>void}) { const [amount,setAmount]=useState('');const [client,setClient]=useState('');const [note,setNote]=useState('');const submit=()=>{if(!amount||Number(amount)<=0||!client)return;onSave({id:makeId('inv'),type:'invoice',reference:`INV-${Date.now().toString().slice(-6)}`,counterparty:client,amount,token:'USDC',status:'pending',createdAt:new Date().toISOString(),note});};return <ModalShell title="Create invoice" onClose={onClose}><label>Client<input value={client} onChange={e=>setClient(e.target.value)} placeholder="Client name"/></label><label>Amount<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="500.00"/></label><label>Description<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Project milestone / service"/></label><div className="invoice-proof"><ReceiptText size={18}/><div><b>{amount||'0.00'} USDC</b><span>Payment-ready invoice</span></div></div><button className="primary full" onClick={submit}>Create invoice</button></ModalShell>; }
function SendModal({onClose,onSend,busy,connected}:{onClose:()=>void;onSend:(to:string,amount:string,note:string)=>Promise<void>;busy:boolean;connected:boolean}) { const [to,setTo]=useState('');const [amount,setAmount]=useState('');const [note,setNote]=useState('');const submit=async()=>{if(!to||!amount)return;await onSend(to,amount,note);if(!busy)onClose();};return <ModalShell title="Send USDC" onClose={onClose}><div className="chain-banner"><span>Arc Testnet</span><b>USDC native gas</b></div><label>Recipient wallet<input value={to} onChange={e=>setTo(e.target.value)} placeholder="0x…" autoCapitalize="none"/></label><label>Amount<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="10.00"/></label><label>Note (optional)<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Why are you sending this?"/></label>{!connected&&<p className="form-warning">Connect your browser wallet before sending.</p>}<button className="primary full" onClick={submit} disabled={busy||!connected}>{busy?'Waiting for wallet…':<><Send size={17}/> Review and send</>}</button></ModalShell>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
