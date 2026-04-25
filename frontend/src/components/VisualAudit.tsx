import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertTriangle, ScanLine, Loader2 } from 'lucide-react';

export const VisualAudit = ({ primaryAccountId, onAuditComplete }: { primaryAccountId: number, onAuditComplete: (result: any) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    fetch(import.meta.env.VITE_API_URL + '/api/orbit/analyze-invoice-file', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        setIsProcessing(false);
        if (data.status === 'success') {
          setResult(data.data);
          onAuditComplete(`Audit completed for ${data.data.invoice.merchant || data.data.invoice.vendor}`);
        } else {
          onAuditComplete('Audit failed: ' + data.message);
        }
      })
      .catch(err => {
        console.error(err);
        setIsProcessing(false);
        onAuditComplete('Error during visual audit.');
      });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const createDraftPayment = () => {
    if (!primaryAccountId || !result) return;
    setIsCreatingDraft(true);

    const payload = {
      accountId: primaryAccountId,
      amount: result.invoice.amount,
      currency: result.invoice.currency,
      counterpartyEmail: result.invoice.counterparty_email || 'sugardaddy@bunq.com',
      counterpartyName: result.invoice.merchant || result.invoice.vendor,
      description: `${result.invoice.category || 'Invoice'} via bunq_orbit`
    };

    fetch(import.meta.env.VITE_API_URL + '/api/bunq/draft-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        setIsCreatingDraft(false);
        if (data.status === 'success') {
          onAuditComplete(data.message);
          setResult(null); // Reset after success
        } else {
          onAuditComplete('Failed to create draft payment.');
        }
      })
      .catch(err => {
        console.error(err);
        setIsCreatingDraft(false);
        onAuditComplete('Error creating draft payment.');
      });
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <ScanLine className="text-indigo-400" /> Visual Audit
      </h2>
      
      {!result && !isProcessing && (
        <div 
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-500'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => e.target.files && processFile(e.target.files[0])}
            accept="image/jpeg, image/png, image/webp"
          />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Drop receipt or invoice here</p>
        </div>
      )}

      {isProcessing && (
        <div className="border border-gray-800 rounded-xl p-10 text-center bg-gray-800/50 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#FF5E5E] via-[#FFD25E] to-[#5EFF8B] shadow-[0_0_10px_#6366f1]"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
          />
          <div className="relative">
            <ScanLine className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
            <p className="text-white font-black tracking-tight">Orbit AI is auditing...</p>
            <p className="text-sm text-gray-400 mt-2 font-medium">Securing your financial integrity</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {result && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-gray-700 bg-gray-800 rounded-xl p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 p-2 rounded-full">
                  <CheckCircle className="text-green-400 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">{result.invoice.vendor || result.invoice.merchant || 'Unknown Vendor'}</h3>
                  <p className="text-gray-400 text-sm">Due: {result.invoice.due_date || result.invoice.date || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{result.invoice.amount || '0.00'} {result.invoice.currency || 'EUR'}</p>
                <p className="text-sm text-gray-400">VAT: {result.invoice.vat || result.invoice.tax_amount || '0.00'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Category (AI)</p>
                <p className="text-sm text-white font-medium">{result.invoice.category || 'Uncategorized'}</p>
              </div>
              <div className={`p-3 rounded-lg border ${result.duplicate_check.isDuplicate ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className={`text-xs mb-1 ${result.duplicate_check.isDuplicate ? 'text-red-400' : 'text-green-400'}`}>Duplicate Risk</p>
                <p className={`text-sm font-medium ${result.duplicate_check.isDuplicate ? 'text-red-300' : 'text-green-300'}`}>
                  {result.duplicate_check.isDuplicate ? 'High Risk' : 'None Detected'}
                </p>
              </div>
            </div>

            <div className="mb-4 text-xs text-gray-500 text-right">
               AI Confidence: {result.invoice.confidence ? (result.invoice.confidence * 100).toFixed(0) : '95'}%
            </div>

            {/* Suggestion & Action */}
            <div className="mb-6">
              <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                <AlertTriangle className={`inline w-4 h-4 mr-2 ${result.duplicate_check.isDuplicate ? 'text-red-400' : 'text-indigo-400'}`} />
                {result.suggestion_text}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setResult(null)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                disabled={isCreatingDraft}
              >
                Cancel
              </button>
              
              {!result.duplicate_check.isDuplicate && (
                <button 
                  onClick={createDraftPayment}
                  disabled={isCreatingDraft}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Draft Payment'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
