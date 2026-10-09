import React, { useState, useEffect } from 'react';
import api from '../api';
import { Activity, IndianRupee, CreditCard, Utensils, Search, Download, Printer, PieChart, Tag, FileText } from 'lucide-react';

export default function Reports() {
  const getTodayStr = () => new Date().toLocaleDateString('en-CA');
  
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [activePill, setActivePill] = useState('Today');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'item_wise', 'discounts'

  const [salesData, setSalesData] = useState({
    total_revenue: 0,
    cash_total: 0,
    upi_card_total: 0,
    third_party_total: 0,
    transactions: []
  });
  const [itemWiseData, setItemWiseData] = useState([]);
  const [discountData, setDiscountData] = useState({
    total_discounted: 0,
    total_nc_lost: 0,
    transactions: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData(startDate, endDate);
  }, []);

  const fetchAllData = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const [salesRes, itemsRes, discountRes] = await Promise.all([
        api.get(`/api/orders/daily?start_date=${start}&end_date=${end}`),
        api.get(`/api/reports/items?start_date=${start}&end_date=${end}`),
        api.get(`/api/reports/discounts?start_date=${start}&end_date=${end}`)
      ]);
      setSalesData(salesRes.data);
      setItemWiseData(itemsRes.data);
      setDiscountData(discountRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePillClick = (pill) => {
    setActivePill(pill);
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (pill === 'Today') {
      // already set to today
    } else if (pill === 'Yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (pill === 'Last 7 Days') {
      start.setDate(today.getDate() - 6);
    } else if (pill === 'This Month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const startStr = start.toLocaleDateString('en-CA');
    const endStr = end.toLocaleDateString('en-CA');
    setStartDate(startStr);
    setEndDate(endStr);
    fetchAllData(startStr, endStr);
  };

  const handleSearch = () => {
    setActivePill('Custom');
    fetchAllData(startDate, endDate);
  };

  if (loading && salesData.transactions.length === 0) {
    return <div className="p-8 text-slate-500 font-bold">Loading analytics...</div>;
  }

  const formatDisplayDate = () => {
    if (startDate === endDate) {
      return new Date(startDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return `${new Date(startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}`;
  };

  const renderSalesSummary = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow text-white flex flex-col justify-center">
          <div className="text-blue-200 font-bold text-sm mb-2 uppercase tracking-wide">Total Revenue</div>
          <div className="text-5xl font-black">₹{salesData.total_revenue.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow border border-slate-200 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full text-green-600 shrink-0">
            <IndianRupee size={28} />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm leading-none mb-1">Cash Total</div>
            <div className="text-3xl font-black text-slate-800">₹{salesData.cash_total.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow border border-slate-200 flex items-center gap-4">
          <div className="bg-purple-100 p-4 rounded-full text-purple-600 shrink-0">
            <CreditCard size={28} />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm leading-none mb-1">UPI & Card Total</div>
            <div className="text-3xl font-black text-slate-800">₹{salesData.upi_card_total.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow border border-slate-200 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-full text-orange-600 shrink-0">
            <Utensils size={28} />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm leading-none mb-1">Swiggy / Zomato</div>
            <div className="text-3xl font-black text-slate-800">₹{salesData.third_party_total.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800">Transactions List</h2>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-100 text-slate-500 uppercase font-black text-xs sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Bill No.</th>
                <th className="px-6 py-3">Payment Method</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold">
              {salesData.transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">No transactions recorded in this period.</td>
                </tr>
              ) : (
                salesData.transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {new Date(tx.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-slate-800">{tx.display_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.payment_method === 'CASH' ? 'bg-green-100 text-green-700' :
                        tx.payment_method === 'THIRD_PARTY' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-800">₹{tx.net_total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderItemWise = () => (
    <>
      <div className="mb-6 flex gap-4 overflow-x-auto pb-4">
        {itemWiseData.slice(0, 5).map((item, idx) => (
          <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-lg text-white min-w-[200px] flex-shrink-0 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-slate-700/50">
              <PieChart size={100} />
            </div>
            <div className="relative z-10">
              <div className="text-orange-400 font-black text-xs uppercase tracking-widest mb-1">Rank #{idx + 1}</div>
              <div className="text-lg font-black mb-4 truncate" title={item.item_name}>{item.item_name}</div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Qty Sold</div>
                  <div className="text-2xl font-black text-green-400">{item.total_quantity_sold}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Revenue</div>
                  <div className="text-base font-black">₹{item.total_revenue_generated.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800">Product Mix / Item Sales</h2>
          <div className="flex gap-2">
             <button className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded text-xs font-bold text-slate-700 transition-colors">
               <Download size={14} /> Export CSV
             </button>
             <button className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded text-xs font-bold text-slate-700 transition-colors">
               <Printer size={14} /> Print Report
             </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-100 text-slate-500 uppercase font-black text-xs sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-700">Item Name</th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-700">Category</th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-700 text-right">Qty Sold</th>
                <th className="px-6 py-3 cursor-pointer hover:text-slate-700 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold">
              {itemWiseData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No item data recorded in this period.</td>
                </tr>
              ) : (
                itemWiseData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-800">{item.item_name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px]">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-800">{item.total_quantity_sold}</td>
                    <td className="px-6 py-4 text-right text-slate-800 text-green-700">₹{item.total_revenue_generated.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {salesData.total_revenue > 0 ? ((item.total_revenue_generated / salesData.total_revenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderDiscounts = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow border border-slate-200 flex items-center gap-4">
          <div className="bg-red-100 p-4 rounded-full text-red-600 shrink-0">
            <Tag size={28} />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm leading-none mb-1">Total Discounted (Lost)</div>
            <div className="text-3xl font-black text-slate-800">₹{discountData.total_discounted.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow border border-slate-200 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-full text-orange-600 shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <div className="text-slate-500 font-bold text-sm leading-none mb-1">Total Non-Chargeable (NC)</div>
            <div className="text-3xl font-black text-slate-800">₹{discountData.total_nc_lost.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800">Discounts & Voids Log</h2>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-100 text-slate-500 uppercase font-black text-xs sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Bill No.</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3 text-right">Original Amount</th>
                <th className="px-6 py-3 text-right">Amount Lost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold">
              {discountData.transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No discounts or NCs recorded in this period.</td>
                </tr>
              ) : (
                discountData.transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 border-l-4 border-l-transparent hover:border-l-red-500 transition-colors">
                    <td className="px-6 py-4">
                      {new Date(tx.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-slate-800">{tx.display_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.type === 'NC' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">₹{tx.original_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-red-600">-₹{tx.amount_lost.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-screen overflow-y-auto bg-slate-100">
      
      {/* Header & Date Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Business Analytics</h1>
          <p className="text-slate-500 font-bold mt-1">
            Showing data for: <span className="text-slate-800">{formatDisplayDate()}</span>
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          {/* Quick Pills */}
          <div className="flex gap-2">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Month'].map(pill => (
              <button 
                key={pill} 
                onClick={() => handlePillClick(pill)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  activePill === pill ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border border-slate-300">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setActivePill('Custom'); }}
              className="text-sm font-bold text-slate-700 outline-none"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setActivePill('Custom'); }}
              className="text-sm font-bold text-slate-700 outline-none"
            />
            <button 
              onClick={handleSearch}
              className="ml-2 bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded flex items-center justify-center transition-colors shadow-inner"
            >
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-300">
        <button 
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm transition-colors border-b-2 ${activeTab === 'summary' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileText size={18} /> Sales Summary
        </button>
        <button 
          onClick={() => setActiveTab('item_wise')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm transition-colors border-b-2 ${activeTab === 'item_wise' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <PieChart size={18} /> Product Mix
        </button>
        <button 
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm transition-colors border-b-2 ${activeTab === 'discounts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Tag size={18} /> Discounts & Voids
        </button>
      </div>

      {/* Tab Content */}
      <div className="pb-12">
        {activeTab === 'summary' && renderSalesSummary()}
        {activeTab === 'item_wise' && renderItemWise()}
        {activeTab === 'discounts' && renderDiscounts()}
      </div>

    </div>
  );
}
