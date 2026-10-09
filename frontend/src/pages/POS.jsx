import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useStore from '../store/useStore';
import { ArrowLeft, Plus, Minus, Trash2, UtensilsCrossed, Search, Pause, Activity, ListOrdered, RefreshCw, Scissors, Gift } from 'lucide-react';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  
  // Modals
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountTypeModal] = useState('PERCENT'); // PERCENT or FLAT
  const [discountValue, setDiscountValueModal] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const { 
    tables, activeTableId, 
    addToTable, removeFromTable, updateTableQty, clearTable, setOrderConfig,
    markTableKOTPrinted, markTableBillPrinted, setDiscount, toggleNC,
    heldOrders, holdOrder, resumeOrder
  } = useStore();

  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);
  const [todayOrders, setTodayOrders] = useState([]);

  const fetchTodayOrders = async () => {
    try {
      const res = await api.get('/api/orders/daily');
      setTodayOrders(res.data.transactions);
    } catch (e) { console.error(e); }
  };

  const handleHold = () => {
    if (cart.length === 0) return;
    holdOrder(activeTableId);
    setToast('Order placed on Hold');
    setTimeout(() => setToast(''), 2000);
    navigate('/');
  };

  const activeData = tables[activeTableId] || tables['DIRECT'];
  const cart = activeData.cart || [];
  const orderConfig = activeData.orderConfig;
  const isNC = activeData.isNC || false;
  const discount = activeData.discount || { type: 'NONE', value: 0 };

  useEffect(() => {
    fetchProducts();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedProduct || showSettleModal || showDiscountModal) return; 
      if (e.key === 'F4') { e.preventDefault(); handleKOT(); }
      if (e.key === 'F8') { e.preventDefault(); handlePrintBill(); }
      if (e.key === 'F9') { e.preventDefault(); setShowSettleModal(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedProduct, showSettleModal, showDiscountModal]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/menu/products');
      setProducts(res.data);
      const uniqueCats = [...new Set(res.data.map(p => p.category))];
      setCategories(uniqueCats);
      if (uniqueCats.length > 0) setActiveCategory(uniqueCats[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductClick = (product) => {
    if (product.variants.length === 1) {
      addToTable(activeTableId, {
        variant_id: product.variants[0].id,
        name: product.name,
        price: parseFloat(product.variants[0].base_price),
        special_notes: ''
      });
    } else if (product.variants.length > 1) {
      setSelectedProduct(product);
    }
  };

  const handleVariantSelect = (variant) => {
    addToTable(activeTableId, {
      variant_id: variant.id,
      name: `${selectedProduct.name}`,
      price: parseFloat(variant.base_price),
      special_notes: variant.variant_name
    });
    setSelectedProduct(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const matched = products.find(p => p.name.toLowerCase().includes(query));
    if (matched) {
      handleProductClick(matched);
      setSearchQuery('');
    } else {
      setToast('Item not found!');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Math
  const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  let discountAmount = 0;
  if (discount.type === 'PERCENT') discountAmount = rawSubtotal * (discount.value / 100);
  if (discount.type === 'FLAT') discountAmount = discount.value;
  
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  let total = subtotal + cgst + sgst;
  
  if (isNC) {
    total = 0; // Non-Chargeable drops total to 0
  }

  const doPrint = (itemsToPrint, isEstimate, displayId = null, existingWindow = null) => {
    if (itemsToPrint.length === 0) return;
    const printWindow = existingWindow || window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert("Popup blocked! Please allow popups for this site to print receipts.");
      return;
    }
    
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const tokenNo = activeTableId !== 'DIRECT' ? `T-${activeTableId}` : "DIRECT";
    const billNo = displayId || "ESTIMATE";
    const cashierName = "Admin";
    const totalQty = itemsToPrint.reduce((acc, item) => acc + item.qty, 0);
    const dashedLine = `<div>------------------------------------------</div>`;
    const isKOTOnly = isEstimate && !displayId;

    let kotItemsHtml = itemsToPrint.map(item => `
      <div style="display: flex; justify-content: space-between;">
        <span style="flex: 1; text-align: left;">${item.name}</span>
        <span style="flex: 0 0 30%; text-align: center;">${item.special_notes || '-'}</span>
        <span style="flex: 0 0 15%; text-align: right;">${item.qty}</span>
      </div>
    `).join('');

    let billItemsHtml = '';
    if (!isKOTOnly) {
      billItemsHtml = itemsToPrint.map((item, idx) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="flex: 0 0 10%; text-align: left;">${idx + 1}</span>
          <span style="flex: 1; text-align: left;">${item.name}</span>
          <span style="flex: 0 0 15%; text-align: center;">${item.qty}</span>
          <span style="flex: 0 0 20%; text-align: right;">${item.price.toFixed(2)}</span>
          <span style="flex: 0 0 20%; text-align: right;">${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('');
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; line-height: 1.2; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; }
            @media print { .page-break { page-break-after: always; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="center">
            <div>${dateStr}</div>
            <div class="bold" style="font-size: 16px; margin-top: 5px;">KOT - ${tokenNo}</div>
            <div style="margin-top: 5px;">${orderConfig.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}</div>
            ${orderConfig.order_type === 'DINE_IN' ? `<div class="bold">Table No: ${orderConfig.table_number || 'N/A'}</div>` : ''}
          </div>
          ${dashedLine}
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span style="flex: 1; text-align: left;">Item</span>
            <span style="flex: 0 0 30%; text-align: center;">Special Note</span>
            <span style="flex: 0 0 15%; text-align: right;">Qty.</span>
          </div>
          ${dashedLine}
          ${kotItemsHtml}
          ${dashedLine}
          <div class="flex-between bold"><span></span><span>Total Qty: ${totalQty}</span></div>
          
          ${isKOTOnly ? '' : `
          <br><br>
          <div style="page-break-after: always;"></div>
          <div class="center bold" style="font-size: 18px; text-transform: uppercase;">Lassi town</div>
          <div class="center" style="font-size: 10px; margin: 5px 0;">D.no 10-57/1, Near SKBR Collage Road,<br>Amalapuram, Edarapalle-533201.</div>
          <div class="center bold">G.S.T - 37CSKPN0627A1ZZ</div>
          ${isNC ? `<div class="center bold" style="font-size: 16px; margin-top: 5px;">*** NON-CHARGEABLE (NC) ***</div>` : ''}
          ${!displayId && !isNC ? `<div class="center bold" style="font-size: 16px; margin-top: 5px;">*** ESTIMATE ***</div>` : ''}
          ${dashedLine}
          <div>Name: </div>
          ${dashedLine}
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="flex: 1;">Date: ${dateStr.split(' ')[0]} ${dateStr.split(' ')[1]}</span>
            <span style="flex: 1; text-align: right;">${orderConfig.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}: ${orderConfig.table_number || ''}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span style="flex: 1;">Cashier: ${cashierName}</span>
            <span style="flex: 1; text-align: right;">Bill No.: ${billNo}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="flex: 1;">Token No.: ${tokenNo}</span><span style="flex: 1;"></span>
          </div>
          ${dashedLine}
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span style="flex: 0 0 10%; text-align: left;">No.</span>
            <span style="flex: 1; text-align: left;">Item</span>
            <span style="flex: 0 0 15%; text-align: center;">Qty.</span>
            <span style="flex: 0 0 20%; text-align: right;">Price</span>
            <span style="flex: 0 0 20%; text-align: right;">Amount</span>
          </div>
          ${dashedLine}
          ${billItemsHtml}
          ${dashedLine}
          <div class="flex-between bold">
            <span>Total Qty: ${totalQty}</span>
            <span>Sub Total ${rawSubtotal.toFixed(2)}</span>
          </div>
          ${discountAmount > 0 ? `
          <div class="flex-between bold" style="font-size: 11px;">
            <span>Discount</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
          ` : ''}
          ${dashedLine}
          <div class="flex-between bold" style="font-size: 14px;">
            <span></span>
            <span>Grand Total ₹${total.toFixed(2)}</span>
          </div>
          ${dashedLine}
          <div class="center" style="margin-top: 10px;">
            ${!displayId ? 'NOT PAID' : 'Thank you<br>Visit again..!'}
          </div>
          `}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // YIELD THE THREAD: Allow React to clear the UI before hijacking the browser with the print dialog
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      window.focus(); // RESTORE FOCUS to the POS window
    }, 300);
  };

  const handleKOT = () => {
    const unprinted = cart.filter(i => !i.printed_in_kot);
    if (unprinted.length === 0) {
      setToast('No new items to KOT!');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    markTableKOTPrinted(activeTableId);
    setToast('KOT Printed');
    setTimeout(() => setToast(''), 2000);
    
    // Print unblocked
    doPrint(unprinted, true);
  };

  const handlePrintBill = () => {
    if (cart.length === 0) return;
    markTableBillPrinted(activeTableId);
    setToast('Bill Printed');
    setTimeout(() => setToast(''), 2000);
    
    // Print unblocked
    doPrint(cart, true);
  };

  const handleSettleConfirm = async () => {
    // OPEN SYNCHRONOUSLY to bypass popup blockers before the await
    const preOpenedWindow = window.open('', '_blank', 'width=400,height=600');
    if (preOpenedWindow) {
      preOpenedWindow.document.write('Processing payment...');
    }
    
    try {
      const payload = {
        order_type: orderConfig.order_type,
        table_number: orderConfig.order_type === 'DINE_IN' ? parseInt(orderConfig.table_number) || null : null,
        order_source: 'IN_STORE',
        payment_method: isNC ? 'CASH' : paymentMethod,
        discount_amount: discountAmount,
          is_nc: isNC,
          items: cart.map(i => ({ variant_id: i.variant_id, qty: i.qty, special_notes: i.special_notes }))
      };
      
      // Capture current cart for printing before it clears
      const currentCart = [...cart];
      
      const res = await api.post('/api/orders', payload);
      
      // STATE UPDATES FIRST: Clear the modal and the table instantly
      setShowSettleModal(false);
      clearTable(activeTableId);
      navigate('/');
      
      // Trigger print which will yield the thread for 300ms
      doPrint(currentCart, false, res.data.display_id, preOpenedWindow); 
      
    } catch (err) {
      if (preOpenedWindow) preOpenedWindow.close();
      alert(err.response?.data?.detail || 'Failed to settle');
    }
  };

  const applyDiscount = () => {
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val >= 0) {
      setDiscount(activeTableId, discountType, val);
    }
    setShowDiscountModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-200 select-none font-sans relative">
      
      {/* Top Petpooja Navigation Bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900 text-white z-10 shadow h-14">
        <div className="font-bold text-lg text-orange-500 whitespace-nowrap tracking-wide uppercase">
          {activeTableId === 'DIRECT' ? `DIRECT (${orderConfig.order_type})` : `TABLE ${activeTableId}`}
        </div>

        {/* Search / Shortcode Bar */}
        <div className="flex-1 max-w-xl mx-4 relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search Item / Short Code (e.g. 101)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border-none text-white px-10 py-2 rounded shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-500 font-bold"
            />
          </form>
        </div>

        {/* Top Right Utilities */}
        <div className="flex gap-2">
          <button onClick={handleHold} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold transition-colors">
            <Pause size={14} /> Hold
          </button>
          <button 
            onClick={() => {
              setToast('Live View Activated');
              setTimeout(() => setToast(''), 2000);
            }} 
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold transition-colors text-green-400"
          >
            <Activity size={14} /> Live View
          </button>
          <button 
            onClick={() => {
              fetchTodayOrders();
              setShowOrdersDrawer(true);
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold transition-colors text-blue-400"
          >
            <ListOrdered size={14} /> Orders
          </button>
          <button 
            onClick={() => {
              setToast('Local data synced with server');
              setTimeout(() => setToast(''), 2000);
            }} 
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold transition-colors text-orange-400"
          >
            <RefreshCw size={14} /> Sync
          </button>
        </div>
      </header>

      {/* Body Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Column 1: Category Sidebar */}
        <div className="w-1/5 bg-slate-50 border-r border-slate-300 flex flex-col h-full overflow-y-auto scrollbar-hide shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left py-4 px-4 uppercase text-sm transition-colors border-b border-slate-200 shadow-sm ${
                activeCategory === cat 
                  ? 'bg-white border-l-4 border-red-600 text-black font-black' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Column 2: Product Grid */}
        <div className="flex-1 bg-slate-200 h-full overflow-y-auto p-2">
          <div className="grid grid-cols-4 xl:grid-cols-5 gap-2 content-start pb-20">
            {products.filter(p => p.category === activeCategory && p.is_active).map(product => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white border border-slate-300 text-xs font-bold text-center flex flex-col items-center justify-center p-2 h-20 hover:bg-slate-50 active:scale-95 transition-transform shadow-sm rounded-sm"
              >
                <span className="leading-tight mb-1 text-slate-900 line-clamp-2">{product.name}</span>
                {product.variants.length === 1 ? (
                  <span className="text-[10px] text-slate-500">₹{product.variants[0].base_price}</span>
                ) : (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{product.variants.length} Var</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Cart Sidebar (Right 30%) */}
        <div className="w-[30%] min-w-[400px] bg-white border-l border-slate-300 flex flex-col h-full shrink-0 relative z-20">
          
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2 rounded shadow-2xl font-bold z-50">
              {toast}
            </div>
          )}

          {/* Top Tabs */}
          <div className="flex shrink-0 border-b border-slate-300">
            {['DINE_IN', 'DELIVERY', 'TAKEAWAY'].map(type => (
              <button
                key={type}
                onClick={() => setOrderConfig(activeTableId, { order_type: type })}
                className={`flex-1 py-2 text-xs font-black uppercase transition-colors ${
                  orderConfig.order_type === type ? 'bg-red-600 text-white shadow-inner' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Cart Table Header */}
          <div className="flex px-3 py-2 bg-slate-200 border-b border-slate-300 text-[10px] font-black text-slate-700 shrink-0">
            <div className="flex-1">ITEMS</div>
            <div className="w-20 text-center">NOTES</div>
            <div className="w-20 text-center">QTY</div>
            <div className="w-16 text-right">PRICE</div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <UtensilsCrossed size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold">No Item Selected.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {cart.map((item, idx) => (
                  <div key={idx} className={`flex px-3 py-2 items-center hover:bg-slate-50 transition-colors ${item.printed_in_kot ? 'opacity-60' : 'bg-yellow-50'}`}>
                    <div className="flex-1 text-xs font-bold text-slate-900 leading-tight pr-1">
                      {item.name}
                      <button onClick={() => removeFromTable(activeTableId, item.variant_id, item.special_notes, item.printed_in_kot)} className="block text-red-500 mt-1 hover:text-red-700"><Trash2 size={12} /></button>
                    </div>
                    <div className="w-20 text-[10px] text-center text-slate-600 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.special_notes || '-'}
                    </div>
                    <div className="w-20 flex items-center justify-center gap-1">
                      <button onClick={() => updateTableQty(activeTableId, item.variant_id, item.special_notes, item.printed_in_kot, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded text-slate-700 font-bold hover:bg-slate-300"><Minus size={12} /></button>
                      <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateTableQty(activeTableId, item.variant_id, item.special_notes, item.printed_in_kot, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded text-slate-700 font-bold hover:bg-slate-300"><Plus size={12} /></button>
                    </div>
                    <div className="w-16 text-right font-black text-slate-900 text-sm">
                      {(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Zone (Bottom) */}
          <div className="shrink-0 bg-slate-100 border-t border-slate-300 flex flex-col">
            
            <div className="px-3 py-2 border-b border-slate-200 flex justify-between items-center bg-white relative">
               <div className="text-[11px] text-slate-500 font-black">
                 SUB: ₹{rawSubtotal.toFixed(2)} 
                 {discountAmount > 0 && <span className="text-red-500 ml-1">(-₹{discountAmount.toFixed(2)})</span>} 
                 <br/> TAX: ₹{(cgst+sgst).toFixed(2)}
               </div>
               <div className="text-2xl font-black text-red-600 flex flex-col items-end">
                 {isNC && <span className="text-xs bg-red-100 text-red-600 px-2 rounded mb-1">NC APPLIED</span>}
                 ₹{total.toFixed(2)}
               </div>
            </div>

            {/* Row 1: Action Utils */}
            <div className="flex px-2 pt-2 gap-2">
              <button 
                onClick={() => setShowDiscountModal(true)} 
                className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 rounded text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <span className="font-bold">%</span> Discount
              </button>
              <button 
                onClick={() => toggleNC(activeTableId)} 
                className={`flex-1 border py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isNC ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                <Gift size={14}/> NC
              </button>
              <button className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 rounded text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1">
                <Scissors size={14}/> Split
              </button>
            </div>

            {/* Row 2: Massive Primary Actions */}
            <div className="grid grid-cols-3 gap-2 p-2">
              <button 
                onClick={handleKOT} 
                disabled={cart.length === 0} 
                className="bg-orange-500 text-white py-3 rounded font-black text-sm hover:bg-orange-600 active:scale-95 shadow disabled:opacity-50 flex flex-col items-center justify-center leading-tight"
              >
                <span>KOT & Print</span>
                <span className="text-[10px] opacity-80">(F4)</span>
              </button>
              <button 
                onClick={handlePrintBill} 
                disabled={cart.length === 0} 
                className="bg-blue-600 text-white py-3 rounded font-black text-sm hover:bg-blue-700 active:scale-95 shadow disabled:opacity-50 flex flex-col items-center justify-center leading-tight"
              >
                <span>Print Bill</span>
                <span className="text-[10px] opacity-80">(F8)</span>
              </button>
              <button 
                onClick={() => setShowSettleModal(true)} 
                disabled={cart.length === 0} 
                className="bg-green-600 text-white py-3 rounded font-black text-sm hover:bg-green-700 active:scale-95 shadow disabled:opacity-50 flex flex-col items-center justify-center leading-tight"
              >
                <span>Settle</span>
                <span className="text-[10px] opacity-80">(F9)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settle/Tender Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">Settle Bill</h2>
              <button onClick={() => setShowSettleModal(false)} className="text-slate-500 hover:text-red-500 font-bold">CLOSE</button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="text-center">
                <div className="text-sm text-slate-500 font-bold mb-1">GRAND TOTAL DUE</div>
                <div className="text-6xl font-black text-slate-900">₹{total.toFixed(2)}</div>
              </div>

              {!isNC && (
                <>
                  <div className="flex gap-2">
                    {['CASH', 'CARD', 'UPI'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 py-3 text-sm font-bold rounded border-2 ${
                          paymentMethod === method 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'CASH' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="text-xs font-bold text-slate-500 mb-2 block">AMOUNT RECEIVED</label>
                      <input 
                        type="number" 
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full text-2xl font-bold p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                        placeholder="0.00"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => setAmountReceived((total).toFixed(2))} className="bg-white border border-slate-300 rounded py-2 text-sm font-bold hover:bg-slate-100">Exact</button>
                        <button onClick={() => setAmountReceived('500')} className="bg-white border border-slate-300 rounded py-2 text-sm font-bold hover:bg-slate-100">₹500</button>
                        <button onClick={() => setAmountReceived('1000')} className="bg-white border border-slate-300 rounded py-2 text-sm font-bold hover:bg-slate-100">₹1000</button>
                        <button onClick={() => setAmountReceived('2000')} className="bg-white border border-slate-300 rounded py-2 text-sm font-bold hover:bg-slate-100">₹2000</button>
                      </div>

                      {parseFloat(amountReceived) >= total && (
                        <div className="mt-4 text-center bg-green-100 border border-green-300 rounded p-3">
                          <div className="text-xs text-green-700 font-bold">CHANGE TO RETURN</div>
                          <div className="text-3xl font-black text-green-800">₹{(parseFloat(amountReceived) - total).toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <button 
                onClick={handleSettleConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-black text-xl shadow-lg transition-transform active:scale-95"
              >
                Confirm Payment & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3 font-bold flex justify-between items-center">
              <span>Apply Discount</span>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-white font-bold">X</button>
            </div>
            
            <div className="p-4 bg-slate-50 space-y-4">
              <div className="flex border border-slate-300 rounded overflow-hidden">
                <button 
                  onClick={() => setDiscountTypeModal('PERCENT')}
                  className={`flex-1 py-2 text-sm font-bold ${discountType === 'PERCENT' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                >
                  Percentage (%)
                </button>
                <button 
                  onClick={() => setDiscountTypeModal('FLAT')}
                  className={`flex-1 py-2 text-sm font-bold ${discountType === 'FLAT' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                >
                  Flat Amount (₹)
                </button>
              </div>

              <input 
                type="number" 
                value={discountValue}
                onChange={(e) => setDiscountValueModal(e.target.value)}
                className="w-full text-xl font-bold p-3 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={discountType === 'PERCENT' ? "e.g. 10" : "e.g. 150"}
              />

              <button 
                onClick={applyDiscount}
                className="w-full bg-green-600 text-white py-3 rounded font-bold text-sm shadow hover:bg-green-700"
              >
                Apply Discount
              </button>
              <button 
                onClick={() => { setDiscount(activeTableId, 'NONE', 0); setShowDiscountModal(false); }}
                className="w-full bg-slate-200 text-slate-700 py-2 rounded font-bold text-sm hover:bg-slate-300 mt-2"
              >
                Remove Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 font-bold flex justify-between items-center">
              <span>{selectedProduct.name}</span>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 bg-slate-100">
              {selectedProduct.variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className="w-full py-3 px-4 flex justify-between items-center bg-white border border-slate-300 rounded hover:border-slate-500 text-left font-bold text-sm shadow-sm"
                >
                  <span className="text-slate-800">{variant.variant_name}</span>
                  <span className="text-red-600">₹{variant.base_price}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Orders Drawer Modal */}
      {showOrdersDrawer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="w-[400px] bg-slate-50 h-full shadow-2xl flex flex-col">
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2"><ListOrdered size={20} /> Orders & Held Carts</h2>
              <button onClick={() => setShowOrdersDrawer(false)} className="text-slate-400 hover:text-white font-bold text-sm">CLOSE</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Held Orders Section */}
              <div className="mb-6">
                <h3 className="font-black text-slate-500 uppercase text-xs mb-3 flex justify-between">
                  <span>Held Orders</span>
                  <span className="bg-slate-200 text-slate-700 px-2 rounded-full">{heldOrders.length}</span>
                </h3>
                {heldOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No orders currently on hold.</p>
                ) : (
                  <div className="space-y-3">
                    {heldOrders.map((ho) => (
                      <div key={ho.id} className="bg-white p-3 rounded shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{ho.orderConfig.order_type === 'DINE_IN' ? `Table ${ho.originalTable}` : ho.orderConfig.order_type}</span>
                            <div className="text-xs text-slate-500">{new Date(ho.timestamp).toLocaleTimeString()}</div>
                          </div>
                          <span className="font-black text-green-700">₹{ho.cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-3 line-clamp-1">{ho.cart.map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
                        <button 
                          onClick={() => {
                            resumeOrder(ho.id, activeTableId);
                            setShowOrdersDrawer(false);
                          }}
                          className="w-full bg-blue-100 text-blue-700 font-bold text-xs py-2 rounded hover:bg-blue-200 transition-colors"
                        >
                          Resume to Active Table ({activeTableId})
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Settled Orders */}
              <div>
                <h3 className="font-black text-slate-500 uppercase text-xs mb-3 flex justify-between">
                  <span>Today's Settled</span>
                  <span className="bg-slate-200 text-slate-700 px-2 rounded-full">{todayOrders.length}</span>
                </h3>
                {todayOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No orders settled today.</p>
                ) : (
                  <div className="space-y-2">
                    {todayOrders.map((tx, idx) => (
                      <div key={idx} className="bg-white p-3 rounded shadow-sm border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{tx.display_id}</div>
                          <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-800">₹{tx.net_total.toFixed(2)}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tx.payment_method === 'CASH' ? 'bg-green-100 text-green-700' :
                            tx.payment_method === 'THIRD_PARTY' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {tx.payment_method}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

