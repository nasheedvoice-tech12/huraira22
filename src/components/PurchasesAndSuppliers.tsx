import React, { useState } from 'react';
import { useVelcora } from '../context/VelcoraContext';
import {
  Truck, Plus, Search, CheckCircle, PackageCheck,
  Building2, Phone, Mail, DollarSign, X, ArrowRight, Edit2, Trash2, AlertTriangle
} from 'lucide-react';
import { Supplier, PurchaseOrder } from '../types';
import { VelcoraPricingEngine } from '../utils/pricingEngine';

export const PurchasesAndSuppliers: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    purchaseOrders,
    addPurchaseOrder,
    receivePurchaseOrder,
    products,
    currency,
    activeBusiness,
    activeUser} = useVelcora();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [search, setSearch] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const isAuthorized = activeUser?.roleId === 'role-owner' || activeUser?.roleId === 'role-manager' || activeUser?.roleId === 'role-admin';

  // New Supplier Form
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');

  // New PO Form
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poProductId, setPoProductId] = useState(products[0]?.id || '');
  const [poQty, setPoQty] = useState('50');
  const [poCost, setPoCost] = useState('10');

  const handleOpenAddSupplier = () => {
    setEditingSupplierId(null);
    setSName('');
    setSContact('');
    setSPhone('');
    setSEmail('');
    setShowAddSupplierModal(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setSName(sup.name);
    setSContact(sup.contactPerson || '');
    setSPhone(sup.phone || '');
    setSEmail(sup.email || '');
    setShowAddSupplierModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, {
        name: sName.trim(),
        contactPerson: sContact.trim() || 'Vendor Contact',
        phone: sPhone.trim() || '+1 (555) 000-0000',
        email: sEmail.trim() || 'vendor@example.com',
      });
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        businessId: activeBusiness.id,
        name: sName.trim(),
        contactPerson: sContact.trim() || 'Vendor Contact',
        phone: sPhone.trim() || '+1 (555) 000-0000',
        email: sEmail.trim() || 'vendor@example.com',
        address: 'Industrial District Blvd',
        balanceOwed: 0,
        productsSuppliedCount: 5,
      };
      addSupplier(newSup);
    }
    setShowAddSupplierModal(false);
    setSName('');
    setSContact('');
    setSPhone('');
    setSEmail('');
    setEditingSupplierId(null);
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === poSupplierId);
    const prod = products.find(p => p.id === poProductId);
    if (!sup || !prod) return;

    const qty = parseInt(poQty) || 1;
    const cost = parseFloat(poCost) || prod.costPrice;
    const total = qty * cost;

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      businessId: activeBusiness.id,
      supplierId: sup.id,
      supplierName: sup.name,
      status: 'ordered',
      items: [
        {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantityOrdered: qty,
          quantityReceived: 0,
          unitCost: cost,
          totalCost: total,
        },
      ],
      totalAmount: total,
      amountPaid: 0,
      orderDate: new Date().toISOString(),
    };

    addPurchaseOrder(newPo);
    setShowNewPoModal(false);
  };

  return (
    <div id="velcora-purchasing-view" className="space-y-4">
      {permissionError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{permissionError}</span>
          </div>
          <button onClick={() => setPermissionError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111C30] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2563EB] p-0.5 shadow-2xs">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#111C30] flex items-center justify-center text-[#2563EB] dark:text-[#06B6D4]">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]">Purchasing & Vendor Relations</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
              {purchaseOrders.length} purchase orders • {suppliers.length} active suppliers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'orders'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'suppliers'
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Suppliers Directory
            </button>
          </div>

          {activeTab === 'orders' ? (
            <button
              onClick={() => setShowNewPoModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Create PO</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddSupplier}
              className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'orders' ? (
        /* PURCHASE ORDERS TABLE */
        <div className="bg-white dark:bg-[#111C30] rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-[#1F2E4D] text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Items / Details</th>
                  <th className="py-3.5 px-4">Total Cost</th>
                  <th className="py-3.5 px-4">Delivery Status</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F2E4D] font-medium text-slate-700 dark:text-[#94A3B8]">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-[#152644]/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] dark:text-[#06B6D4]">{po.poNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{po.supplierName}</td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-[#94A3B8]">
                      {po.items.map(i => `${i.quantityOrdered}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                      {VelcoraPricingEngine.formatCurrency(po.totalAmount, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                          po.status === 'received'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        }`}
                      >
                        {po.status === 'received' ? '✓ Goods Received' : '⏳ Ordered'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                          po.amountPaid >= po.totalAmount
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                        }`}
                      >
                        {po.amountPaid >= po.totalAmount ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {po.status !== 'received' && (
                        <button
                          onClick={() => receivePurchaseOrder(po.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-2xs transition active:scale-98"
                        >
                          Receive & Stock In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SUPPLIERS DIRECTORY */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div key={sup.id} className="bg-white dark:bg-[#111C30] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-[#1F2E4D] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">{sup.name}</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditSupplier(sup)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {deleteConfirmId === sup.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded-xl border border-rose-200 dark:border-rose-900/40">
                      <button
                        onClick={() => {
                          if (!isAuthorized) {
                            setPermissionError("You do not have permission to delete supplier records. Only Owners or Managers can delete records.");
                            setTimeout(() => setPermissionError(null), 5000);
                            setDeleteConfirmId(null);
                            return;
                          }
                          deleteSupplier(sup.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(sup.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-[#94A3B8] space-y-1.5 font-medium">
                <div>Contact: <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{sup.contactPerson}</span></div>
                <div>Phone: <span className="text-slate-600 dark:text-[#94A3B8]">{sup.phone}</span></div>
                <div>Email: <span className="text-slate-600 dark:text-[#94A3B8]">{sup.email}</span></div>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-[#1F2E4D] flex justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Balance Owed:</span>
                <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">{VelcoraPricingEngine.formatCurrency(sup.balanceOwed || 0, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW PO MODAL */}
      {showNewPoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePo}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">Create Purchase Order</h3>
              <button
                type="button"
                onClick={() => setShowNewPoModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Select Supplier *</label>
                <select
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Select Product *</label>
                <select
                  value={poProductId}
                  onChange={e => setPoProductId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-800 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#111C30] text-slate-900 dark:text-[#F8FAFC]">{p.name} (${p.costPrice} cost)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={poQty}
                    onChange={e => setPoQty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Unit Cost ({currency || '$'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={poCost}
                    onChange={e => setPoCost(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] font-bold text-[#2563EB] dark:text-[#06B6D4] focus:border-[#2563EB] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowNewPoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-2xs transition active:scale-98"
              >
                Issue PO
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white dark:bg-[#111C30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-[#1F2E4D] shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-slate-800 dark:text-[#F8FAFC]"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1F2E4D]">
              <h3 className="font-bold text-base text-slate-900 dark:text-[#F8FAFC]">
                {editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2E4A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  placeholder="e.g. Acme Fabric Mills"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-bold focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={sContact}
                  onChange={e => setSContact(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Phone</label>
                <input
                  type="text"
                  value={sPhone}
                  onChange={e => setSPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-[#94A3B8] mb-1">Email</label>
                <input
                  type="email"
                  value={sEmail}
                  onChange={e => setSEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] font-medium focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1F2E4D]">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E2E4A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-2xs transition active:scale-98"
              >
                {editingSupplierId ? 'Save Changes' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
