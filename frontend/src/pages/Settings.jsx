import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus } from 'lucide-react';

export default function Settings() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    category: '',
    base_price: '',
    variants: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/menu/products');
      setProducts(res.data);
      const uniqueCats = [...new Set(res.data.map(p => p.category))];
      setCategories(uniqueCats);
      if (uniqueCats.length > 0 && !activeCategory) setActiveCategory(uniqueCats[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      category: product.category,
      is_active: product.is_active,
      variants: product.variants.map(v => ({ id: v.id, base_price: v.base_price, variant_name: v.variant_name }))
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/api/menu/products/${editingProduct.id}`, {
        category: editFormData.category,
        name: editFormData.name,
        is_active: editFormData.is_active
      });

      for (const v of editFormData.variants) {
        const originalVar = editingProduct.variants.find(ov => ov.id === v.id);
        if (parseFloat(originalVar.base_price) !== parseFloat(v.base_price)) {
          await api.put(`/api/menu/variants/${v.id}`, {
            base_price: parseFloat(v.base_price)
          });
        }
      }

      setEditingProduct(null);
      fetchProducts();
      alert('Product updated successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update product');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const variantsList = addFormData.variants.split(',').map(v => v.trim()).filter(v => v);
      let variantPayload = [];
      if (variantsList.length > 0) {
        variantPayload = variantsList.map(v => ({ variant_name: v, base_price: parseFloat(addFormData.base_price) }));
      } else {
        variantPayload = [{ variant_name: "Regular", base_price: parseFloat(addFormData.base_price) }];
      }

      await api.post('/api/menu/products', {
        name: addFormData.name,
        category: addFormData.category,
        is_active: true,
        variants: variantPayload
      });

      setShowAddModal(false);
      setAddFormData({ name: '', category: '', base_price: '', variants: '' });
      fetchProducts();
      alert('Product created successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create product');
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-y-auto">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Catalog Manager</h1>
          <p className="text-slate-500 mt-1 font-semibold">Full CRUD capabilities for your restaurant menu.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-sm">
          <Plus size={18} /> Add New Product
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Category Sidebar */}
        <div className="w-1/4 bg-white border-r border-slate-200 h-full overflow-y-auto shadow-sm z-10 shrink-0">
          <div className="p-4 bg-slate-50 font-bold text-slate-500 border-b border-slate-200 text-sm uppercase tracking-wider">
            Categories
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-6 py-4 font-bold border-b border-slate-100 transition-colors ${
                activeCategory === cat ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Product Data Table */}
        <div className="flex-1 bg-slate-50 p-8 h-full overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white font-bold flex justify-between items-center">
              <span>{activeCategory} Products</span>
            </div>
            
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">PRODUCT NAME</th>
                  <th className="px-6 py-4 font-bold">VARIANTS & SIZES</th>
                  <th className="px-6 py-4 font-bold text-right">STATUS</th>
                  <th className="px-6 py-4 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.filter(p => p.category === activeCategory).map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 text-base">{product.name}</td>
                    <td className="px-6 py-4">
                      {product.variants.map(v => (
                        <div key={v.id} className="mb-1 text-slate-600 font-semibold">
                          {v.variant_name} - <span className="text-green-600 font-bold">₹{parseFloat(v.base_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {product.is_active ? (
                        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">IN STOCK</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-xs">OUT OF STOCK</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="text-blue-600 font-bold hover:text-blue-800 border border-blue-200 hover:border-blue-300 bg-blue-50 px-4 py-1.5 rounded transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {products.filter(p => p.category === activeCategory).length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 font-bold">No products found in this category.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white font-bold text-sm">CLOSE</button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-600 mb-1">Product Name</label>
                <input 
                  type="text" 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-600 mb-1">Category</label>
                <input 
                  type="text" 
                  value={editFormData.category} 
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6 flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({...editFormData, is_active: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <span className="font-bold text-slate-700">Currently in Stock</span>
              </div>
              
              <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Pricing & Variants</h3>
              {editFormData.variants.map((v, index) => (
                <div key={v.id} className="flex gap-4 items-center mb-3">
                  <div className="w-1/2 font-semibold text-slate-600">{v.variant_name}</div>
                  <div className="w-1/2 relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400">₹</span>
                    <input 
                      type="number" 
                      value={v.base_price}
                      onChange={(e) => {
                        const newVariants = [...editFormData.variants];
                        newVariants[index].base_price = e.target.value;
                        setEditFormData({...editFormData, variants: newVariants});
                      }}
                      className="w-full border border-slate-300 rounded p-2 pl-8 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setEditingProduct(null)} className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} className="px-5 py-2 font-bold bg-green-600 hover:bg-green-700 text-white rounded shadow-sm transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2"><Plus size={20} /> Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="text-blue-200 hover:text-white font-bold text-sm">CLOSE</button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex flex-col max-h-[70vh]">
              <div className="p-6 overflow-y-auto">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-1">Product Name</label>
                  <input 
                    type="text" 
                    required
                    value={addFormData.name} 
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Mango Lassi"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-1">Category</label>
                  <input 
                    type="text" 
                    required
                    list="categories"
                    value={addFormData.category} 
                    onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Lassis or Type a new one"
                  />
                  <datalist id="categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-1">Base Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400">₹</span>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      value={addFormData.base_price} 
                      onChange={(e) => setAddFormData({ ...addFormData, base_price: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-1">Variants (Optional)</label>
                  <p className="text-xs text-slate-500 mb-2">Comma separated list of sizes or types (e.g., "Regular, Medium, Large"). Leave blank to use "Regular" automatically.</p>
                  <input 
                    type="text" 
                    value={addFormData.variants} 
                    onChange={(e) => setAddFormData({ ...addFormData, variants: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Regular, Medium, Large"
                  />
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
