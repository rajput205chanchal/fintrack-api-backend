import { useState, useEffect } from 'react';
import type { SyntheticEvent } from 'react';
import {
    Send,
    AlertTriangle,
    Shield,
    Info,
    CheckCircle,
    ChevronDown,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../api/axios';

interface Account {
    _id: string;
    status: string;
    currency: string;
    createdAt: string;
}

const FRAUD_THRESHOLD = 50000;

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const genKey = () =>
    `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export default function SendMoney() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loading, setLoading] = useState(false);
    const [fraudConfirmed, setFraudConfirmed] = useState(false);
    const [success, setSuccess] = useState(false);

    const amountNum = parseFloat(amount) || 0;
    const isLarge = amountNum >= FRAUD_THRESHOLD;
    const isInsufficient = balance !== null && amountNum > balance;

    useEffect(() => {
        api
            .get('/accounts')
            .then((res) => {
                const accs: Account[] = res.data.accounts ?? [];
                setAccounts(accs);
                const active = accs.find((a) => !a.status || a.status === 'active') ?? accs[0];
                if (active) setFromAccount(active._id);
            })
            .catch((err: unknown) => {
                const e = err as { response?: { data?: { message?: string } }; message?: string };
                toast.error(e.response?.data?.message || e.message || 'Failed to load accounts');
            })
            .finally(() => setLoadingAccounts(false));
    }, []);

    useEffect(() => {
        if (!fromAccount) { setBalance(null); return; }
        api
            .get(`/accounts/balance/${fromAccount}/transactions`)
            .then((res) => setBalance(res.data.balance ?? 0))
            .catch(() => setBalance(null));
    }, [fromAccount]);

    useEffect(() => {
        setFraudConfirmed(false);
    }, [amount]);

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!fromAccount) { toast.error('Source account not found'); return; }
        if (!toAccount.trim()) { toast.error('Please enter a recipient account ID'); return; }
        if (fromAccount === toAccount.trim()) { toast.error('Cannot send to the same account'); return; }
        if (amountNum <= 0) { toast.error('Please enter a valid amount'); return; }
        if (isInsufficient) { toast.error('Insufficient balance'); return; }
        if (isLarge && !fraudConfirmed) { toast.error('Please confirm the large transaction warning'); return; }

        setLoading(true);
        try {
            await api.post('/transactions', {
                fromAccount,
                toAccount: toAccount.trim(),
                amount: amountNum,
                idempotencyKey: genKey(),
            });
            setSuccess(true);
            setToAccount('');
            setAmount('');
            setFraudConfirmed(false);
            toast.success('Transaction initiated successfully!');
            const balRes = await api.get(`/accounts/balance/${fromAccount}/transactions`);
            setBalance(balRes.data.balance ?? 0);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const inputBase =
        'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm';

    return (
        <Layout>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', fontSize: '14px' } }} />
            <div className="p-6 max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Send Money</h1>
                    <p className="text-slate-500 text-sm mt-1">Transfer funds to another account</p>
                </div>

                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-emerald-800 font-semibold text-sm">Transaction initiated!</p>
                            <p className="text-emerald-600 text-xs mt-0.5">
                                Your transfer is being processed. Check Transaction History for status updates.
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="bg-linear-to-r from-indigo-500 to-violet-600 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-xs font-semibold uppercase tracking-widest mb-1">Available Balance</p>
                                <p className="text-white text-3xl font-bold tracking-tight">
                                    {balance !== null ? fmt(balance) : '—'}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
                                <Send className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">From Account</label>
                            {loadingAccounts ? (
                                <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                            ) : (
                                <div className="relative">
                                    <select
                                        value={fromAccount}
                                        onChange={(e) => setFromAccount(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm appearance-none pr-10"
                                    >
                                        {accounts.length === 0 && <option value="">No accounts found</option>}
                                        {accounts.map((acc) => (
                                            <option key={acc._id} value={acc._id}>
                                                {acc._id.slice(-12).toUpperCase()} · {(acc.status ?? 'active').toUpperCase()} · {acc.currency ?? 'INR'}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Recipient Account ID
                            </label>
                            <input
                                type="text"
                                value={toAccount}
                                onChange={(e) => setToAccount(e.target.value)}
                                className={inputBase}
                                placeholder="Enter recipient's account ID"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <div className="flex items-start gap-1.5 mt-2">
                                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-400">
                                    Ask the recipient to share their Account ID from their dashboard.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (INR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm"
                                    placeholder="0.00"
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>
                            {isInsufficient && amountNum > 0 && (
                                <p className="text-rose-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Insufficient balance
                                </p>
                            )}
                            {amountNum > 0 && !isInsufficient && (
                                <p className="text-slate-400 text-xs mt-1.5">
                                    Balance after transfer:{' '}
                                    <span className="font-semibold text-slate-600">
                                        {balance !== null ? fmt(balance - amountNum) : '—'}
                                    </span>
                                </p>
                            )}
                        </div>

                        {isLarge && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-amber-800 text-sm font-bold">Large Transaction Detected</p>
                                        <p className="text-amber-700 text-xs mt-0.5">
                                            This transaction of{' '}
                                            <span className="font-semibold">{fmt(amountNum)}</span> exceeds{' '}
                                            <span className="font-semibold">{fmt(FRAUD_THRESHOLD)}</span>. Large transfers
                                            may be subject to additional review.
                                        </p>
                                    </div>
                                </div>
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={fraudConfirmed}
                                        onChange={(e) => setFraudConfirmed(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
                                    />
                                    <span className="text-amber-800 text-xs font-medium leading-relaxed">
                                        I confirm this large transfer is intentional and I authorise the transaction of{' '}
                                        <span className="font-bold">{fmt(amountNum)}</span>.
                                    </span>
                                </label>
                            </div>
                        )}

                        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
                            <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
                            <p className="text-slate-500 text-xs">
                                All transactions are encrypted and secured with bank-grade protection.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || loadingAccounts || accounts.length === 0 || (isLarge && !fraudConfirmed) || isInsufficient}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing…
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send {amountNum > 0 ? fmt(amountNum) : 'Money'}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Your Account ID</h3>
                    <p className="text-xs text-slate-500 mb-2">Share this with others so they can send you money:</p>
                    {accounts.find((a) => !a.status || a.status === 'active') ? (
                        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                            <code className="text-xs font-mono text-slate-700 break-all">
                                {(accounts.find((a) => !a.status || a.status === 'active') ?? accounts[0])?._id}
                            </code>
                            <button
                                onClick={() => {
                                    const id = (accounts.find((a) => !a.status || a.status === 'active') ?? accounts[0])?._id ?? '';
                                    navigator.clipboard.writeText(id);
                                    toast.success('Account ID copied!');
                                }}
                                className="text-indigo-600 hover:text-indigo-500 text-xs font-semibold shrink-0 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-xs">No active account found</p>
                    )}
                </div>
            </div>
        </Layout>
    );
}
