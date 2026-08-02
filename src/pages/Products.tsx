import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { useSettingsStore } from "@/src/store/settingsStore";

export function Products() {
  const { products, addProduct } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const user = useAuthStore(state => state.user);
  const workspaceRoles = useAuthStore(state => state.workspaceRoles);
  const settings = useSettingsStore(state => state.settings);
  const workspaceProducts = products.filter(p => p.workspaceId === workspace?.id);
  
  const currency = settings?.business?.currency || 'USD';
  const activeRole = workspace ? workspaceRoles[workspace.id] || user?.role : user?.role;
  const canManage = !!activeRole && ["super_admin", "workspace_admin", "sales", "operations"].includes(activeRole);

  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    type: "otc" as "otc" | "mrc",
    price: 0,
    currency: "USD"
  });

  const handleAdd = () => {
    if (!workspace) return;
    if (!newProduct.name || newProduct.price <= 0) {
      alert("Valid name and price required");
      return;
    }
    addProduct({ ...newProduct, currency, workspaceId: workspace.id });
    setShowAdd(false);
    setNewProduct({ name: "", type: "otc", price: 0, currency: "USD" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Products & Pricing</h2>
          <p className="text-sm text-slate-500">Manage your product catalogue (OTC and MRC).</p>
        </div>
        {canManage ? <Button onClick={() => setShowAdd(true)}>Add Product</Button> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Type</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspaceProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.type === 'otc' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.type === 'otc' ? 'One-time' : 'Recurring'}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-600">{currency} {p.price.toLocaleString()}</td>
                  </tr>
                ))}
                {workspaceProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showAdd && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="product-name" className="text-sm font-medium">Product Name</label>
                <input 
                  id="product-name"
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="product-type" className="text-sm font-medium">Type</label>
                <select 
                  id="product-type"
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newProduct.type}
                  onChange={e => setNewProduct({...newProduct, type: e.target.value as 'otc'|'mrc'})}
                >
                  <option value="otc">One-Time Charge (OTC)</option>
                  <option value="mrc">Monthly Recurring (MRC)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="product-price" className="text-sm font-medium">Price ({currency})</label>
                <input 
                  id="product-price"
                  type="number"
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newProduct.price}
                  onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Save Product</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
