import { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronDown,
    RefreshCw,
    Download,
    AlertTriangle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

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

interface Account {
    _id: string;
    status: string;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const STATUS_STYLES: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    FAILED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    REVERSED: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const FRAUD_THRESHOLD = 50000;

type TypeFilter = 'all' | 'sent' | 'received';
type StatusFilter = 'all' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export default function TransactionHistory() {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const loadData = async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            const [accRes, txRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/transactions'),
            ]);
            setAccounts(accRes.data.accounts ?? []);
            setTransactions(txRes.data.transactions ?? []);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error(e.response?.data?.message || e.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const activeAccId = (accounts.find((a) => !a.status || a.status === 'active') ?? accounts[0])?._id;

    const filtered = useMemo(() => {
        return transactions.filter((tx) => {
            const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
            const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;

            if (typeFilter === 'sent' && !isSent) return false;
            if (typeFilter === 'received' && isSent) return false;
            if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (new Date(tx.createdAt) < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (new Date(tx.createdAt) > to) return false;
            }

            const min = parseFloat(minAmount);
            const max = parseFloat(maxAmount);
            if (!isNaN(min) && tx.amount < min) return false;
            if (!isNaN(max) && tx.amount > max) return false;

            if (search.trim()) {
                const q = search.toLowerCase();
                const isDeposit2 = tx.fromAccount?._id === tx.toAccount?._id;
                const isSent2 = !isDeposit2 && tx.fromAccount?._id === activeAccId;
                const counterparty = isSent2 ? tx.toAccount : tx.fromAccount;
                const nameMatch = counterparty?.user?.name?.toLowerCase().includes(q);
                const emailMatch = counterparty?.user?.email?.toLowerCase().includes(q);
                const idMatch =
                    tx.fromAccount?._id?.toLowerCase().includes(q) ||
                    tx.toAccount?._id?.toLowerCase().includes(q) ||
                    tx._id?.toLowerCase().includes(q);
                const amtMatch = tx.amount.toString().includes(q);
                if (!nameMatch && !emailMatch && !idMatch && !amtMatch) return false;
            }

            return true;
        });
    }, [transactions, activeAccId, typeFilter, statusFilter, dateFrom, dateTo, minAmount, maxAmount, search]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalSent = filtered
        .filter((t) => t.status === 'COMPLETED' && t.fromAccount?._id !== t.toAccount?._id && t.fromAccount?._id === activeAccId)
        .reduce((s, t) => s + t.amount, 0);
    const totalReceived = filtered
        .filter((t) => t.status === 'COMPLETED' && (t.fromAccount?._id === t.toAccount?._id || t.toAccount?._id === activeAccId))
        .reduce((s, t) => s + t.amount, 0);

    const exportCSV = () => {
        const rows = [
            ['Date', 'Type', 'Counterparty', 'Amount', 'Status', 'TX ID'],
            ...filtered.map((tx) => {
                const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
                const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;
                const cp = isDeposit ? tx.toAccount : (isSent ? tx.toAccount : tx.fromAccount);
                return [
                    fmtDateTime(tx.createdAt),
                    isDeposit ? 'Deposit' : (isSent ? 'Sent' : 'Received'),
                    cp?.user?.name ?? cp?._id ?? '—',
                    tx.amount.toFixed(2),
                    tx.status,
                    tx._id,
                ];
            }),
        ];
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
        setMinAmount('');
        setMaxAmount('');
        setPage(1);
    };

    const hasActiveFilters =
        typeFilter !== 'all' ||
        statusFilter !== 'all' ||
        dateFrom ||
        dateTo ||
        minAmount ||
        maxAmount ||
        search;

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full min-h-96">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-slate-500 text-sm">Loading transactions…</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', fontSize: '14px' } }} />
            <div className="p-6 max-w-7xl mx-auto space-y-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
                            {hasActiveFilters && ' (filtered)'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 transition-all hover:shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={exportCSV}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl px-3 py-2 transition-all font-semibold disabled:opacity-40"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Filtered Sent</p>
                            <p className="text-slate-800 font-bold text-sm">{fmt(totalSent)}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Filtered Received</p>
                            <p className="text-slate-800 font-bold text-sm">{fmt(totalReceived)}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Large Transactions</p>
                            <p className="text-slate-800 font-bold text-sm">
                                {filtered.filter((t) => t.amount >= FRAUD_THRESHOLD).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-48">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search by name, email, account ID, amount…"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-all ${showFilters || hasActiveFilters
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="bg-white/30 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                        !
                                    </span>
                                )}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="text-sm font-semibold text-rose-500 hover:text-rose-400 px-3 py-2.5 rounded-xl border border-rose-100 bg-rose-50 transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                                    <div className="relative">
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all appearance-none pr-8"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="sent">Sent</option>
                                            <option value="received">Received</option>
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                                    <div className="relative">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all appearance-none pr-8"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="FAILED">Failed</option>
                                            <option value="REVERSED">Reversed</option>
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date From</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date To</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Min Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={minAmount}
                                        onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Max Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={maxAmount}
                                        onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                        placeholder="Any"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {paginated.length === 0 ? (
                        <div className="py-16 text-center">
                            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-600 font-semibold text-sm">No transactions found</p>
                            <p className="text-slate-400 text-xs mt-1">
                                {hasActiveFilters ? 'Try adjusting your filters' : 'Send money to see transactions here'}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="mt-4 text-indigo-600 text-sm font-semibold hover:text-indigo-500 transition-colors"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Counterparty</th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                                            <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">TX ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((tx) => {
                                            const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
                                            const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;
                                            const cp = isDeposit ? tx.toAccount : (isSent ? tx.toAccount : tx.fromAccount);
                                            const isFraud = tx.amount >= FRAUD_THRESHOLD;
                                            return (
                                                <tr
                                                    key={tx._id}
                                                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors ${isFraud ? 'bg-amber-50/30' : ''}`}
                                                >
                                                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateTime(tx.createdAt)}</td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                                                {isSent ? (
                                                                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                                                                ) : (
                                                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                                                                )}
                                                            </div>
                                                            <span className={`text-xs font-semibold ${isSent ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {isDeposit ? 'Deposit' : (isSent ? 'Sent' : 'Received')}
                                                            </span>
                                                            {isFraud && (
                                                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-semibold text-slate-800 text-xs">{cp?.user?.name ?? '—'}</p>
                                                        <p className="text-slate-400 text-xs mt-0.5 font-mono">{cp?._id?.slice(-10)}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                        <span className={`font-bold ${isSent ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                            {isSent ? '−' : '+'}{fmt(tx.amount)}
                                                        </span>

                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[tx.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-xs font-mono text-slate-400">…{tx._id.slice(-8)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden divide-y divide-slate-50">
                                {paginated.map((tx) => {
                                    const isDeposit = tx.fromAccount?._id === tx.toAccount?._id;
                                    const isSent = !isDeposit && tx.fromAccount?._id === activeAccId;
                                    const cp = isDeposit ? tx.toAccount : (isSent ? tx.toAccount : tx.fromAccount);
                                    const isFraud = tx.amount >= FRAUD_THRESHOLD;
                                    return (
                                        <div key={tx._id} className={`flex items-center gap-3 px-4 py-4 ${isFraud ? 'bg-amber-50/40' : ''}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                                {isSent ? (
                                                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                                                ) : (
                                                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {isDeposit ? 'Opening Balance' : (cp?.user?.name ?? `…${cp?._id?.slice(-6)}`)}
                                                    </p>
                                                    {isFraud && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(tx.createdAt)}</p>
                                            </div>
                                            <div className="text-right shrink-0 space-y-1">
                                                <p className={`text-sm font-bold ${isSent ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                    {isSent ? '−' : '+'}{fmt(tx.amount)}
                                                </p>

                                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[tx.status] ?? ''}`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Prev
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${page === p
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {user && (
                    <p className="text-xs text-slate-400 text-center">
                        Showing transactions for <span className="font-semibold text-slate-500">{user.email}</span>
                    </p>
                )}
            </div>
        </Layout>
    );
}
