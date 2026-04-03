import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Activity,
    Send,
    RefreshCw,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

interface Account {
    _id: string;
    status: string;
    currency: string;
}

interface TxUser {
    _id: string;
    name: string;
    email: string;
}

interface PopulatedAccount {
    _id: string;
    user: TxUser;
    currency: string;
}

interface Transaction {
    _id: string;
    fromAccount: PopulatedAccount;
    toAccount: PopulatedAccount;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
    createdAt: string;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_STYLES: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-rose-50 text-rose-700',
    REVERSED: 'bg-slate-100 text-slate-600',
};

const PIE_COLORS = ['#ef4444', '#22c55e'];

export default function Dashboard() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [accRes, txRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/transactions'),
            ]);
            const accs: Account[] = accRes.data.accounts ?? [];
            setAccounts(accs);
            const txs: Transaction[] = txRes.data.transactions ?? [];
            setTransactions(txs);
            const active = accs.find((a) => !a.status || a.status === 'active') ?? accs[0];
            if (active) {
                const balRes = await api.get(`/accounts/balance/${active._id}/transactions`);
                setBalance(balRes.data.balance ?? 0);
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e.response?.data?.message || e.message || 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const activeAccId = (accounts.find((a) => !a.status || a.status === 'active') ?? accounts[0])?._id;

    const completedTxs = transactions.filter((t) => t.status === 'COMPLETED');

    const totalSent = completedTxs
        .filter((t) => t.fromAccount?._id === activeAccId)
        .reduce((s, t) => s + t.amount, 0);

    const totalReceived = completedTxs
        .filter((t) => t.toAccount?._id === activeAccId)
        .reduce((s, t) => s + t.amount, 0);

    const balanceTrendData = (() => {
        if (!completedTxs.length) return [];
        const sorted = [...completedTxs].reverse();
        let running = 0;
        const points = sorted.map((tx) => {
            const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
            const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;
            running = isSent ? running - tx.amount : running + tx.amount;
            return { date: fmtDate(tx.createdAt), balance: Math.max(0, running) };
        });
        if (balance !== null) points.push({ date: 'Now', balance });
        return points;
    })();

    const pieData = [
        { name: 'Sent', value: totalSent },
        { name: 'Received', value: totalReceived },
    ].filter((d) => d.value > 0);

    const recentTxs = transactions.slice(0, 5);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full min-h-96">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-slate-500 text-sm">Loading your dashboard…</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
                            {user?.name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Here's your financial overview</p>
                    </div>
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 transition-all hover:shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/25 col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-indigo-100 text-xs font-semibold uppercase tracking-wider">Balance</span>
                            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">
                            {balance !== null ? fmt(balance) : '—'}
                        </p>
                        <p className="text-indigo-200 text-xs mt-2 font-medium">
                            {accounts[0]?.currency ?? 'INR'} · Active account
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Sent</span>
                            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-rose-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{fmt(totalSent)}</p>
                        <p className="text-slate-400 text-xs mt-2">All-time outflow</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Received</span>
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{fmt(totalReceived)}</p>
                        <p className="text-slate-400 text-xs mt-2">All-time inflow</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Transactions</span>
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-indigo-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{transactions.length}</p>
                        <p className="text-slate-400 text-xs mt-2">Total records</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-700 mb-5">Balance Trend</h2>
                        {balanceTrendData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={balanceTrendData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                        width={50}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)' }}
                                        formatter={(v) => [fmt(Number(v ?? 0)), 'Balance']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        fill="url(#balGrad)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-55 flex flex-col items-center justify-center gap-2 text-center">
                                <Activity className="w-10 h-10 text-slate-200" />
                                <p className="text-slate-400 text-sm font-medium">No transaction data yet</p>
                                <p className="text-slate-400 text-xs">Complete a transaction to see your balance trend</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-700 mb-5">Credit vs Debit</h2>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="42%"
                                        innerRadius={58}
                                        outerRadius={82}
                                        paddingAngle={4}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                        formatter={(v) => [fmt(Number(v ?? 0))]}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(v) => <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{v}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-55 flex flex-col items-center justify-center gap-2 text-center">
                                <div className="w-20 h-20 rounded-full border-4 border-slate-100 flex items-center justify-center">
                                    <CreditCard className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 text-sm">No data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-700">Recent Transactions</h2>
                        <Link
                            to="/transactions"
                            className="text-indigo-600 text-xs font-semibold hover:text-indigo-500 transition-colors flex items-center gap-1"
                        >
                            View all <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {recentTxs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Activity className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-slate-700 font-semibold text-sm">No transactions yet</p>
                            <p className="text-slate-400 text-xs mt-1 mb-5">Send money to get started</p>
                            <Link
                                to="/send-money"
                                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                <Send className="w-4 h-4" /> Send Money
                            </Link>
                        </div>
                    ) : (
                        <div>
                            {recentTxs.map((tx) => {
                                const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
                                const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;
                                const counterparty = isSent ? tx.toAccount : tx.fromAccount;
                                return (
                                    <div
                                        key={tx._id}
                                        className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors"
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-rose-50' : 'bg-emerald-50'
                                                }`}
                                        >
                                            {isSent ? (
                                                <ArrowUpRight className="w-4 h-4 text-rose-500" />
                                            ) : (
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {isDeposit ? 'Opening Balance' : (isSent ? 'Sent to' : 'Received from')}{' '}
                                                {isDeposit ? '' : (counterparty?.user?.name ?? `…${counterparty?._id?.slice(-6)}`)}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(tx.createdAt)}</p>
                                        </div>
                                        <div className="text-right shrink-0 space-y-1">
                                            <p className={`text-sm font-bold ${isSent ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {isSent ? '−' : '+'}
                                                {fmt(tx.amount)}
                                            </p>
                                            <span
                                                className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[tx.status] ?? 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
