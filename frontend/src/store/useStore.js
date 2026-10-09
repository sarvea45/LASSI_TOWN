import { create } from 'zustand';

// Initialize 20 tables + 1 special 'DIRECT' slot
const initialTables = {};
for (let i = 1; i <= 20; i++) {
  initialTables[i.toString()] = {
    id: i.toString(),
    status: 'BLANK', // 'BLANK' | 'RUNNING_KOT' | 'PRINTED_BILL'
    startTime: null,
    cart: [],
    discount: { type: 'NONE', value: 0 }, // type: 'PERCENT', 'FLAT', 'NONE'
    isNC: false,
    orderConfig: { order_type: 'DINE_IN', table_number: i.toString() }
  };
}
initialTables['DIRECT'] = {
  id: 'DIRECT',
  status: 'BLANK',
  startTime: null,
  cart: [],
  discount: { type: 'NONE', value: 0 },
  isNC: false,
  orderConfig: { order_type: 'TAKEAWAY', table_number: '' }
};

const useStore = create((set, get) => ({
  auth: { token: null, user_id: null, role: null, branch_id: null },
  
  tables: initialTables,
  activeTableId: 'DIRECT',
  heldOrders: [],

  setAuth: (authData) => set({ auth: authData }),
  clearAuth: () => set({ auth: { token: null, user_id: null, role: null, branch_id: null } }),

  addTable: (id) => set((state) => {
    if (state.tables[id]) return state;
    return {
      tables: {
        ...state.tables,
        [id]: {
          id,
          status: 'BLANK',
          startTime: null,
          cart: [],
          discount: { type: 'NONE', value: 0 },
          isNC: false,
          orderConfig: { order_type: 'DINE_IN', table_number: id }
        }
      }
    };
  }),

  holdOrder: (tableId) => set((state) => {
    const tableData = state.tables[tableId];
    if (!tableData || tableData.cart.length === 0) return state;
    const held = {
      id: Date.now().toString(),
      timestamp: new Date(),
      originalTable: tableId,
      cart: [...tableData.cart],
      discount: { ...tableData.discount },
      isNC: tableData.isNC,
      orderConfig: { ...tableData.orderConfig }
    };
    return {
      heldOrders: [held, ...state.heldOrders],
      tables: {
        ...state.tables,
        [tableId]: {
          ...state.tables[tableId],
          status: 'BLANK',
          startTime: null,
          cart: [],
          discount: { type: 'NONE', value: 0 },
          isNC: false
        }
      }
    };
  }),

  resumeOrder: (heldOrderId, targetTableId) => set((state) => {
    const orderIndex = state.heldOrders.findIndex(o => o.id === heldOrderId);
    if (orderIndex === -1) return state;
    const held = state.heldOrders[orderIndex];
    
    const newHeldOrders = [...state.heldOrders];
    newHeldOrders.splice(orderIndex, 1);
    
    return {
      heldOrders: newHeldOrders,
      tables: {
        ...state.tables,
        [targetTableId]: {
          ...state.tables[targetTableId],
          status: 'RUNNING_KOT',
          startTime: held.timestamp,
          cart: [...held.cart],
          discount: { ...held.discount },
          isNC: held.isNC,
          orderConfig: { ...held.orderConfig, table_number: targetTableId !== 'DIRECT' ? targetTableId : '' }
        }
      },
      activeTableId: targetTableId
    };
  }),

  setActiveTable: (id) => set({ activeTableId: id }),

  setOrderConfig: (tableId, config) => set((state) => ({
    tables: {
      ...state.tables,
      [tableId]: { ...state.tables[tableId], orderConfig: { ...state.tables[tableId].orderConfig, ...config } }
    }
  })),

  setDiscount: (tableId, type, value) => set((state) => ({
    tables: {
      ...state.tables,
      [tableId]: { ...state.tables[tableId], discount: { type, value } }
    }
  })),

  toggleNC: (tableId) => set((state) => ({
    tables: {
      ...state.tables,
      [tableId]: { ...state.tables[tableId], isNC: !state.tables[tableId].isNC }
    }
  })),

  addToTable: (tableId, item) => set((state) => {
    const table = state.tables[tableId];
    const existingIndex = table.cart.findIndex(i => i.variant_id === item.variant_id && i.special_notes === item.special_notes && !i.printed_in_kot);
    
    let newCart = [...table.cart];
    if (existingIndex >= 0) {
      newCart[existingIndex] = { ...newCart[existingIndex], qty: newCart[existingIndex].qty + 1 };
    } else {
      newCart = [...table.cart, { ...item, qty: 1, printed_in_kot: false }];
    }
    
    return {
      tables: {
        ...state.tables,
        [tableId]: {
          ...table,
          status: table.status === 'BLANK' || table.status === 'PRINTED_BILL' ? 'RUNNING_KOT' : table.status,
          startTime: table.status === 'BLANK' ? Date.now() : table.startTime,
          cart: newCart
        }
      }
    };
  }),

  removeFromTable: (tableId, variant_id, special_notes, printed_in_kot) => set((state) => {
    const table = state.tables[tableId];
    const newCart = table.cart.filter(i => !(i.variant_id === variant_id && i.special_notes === special_notes && i.printed_in_kot === printed_in_kot));
    
    return {
      tables: {
        ...state.tables,
        [tableId]: {
          ...table,
          status: newCart.length === 0 ? 'BLANK' : table.status,
          startTime: newCart.length === 0 ? null : table.startTime,
          cart: newCart,
          discount: newCart.length === 0 ? { type: 'NONE', value: 0 } : table.discount,
          isNC: newCart.length === 0 ? false : table.isNC
        }
      }
    };
  }),

  updateTableQty: (tableId, variant_id, special_notes, printed_in_kot, delta) => set((state) => {
    const table = state.tables[tableId];
    const newCart = table.cart.map(i => {
      if (i.variant_id === variant_id && i.special_notes === special_notes && i.printed_in_kot === printed_in_kot) {
        return { ...i, qty: Math.max(1, i.qty + delta) };
      }
      return i;
    });
    
    return {
      tables: {
        ...state.tables,
        [tableId]: { ...table, cart: newCart }
      }
    };
  }),

  markTableKOTPrinted: (tableId) => set((state) => {
    const table = state.tables[tableId];
    const newCart = table.cart.map(i => ({ ...i, printed_in_kot: true }));
    return {
      tables: {
        ...state.tables,
        [tableId]: { ...table, status: 'RUNNING_KOT', cart: newCart }
      }
    };
  }),

  markTableBillPrinted: (tableId) => set((state) => {
    const table = state.tables[tableId];
    return {
      tables: {
        ...state.tables,
        [tableId]: { ...table, status: 'PRINTED_BILL' }
      }
    };
  }),

  clearTable: (tableId) => set((state) => ({
    tables: {
      ...state.tables,
      [tableId]: {
        ...state.tables[tableId],
        status: 'BLANK',
        startTime: null,
        cart: [],
        discount: { type: 'NONE', value: 0 },
        isNC: false
      }
    }
  }))
}));

export default useStore;
