import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bell, Loader2 } from 'lucide-react';
import { Accounts } from './components/Accounts';
import { VisualAudit } from './components/VisualAudit';
import { Insights } from './components/Insights';
import { VoiceOrb } from './components/VoiceOrb';

function App() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  };

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/api/orbit/dashboard')
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          setDashboardData(res.data);
        } else {
          addNotification('Failed to load dashboard data.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        addNotification('Error connecting to backend.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  const primaryAccountId = dashboardData?.accounts?.[0]?.id;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-[#FF5E5E] via-[#FFD25E] to-[#5E7BFF] p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-white">bunq</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Orbit</span>
            </h1>
          </div>
          <div className="relative">
            <button className="p-2 hover:bg-gray-800 rounded-full transition-colors relative">
              <Bell className="text-gray-400 w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-black mb-2 tracking-tight">
            Welcome back, <span className="bunq-rainbow-text">{dashboardData?.company || 'Founder'}</span>.
          </h2>
          <p className="text-gray-400 font-medium tracking-wide">Your business universe is aligned. Here's your status.</p>
        </div>

        {/* Accounts Row */}
        <div className="mb-10">
          <Accounts accounts={dashboardData?.accounts || []} />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bunq-card p-1 h-full flex flex-col">
            <div className="bg-slate-900/40 p-8 rounded-[22px] flex-grow">
              <VisualAudit 
                primaryAccountId={primaryAccountId}
                onAuditComplete={(msg) => console.log(msg)} 
              />
            </div>
          </div>
          <div className="bunq-card p-1 h-full flex flex-col">
            <div className="bg-slate-900/40 p-8 rounded-[22px] flex-grow">
              <Insights 
                insights={dashboardData?.cashflowInsight} 
                recentPayments={dashboardData?.recentPayments || []} 
              />
            </div>
          </div>
        </div>
      </main>

      {/* Voice Assistant Orb (Real Integration) */}
      <VoiceOrb 
        accountId={primaryAccountId}
        onCommandExecuted={(res) => {
          console.log('Command executed:', res.intent);
          
          // Update Dashboard UI if assistant brought new data
          if (res.intent === 'GET_FORECAST' && res.data?.insights) {
            setDashboardData((prev: any) => ({
              ...prev,
              cashflowInsight: res.data.insights
            }));
          } else if (res.intent === 'CHECK_BALANCE' && res.data?.balance) {
            setDashboardData((prev: any) => ({
              ...prev,
              accounts: prev.accounts.map((a: any) => 
                a.id === primaryAccountId ? { ...a, balance: res.data.balance } : a
              )
            }));
          }
        }} 
      />

      {/* Notifications Toast */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg border border-indigo-500 font-medium"
            >
              {msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
