import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, History, LogOut, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

interface LayoutProps {
    children: ReactNode;
}

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/send-money', icon: Send, label: 'Send Money' },
    { to: '/transactions', icon: History, label: 'Transactions' },
];

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
        }
        logout();
        navigate('/login');
        toast.success('Signed out successfully');
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <aside className="w-64 bg-slate-900 flex flex-col shrink-0 shadow-xl">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">Ledger</span>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="px-3 py-4 border-t border-slate-800 space-y-1">
                    <div className="px-3 py-2 rounded-xl bg-slate-800/50">
                        <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-all duration-150 w-full"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
