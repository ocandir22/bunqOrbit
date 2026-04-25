import React from 'react';
import { CreditCard, Wallet } from 'lucide-react';

export const Accounts = ({ accounts }: { accounts: any[] }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
      {accounts.map((acc, idx) => (
        <div key={acc.id} className={`min-w-[240px] rounded-2xl p-5 border ${idx === 0 ? 'bg-gradient-to-br from-indigo-900 to-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-2 rounded-lg">
              {idx === 0 ? <CreditCard className="text-white w-5 h-5" /> : <Wallet className="text-white w-5 h-5" />}
            </div>
          </div>
          <div>
            <p className="text-sm text-white/70 font-medium mb-1">{acc.description}</p>
            <p className="text-2xl font-bold text-white">
              {parseFloat(acc.balance.value).toFixed(2)} <span className="text-sm font-normal">{acc.balance.currency}</span>
            </p>
          </div>
        </div>
      ))}
      {accounts.length === 0 && (
        <div className="text-gray-500">No accounts found (Is sandbox running?)</div>
      )}
    </div>
  );
};
