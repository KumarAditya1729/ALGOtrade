import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Home, BarChart2, Briefcase, Settings, Globe, CreditCard, Bell, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const SidebarLink = ({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) => (
  <Link to={to}>
    <motion.div
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700/50 text-gray-300 transition-colors"
    >
      <Icon size={20} />
      <span>{children}</span>
    </motion.div>
  </Link>
);

export const AppLayout: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-header border-r border-gray-800 flex flex-col z-10">
        <div className="p-5 border-b border-gray-800 flex items-center gap-3">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-md shadow-sm" />
          <div className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            CalculatedRisk
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarLink to="/app/dashboard" icon={Home}>Dashboard</SidebarLink>
          <SidebarLink to="/app/trading" icon={BarChart2}>Trading</SidebarLink>
          <SidebarLink to="/app/global-market" icon={Globe}>Global Market</SidebarLink>
          <SidebarLink to="/app/portfolio" icon={Briefcase}>Portfolio</SidebarLink>
          <SidebarLink to="/app/orders" icon={BarChart2}>Orders</SidebarLink>
          <SidebarLink to="/app/strategies" icon={BarChart2}>Strategies</SidebarLink>
          <SidebarLink to="/app/strategy-builder" icon={BarChart2}>Flow Builder</SidebarLink>
          <SidebarLink to="/app/options" icon={BarChart2}>Options</SidebarLink>
          <SidebarLink to="/app/backtests" icon={BarChart2}>Backtesting</SidebarLink>
          <SidebarLink to="/app/community" icon={BarChart2}>Community</SidebarLink>
          <SidebarLink to="/app/chat" icon={BarChart2}>AI Assistant</SidebarLink>
          <SidebarLink to="/app/alerts" icon={Bell}>Signal Alerts</SidebarLink>
          <SidebarLink to="/app/universe" icon={List}>Universe</SidebarLink>
          <SidebarLink to="/app/settings" icon={Settings}>Settings</SidebarLink>
          <SidebarLink to="/app/billing" icon={CreditCard}>Billing</SidebarLink>
        </nav>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <Link to="/app/profile" className="flex items-center gap-3 px-2 mb-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ring-2 ring-transparent group-hover:ring-blue-500/40 transition-all">
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-500 truncate">
                {typeof user?.role === 'object' ? user.role.id : user?.role || 'user'} · View Profile
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="flex items-center space-x-2 text-red-400 hover:text-red-300 w-full p-2 rounded hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-950/50 relative">
        <header className="h-16 glass-header flex items-center px-6 z-10 sticky top-0">
          <div className="ml-auto flex items-center space-x-4">
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              API Connected
            </motion.span>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={{
                type: 'tween',
                ease: 'anticipate',
                duration: 0.3
              }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
