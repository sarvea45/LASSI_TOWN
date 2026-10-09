import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { LogOut, DollarSign } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const { tables, setActiveTable, setOrderConfig, clearAuth, addTable } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ amount: '', transaction_type: 'PAYOUT', notes: '' });

  const handleLedgerSubmit = async (e) => {
    e.preventDefault();
    if (!ledgerForm.amount) return;
    try {
      await api.post('/api/ledger', {
        amount: parseFloat(ledgerForm.amount),
        transaction_type: ledgerForm.transaction_type,
        notes: ledgerForm.notes
      });
      alert('Ledger entry saved!');
      setShowLedgerModal(false);
      setLedgerForm({ amount: '', transaction_type: 'PAYOUT', notes: '' });
    } catch(err) {
      alert('Failed to save entry');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const handleTableClick = (id) => {
    setActiveTable(id);
    navigate('/pos');
  };

  const handleDirectOrder = (type) => {
    setActiveTable('DIRECT');
    setOrderConfig('DIRECT', { order_type: type, table_number: '' });
    navigate('/pos');
  };

  const handleAddTable = (e) => {
    e.preventDefault();
    if (!newTableId.trim()) return;
    addTable(newTableId.trim());
    setShowAddTableModal(false);
    setNewTableId('');
  };

  const calculateAmount = (cart) => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const tax = subtotal * 0.05;
    return subtotal + tax;
  };

  const getElapsedTime = (startTime) => {
    if (!startTime) return '';
    const diffMins = Math.floor((now - startTime) / 60000);
    return `${diffMins} Min`;
  };

  const tableKeys = Object.keys(tables).filter(k => k !== 'DIRECT');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 select-none font-sans">
      
      {/* Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100]">
          <div className="bg-white rounded p-6 shadow-xl w-96">
            <h2 className="text-xl font-black text-slate-800 mb-4">Petty Cash / Ledger</h2>
            <form onSubmit={handleLedgerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                <select 
                  value={ledgerForm.transaction_type} 
                  onChange={e => setLedgerForm({...ledgerForm, transaction_type: e.target.value})}
                  className="w-full border border-slate-300 p-2 rounded mt-1 font-bold"
                >
                  <option value="FLOAT">Cash In (Float)</option>
                  <option value="PAYOUT">Cash Out (Expense)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹)</label>
                <input 
                  type="number" 
                  value={ledgerForm.amount}
                  onChange={e => setLedgerForm({...ledgerForm, amount: e.target.value})}
                  className="w-full border border-slate-300 p-2 rounded mt-1 font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
                <input 
                  type="text" 
                  value={ledgerForm.notes}
                  onChange={e => setLedgerForm({...ledgerForm, notes: e.target.value})}
                  className="w-full border border-slate-300 p-2 rounded mt-1 font-bold"
                  placeholder="e.g. Milk, Supplies"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowLedgerModal(false)} className="px-4 py-2 bg-slate-200 rounded font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100]">
          <div className="bg-white rounded p-6 shadow-xl w-80">
            <h2 className="text-xl font-bold mb-4">Add New Table</h2>
            <form onSubmit={handleAddTable}>
              <input 
                type="text" 
                value={newTableId}
                onChange={(e) => setNewTableId(e.target.value)}
                placeholder="Table Number/Name" 
                className="w-full border border-slate-300 p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTableModal(false)} className="px-4 py-2 bg-slate-200 rounded font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="shrink-0 border-b border-slate-300 shadow-sm flex justify-between items-center px-6 py-4 bg-white">
        <div className="flex items-center gap-6">
          <button onClick={clearAuth} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={28} />
          </button>
          <div className="flex flex-col items-start leading-none">
            <div>
              <span className="font-chewy text-purple-700 text-4xl tracking-wide drop-shadow-sm border-white">Lassi</span>
              <span className="font-lilita text-red-500 text-3xl tracking-widest drop-shadow-sm ml-3">TOWN</span>
            </div>
            <span className="text-green-600 text-[9px] font-black tracking-[0.2em] mt-1">~ RESTAURANT POS ~</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleDirectOrder('DELIVERY')} className="px-6 py-2 bg-slate-800 text-white font-bold rounded shadow hover:bg-slate-700">
            Delivery
          </button>
          <button onClick={() => handleDirectOrder('TAKEAWAY')} className="px-6 py-2 bg-slate-800 text-white font-bold rounded shadow hover:bg-slate-700">
            Take Away
          </button>
          <button onClick={() => setShowAddTableModal(true)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-500">
            Add Table +
          </button>
        </div>
      </header>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {tableKeys.map((key) => {
            const t = tables[key];
            const isBlank = t.status === 'BLANK';
            const isRunning = t.status === 'RUNNING_KOT';
            const isPrinted = t.status === 'PRINTED_BILL';

            let bgClass = 'bg-slate-200 border-transparent hover:bg-slate-300';
            if (isRunning) bgClass = 'bg-green-100 border-green-500 hover:bg-green-200';
            if (isPrinted) bgClass = 'bg-yellow-100 border-yellow-500 hover:bg-yellow-200';

            return (
              <div 
                key={key}
                onClick={() => handleTableClick(key)}
                className={`relative h-28 rounded-lg shadow-sm flex flex-col justify-center items-center cursor-pointer transition-transform active:scale-95 border-2 ${bgClass}`}
              >
                {!isBlank && (
                  <span className={`absolute top-2 left-2 text-xs font-bold ${isPrinted ? 'text-yellow-800' : 'text-green-800'}`}>
                    {getElapsedTime(t.startTime)}
                  </span>
                )}
                
                <span className={`text-4xl font-black ${isBlank ? 'text-slate-500' : (isPrinted ? 'text-yellow-900' : 'text-green-900')}`}>
                  {key}
                </span>

                {!isBlank && (
                  <span className={`absolute bottom-2 right-2 text-sm font-black ${isPrinted ? 'text-yellow-900' : 'text-green-900'}`}>
                    ₹{calculateAmount(t.cart).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
