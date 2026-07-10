/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Product, 
  ProductImport, 
  Order, 
  OrderItem, 
  Bundle, 
  BundleItem, 
  Lead, 
  Settings,
  LeadStage,
  TaskType,
  TaskStatus,
  TaskPriority
} from "../types";
import { localDb } from "../db/localDb";
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Trash2, 
  Send, 
  Check, 
  CheckCircle2, 
  User, 
  Phone, 
  Clock, 
  Download, 
  AlertTriangle,
  Bookmark,
  Share2,
  Calendar,
  X,
  PlusCircle,
  Eye,
  Settings as SettingsIcon,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Smartphone,
  Sparkles
} from "lucide-react";

interface ProductsManagerProps {
  settings: Settings;
}

export default function ProductsManager({ settings }: ProductsManagerProps) {
  // Main Segmented Tab: 'catalog' | 'orders'
  const [activeSegment, setActiveSegment] = useState<"catalog" | "orders">("catalog");

  // Inner Subtabs
  const [catalogSubTab, setCatalogSubTab] = useState<"products" | "bundles" | "imports">("products");

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [imports, setImports] = useState<ProductImport[]>([]);

  // Search & Filters
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategoryFilter, setProdCategoryFilter] = useState("All");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  // Selection states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Forms Visibility
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBundle, setShowAddBundle] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showMsgTemplateModal, setShowMsgTemplateModal] = useState(false);

  // WhatsApp template scenario
  const [activeMsgScenario, setActiveMsgScenario] = useState<"confirmation" | "payment" | "amway" | "delivery" | "reorder" | "feedback">("confirmation");
  const [editableWhatsAppText, setEditableWhatsAppText] = useState("");

  // Product Form State
  const [pName, setPName] = useState("");
  const [pCode, setPCode] = useState("");
  const [pCategory, setPCategory] = useState("Wellness");
  const [pBrand, setPBrand] = useState("Nutrilite");
  const [pDesc, setPDesc] = useState("");
  const [pRetail, setPRetail] = useState(0);
  const [pAbo, setPAbo] = useState(0);
  const [pPv, setPPv] = useState(0);
  const [pBv, setPBv] = useState(0);
  const [pUrl, setPUrl] = useState("");
  const [pNotes, setPNotes] = useState("");

  // Bundle Form State
  const [bName, setBName] = useState("");
  const [bCategory, setBCategory] = useState("Wellness");
  const [bDesc, setBDesc] = useState("");
  const [bPrice, setBPrice] = useState(0);
  const [bNotes, setBNotes] = useState("");
  const [selectedBundleProducts, setSelectedBundleProducts] = useState<{ id: string; quantity: number }[]>([]);

  // Import Text Area state
  const [csvPasteText, setCsvPasteText] = useState("");

  // Order Creation Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [ordLeadId, setOrdLeadId] = useState("");
  const [ordCustName, setOrdCustName] = useState("");
  const [ordCustPhone, setOrdCustPhone] = useState("");
  const [ordCustEmail, setOrdCustEmail] = useState("");
  const [orderCart, setOrderCart] = useState<{ id: string; type: "product" | "bundle"; quantity: number }[]>([]);
  const [ordDelivery, setOrdDelivery] = useState(10);
  const [ordDiscount, setOrdDiscount] = useState(0);
  const [ordPaymentMethod, setOrdPaymentMethod] = useState<"Cash" | "Bank Transfer" | "DuitNow" | "Stripe Card Payment" | "Other">("Bank Transfer");
  const [ordNotes, setOrdNotes] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setProducts(localDb.getProducts());
    setBundles(localDb.getBundles());
    setOrders(localDb.getOrders());
    setLeads(localDb.getLeads());
    setImports(localDb.getProductImports());
  };

  // ------------------------------------------
  // PRODUCTS CATALOG LOGIC
  // ------------------------------------------
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pCode) {
      alert("Product Name and Code are required.");
      return;
    }
    const saved = localDb.saveProduct({
      id: selectedProduct?.id || "",
      product_name: pName,
      product_code: pCode,
      category: pCategory,
      brand: pBrand,
      description: pDesc,
      image_url: "",
      retail_price: Number(pRetail),
      abo_price: Number(pAbo),
      pv: Number(pPv),
      bv: Number(pBv),
      currency: "RM",
      availability_status: "Available",
      official_product_url: pUrl,
      notes: pNotes,
      imported_at: selectedProduct?.imported_at || null,
      created_at: selectedProduct?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setShowAddProduct(false);
    setSelectedProduct(null);
    clearProductForm();
    loadAllData();
    alert(`Product ${saved.product_name} saved successfully.`);
  };

  const handleEditProductClick = (prod: Product) => {
    setSelectedProduct(prod);
    setPName(prod.product_name);
    setPCode(prod.product_code);
    setPCategory(prod.category);
    setPBrand(prod.brand);
    setPDesc(prod.description);
    setPRetail(prod.retail_price);
    setPAbo(prod.abo_price);
    setPPv(prod.pv);
    setPBv(prod.bv);
    setPUrl(prod.official_product_url);
    setPNotes(prod.notes);
    setShowAddProduct(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product? All active order items referencing this might lose detail integrity.")) {
      localDb.deleteProduct(id);
      loadAllData();
    }
  };

  const clearProductForm = () => {
    setPName("");
    setPCode("");
    setPCategory("Wellness");
    setPBrand("Nutrilite");
    setPDesc("");
    setPRetail(0);
    setPAbo(0);
    setPPv(0);
    setPBv(0);
    setPUrl("");
    setPNotes("");
  };

  // ------------------------------------------
  // BUNDLES LOGIC
  // ------------------------------------------
  const handleAddProductToBundle = (prodId: string) => {
    const exists = selectedBundleProducts.find(p => p.id === prodId);
    if (exists) {
      setSelectedBundleProducts(selectedBundleProducts.map(p => p.id === prodId ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedBundleProducts([...selectedBundleProducts, { id: prodId, quantity: 1 }]);
    }
  };

  const handleSaveBundle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName) {
      alert("Bundle Name is required.");
      return;
    }
    const savedBundle = localDb.saveBundle(
      {
        id: "",
        bundle_name: bName,
        category: bCategory,
        description: bDesc,
        total_price: Number(bPrice),
        notes: bNotes,
        status: "Active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      selectedBundleProducts.map(bp => ({
        id: "",
        bundle_id: "",
        product_id: bp.id,
        quantity: bp.quantity,
        created_at: new Date().toISOString()
      }))
    );
    setShowAddBundle(false);
    setBName("");
    setBDesc("");
    setBPrice(0);
    setBNotes("");
    setSelectedBundleProducts([]);
    loadAllData();
    alert(`Bundle "${savedBundle.bundle_name}" created successfully.`);
  };

  const handleDeleteBundle = (id: string) => {
    if (window.confirm("Are you sure you want to delete this bundle?")) {
      localDb.deleteBundle(id);
      loadAllData();
    }
  };

  // ------------------------------------------
  // CSV IMPORT PARSING LOGIC
  // ------------------------------------------
  const handleImportCsv = () => {
    if (!csvPasteText.trim()) {
      alert("Please paste valid CSV contents.");
      return;
    }
    const parsed = parseProductCsv(csvPasteText);
    const impRecord: ProductImport = {
      id: `imp_${Date.now()}`,
      file_name: "Manual Text Paste.csv",
      import_status: parsed.failedRows.length === 0 ? "Completed" : "Failed",
      total_rows: parsed.successRows.length + parsed.failedRows.length,
      successful_rows: parsed.successRows.length,
      failed_rows: parsed.failedRows.length,
      error_report: parsed.errorReport,
      imported_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    // Save successful rows to products list
    parsed.successRows.forEach(prod => {
      localDb.saveProduct(prod);
    });

    localDb.saveProductImport(impRecord);
    loadAllData();
    setCsvPasteText("");
    setCatalogSubTab("products");
    alert(`CSV parsing session complete. Imported: ${parsed.successRows.length} products successfully. Warnings/Failures: ${parsed.failedRows.length}`);
  };

  const loadSampleCsvTemplate = () => {
    const template = `product_name,product_code,category,brand,description,retail_price,abo_price,pv,bv,official_product_url,notes
G&H Protect+ Deodorant Roll-on,BEAU-5001,Beauty,G&H,Provides up to 48 hours of odor and wetness protection.,45.00,36.00,9.00,28.00,https://www.amway.my/p/5001,Customer favorite in active sports.
Nutrilite All Plant Protein Powder,Wellness,Nutrilite,High quality pure plant protein with 9 essential amino acids.,165.00,132.00,30.00,98.00,https://www.amway.my/p/1003,Highly recommended for weight control.
Glister Multi-Action Toothpaste,HOME-4001,Home Care,Glister,Removes plaque and safely polishes teeth enamel.,35.00,28.00,6.00,18.00,https://www.amway.my/p/4001,Extremely popular household essential.`;
    setCsvPasteText(template);
  };

  const parseProductCsv = (csvText: string) => {
    const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { successRows: [], failedRows: [], errorReport: "CSV must contain at least a header row and one data row." };

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const expectedHeaders = ["product_name", "product_code", "category", "brand", "description", "retail_price", "abo_price", "pv", "bv", "official_product_url", "notes"];

    const successRows: Product[] = [];
    const failedRows: any[] = [];
    let errorMsg = "";

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];
      const cells = rawLine.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));

      if (cells.length < expectedHeaders.length) {
        failedRows.push({ row: i + 1, data: rawLine, error: "Insufficient columns" });
        errorMsg += `Line ${i + 1}: Found only ${cells.length} columns.\n`;
        continue;
      }

      const item: any = {};
      headers.forEach((h, idx) => {
        item[h] = cells[idx] || "";
      });

      const name = item.product_name;
      const code = item.product_code || `GEN-${1000 + i}`;
      const retail = parseFloat(item.retail_price);
      const abo = parseFloat(item.abo_price);
      const pv = parseFloat(item.pv);
      const bv = parseFloat(item.bv);

      if (!name) {
        failedRows.push({ row: i + 1, data: rawLine, error: "Missing product name" });
        errorMsg += `Line ${i + 1}: Name is mandatory.\n`;
        continue;
      }

      successRows.push({
        id: `prod_${Date.now()}_${i}`,
        product_name: name,
        product_code: code,
        category: item.category || "Wellness",
        brand: item.brand || "Amway",
        description: item.description || "",
        image_url: "",
        retail_price: isNaN(retail) ? 0 : retail,
        abo_price: isNaN(abo) ? 0 : abo,
        pv: isNaN(pv) ? 0 : pv,
        bv: isNaN(bv) ? 0 : bv,
        currency: "RM",
        availability_status: "Available",
        official_product_url: item.official_product_url || "",
        notes: item.notes || "",
        imported_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return {
      successRows,
      failedRows,
      errorReport: errorMsg || "All rows parsed successfully."
    };
  };

  // ------------------------------------------
  // ORDERS MANAGEMENT LOGIC
  // ------------------------------------------
  const handleSelectLeadForOrder = (leadId: string) => {
    setOrdLeadId(leadId);
    const selected = leads.find(l => l.id === leadId);
    if (selected) {
      setOrdCustName(selected.name);
      setOrdCustPhone(selected.phone);
      setOrdCustEmail(selected.email || "");
    }
  };

  const handleAddProductToOrderCart = (id: string, type: "product" | "bundle") => {
    const exists = orderCart.find(c => c.id === id && c.type === type);
    if (exists) {
      setOrderCart(orderCart.map(c => c.id === id && c.type === type ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setOrderCart([...orderCart, { id, type, quantity: 1 }]);
    }
  };

  const handleUpdateCartQuantity = (id: string, type: "product" | "bundle", change: number) => {
    setOrderCart(orderCart.map(c => {
      if (c.id === id && c.type === type) {
        const nextQty = c.quantity + change;
        return nextQty > 0 ? { ...c, quantity: nextQty } : c;
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const calculateCartSubtotal = () => {
    let sub = 0;
    orderCart.forEach(c => {
      if (c.type === "product") {
        const p = products.find(prod => prod.id === c.id);
        if (p) sub += p.retail_price * c.quantity;
      } else {
        const b = bundles.find(bund => bund.id === c.id);
        if (b) sub += b.total_price * c.quantity;
      }
    });
    return sub;
  };

  const calculateCartABOSubtotal = () => {
    let sub = 0;
    orderCart.forEach(c => {
      if (c.type === "product") {
        const p = products.find(prod => prod.id === c.id);
        if (p) sub += p.abo_price * c.quantity;
      } else {
        const b = bundles.find(bund => bund.id === c.id);
        if (b) sub += (b.total_price * 0.8) * c.quantity; // Default bundle ABO is roughly 80% retail
      }
    });
    return sub;
  };

  const calculateCartTotals = () => {
    const subtotal = calculateCartSubtotal();
    const total = subtotal + Number(ordDelivery) - Number(ordDiscount);
    let pv = 0;
    let bv = 0;
    orderCart.forEach(c => {
      if (c.type === "product") {
        const p = products.find(prod => prod.id === c.id);
        if (p) {
          pv += p.pv * c.quantity;
          bv += p.bv * c.quantity;
        }
      }
    });
    return { subtotal, total, pv, bv };
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordCustName || !ordCustPhone) {
      alert("Customer Name and Phone number are required.");
      return;
    }
    if (orderCart.length === 0) {
      alert("Order cart is empty.");
      return;
    }

    const { subtotal, total, pv, bv } = calculateCartTotals();
    const orderId = `ord_${Date.now()}`;
    const orderItems: OrderItem[] = orderCart.map((c, idx) => {
      if (c.type === "product") {
        const p = products.find(prod => prod.id === c.id)!;
        return {
          id: `item_${orderId}_${idx}`,
          order_id: orderId,
          product_id: p.id,
          product_name: p.product_name,
          product_code: p.product_code,
          quantity: c.quantity,
          unit_price: p.retail_price,
          total_price: p.retail_price * c.quantity,
          pv: p.pv * c.quantity,
          bv: p.bv * c.quantity,
          created_at: new Date().toISOString()
        };
      } else {
        const b = bundles.find(bund => bund.id === c.id)!;
        return {
          id: `item_${orderId}_${idx}`,
          order_id: orderId,
          product_id: b.id,
          product_name: b.bundle_name,
          product_code: `BUNDLE-${b.id}`,
          quantity: c.quantity,
          unit_price: b.total_price,
          total_price: b.total_price * c.quantity,
          pv: 40 * c.quantity, // Default bundle PV estimate
          bv: 120 * c.quantity, // Default bundle BV estimate
          created_at: new Date().toISOString()
        };
      }
    });

    const newOrder: Order = {
      id: orderId,
      lead_id: ordLeadId || null,
      customer_name: ordCustName,
      customer_phone: ordCustPhone,
      customer_email: ordCustEmail,
      order_date: new Date().toISOString().split("T")[0],
      order_status: "Confirmed",
      payment_status: ordPaymentMethod === "Stripe Card Payment" ? "Pending" : "Paid",
      payment_method: ordPaymentMethod,
      subtotal,
      discount: Number(ordDiscount),
      delivery_fee: Number(ordDelivery),
      total_amount: total,
      currency: "RM",
      stripe_payment_link: settings.stripe_payment_link || "https://buy.stripe.com/test_6oE5m1gXg7",
      notes: ordNotes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.saveOrder(newOrder, orderItems);

    // Automation: If this order has a Lead connected, update lead's stage to "Ordered Product"
    if (ordLeadId) {
      const lead = leads.find(l => l.id === ordLeadId);
      if (lead) {
        localDb.saveLead({
          ...lead,
          stage: LeadStage.OrderedProduct,
          updated_at: new Date().toISOString()
        });
      }
    }

    // AUTOMATION: Reorder Reminder task creation (due in 30 days)
    const futureReorderDate = new Date();
    futureReorderDate.setDate(futureReorderDate.getDate() + 30);
    const futureStr = futureReorderDate.toISOString().split("T")[0];

    localDb.saveTask({
      id: `t_${orderId}_reorder`,
      lead_id: ordLeadId || null,
      task_type: TaskType.ReorderFollowUp,
      title: `Check in on ${ordCustName}'s supply`,
      description: `Reorder reminder follow-up. Customer purchased product worth RM ${total.toFixed(2)}. Suggest restocking or upgrade to partner.`,
      due_date: futureStr,
      status: TaskStatus.Pending,
      priority: TaskPriority.Medium,
      created_at: new Date().toISOString(),
      completed_at: null
    });

    // Close and reset
    setShowCreateOrder(false);
    setWizardStep(1);
    setOrdLeadId("");
    setOrdCustName("");
    setOrdCustPhone("");
    setOrdCustEmail("");
    setOrderCart([]);
    setOrdNotes("");
    loadAllData();
    alert(`Order ${orderId} created successfully. Automated 30-day reorder reminder task scheduled.`);
  };

  const handleUpdateOrderStatus = (order: Order, newStatus: Order["order_status"]) => {
    let paymentStatus = order.payment_status;
    if (newStatus === "Completed" || newStatus === "Delivered") {
      paymentStatus = "Paid";
    }
    const updated: Order = {
      ...order,
      order_status: newStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };
    localDb.saveOrder(updated, localDb.getOrderItems(order.id));
    loadAllData();
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated);
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this order record?")) {
      localDb.deleteOrder(id);
      setSelectedOrder(null);
      loadAllData();
    }
  };

  const handleToggleDetails = (order: Order) => {
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(null);
    } else {
      setSelectedOrder(order);
    }
  };

  // ------------------------------------------
  // WHATSAPP SCENARIO TEMPLATE LOGIC
  // ------------------------------------------
  const handleOpenWhatsAppTemplates = (order: Order) => {
    setSelectedOrder(order);
    generateWhatsAppTemplateText("confirmation", order);
    setShowMsgTemplateModal(true);
  };

  const generateWhatsAppTemplateText = (scenario: typeof activeMsgScenario, order: Order) => {
    setActiveMsgScenario(scenario);
    const items = localDb.getOrderItems(order.id);
    const itemsText = items.map(item => `- ${item.quantity}x ${item.product_name} (${item.product_code})`).join("\n");
    const formattedTotal = `RM ${order.total_amount.toFixed(2)}`;
    
    let text = "";
    switch (scenario) {
      case "confirmation":
        text = `Hi ${order.customer_name},\n\nThank you for choosing ${settings.brand_name || "Bright Future"}! 🌟 Your order #${order.id} has been logged:\n\n${itemsText}\n\nTotal: ${formattedTotal}\nPayment Method: ${order.payment_method}\n\nWe will update you as soon as this is dispatched. Thank you for your support!`;
        break;
      case "payment":
        text = `Hi ${order.customer_name},\n\nFriendly follow-up regarding order #${order.id} for:\n${itemsText}\n\nTotal Outstanding: ${formattedTotal}.\nYou can complete your payment via secure card checkouts here: ${order.stripe_payment_link}\n\nOnce completed, reply with the receipt screenshot. Thanks!`;
        break;
      case "amway":
        text = `Hi ${order.customer_name},\n\nGreat news! Your order #${order.id} has been formally registered with Amway Malaysia distribution center. Processing is underway! 📦✨`;
        break;
      case "delivery":
        text = `Hi ${order.customer_name},\n\nYour package is ready for delivery! 🚚 It will be sent via Amway direct dispatch courier. Thank you for your patience!`;
        break;
      case "reorder":
        text = `Hi ${order.customer_name},\n\nHope you are enjoying your products! It has been about 30 days since your order of:\n${itemsText}\n\nJust wanted to check if you are running low and would like to restock. Let me know and I will arrange it for you! 🍀`;
        break;
      case "feedback":
        text = `Hi ${order.customer_name},\n\nI'd love to hear how you are feeling after using the products! Has the routine helped support your daily health/skincare goals? Your feedback helps me serve you better. 😊`;
        break;
    }
    setEditableWhatsAppText(text);
  };

  const handleLaunchWhatsAppOutreach = () => {
    if (!selectedOrder) return;
    const phone = selectedOrder.customer_phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(editableWhatsAppText)}`, "_blank");
    
    // Auto log interaction
    localDb.addInteraction({
      lead_id: selectedOrder.lead_id || "",
      type: "WhatsApp outreach",
      notes: `Sent ${activeMsgScenario} order WhatsApp message for order: ${selectedOrder.id}`,
      date: new Date().toISOString()
    });
    
    setShowMsgTemplateModal(false);
    loadAllData();
    alert("WhatsApp application triggered.");
  };

  // Filter products by category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(prodSearch.toLowerCase()) || p.product_code.toLowerCase().includes(prodSearch.toLowerCase());
    const matchesCat = prodCategoryFilter === "All" || p.category === prodCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 pb-20 w-full font-sans text-gray-900">
      {/* Segmented Top Control */}
      <div className="bg-white p-1 rounded-2xl border border-gray-200 flex shadow-xs">
        <button
          id="products-segment-catalog"
          onClick={() => { setActiveSegment("catalog"); setSelectedProduct(null); setSelectedOrder(null); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeSegment === "catalog" ? "bg-slate-900 text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catalog & Bundles</span>
        </button>
        <button
          id="products-segment-orders"
          onClick={() => { setActiveSegment("orders"); setSelectedProduct(null); setSelectedOrder(null); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeSegment === "orders" ? "bg-slate-900 text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders & Tracking</span>
        </button>
      </div>

      {/* RENDER CATALOG SECTION */}
      {activeSegment === "catalog" && (
        <div className="space-y-4 animate-fade-in">
          {/* CATALOG SUBTABS */}
          <div className="bg-white px-2 py-1.5 rounded-xl border border-gray-100 flex items-center justify-between shadow-xs">
            <div className="flex space-x-1 w-full text-center">
              {[
                { key: "products", label: "Products" },
                { key: "bundles", label: "Bundles" },
                { key: "imports", label: "CSV Import" }
              ].map(sub => (
                <button
                  id={`catalog-subtab-${sub.key}`}
                  key={sub.key}
                  onClick={() => setCatalogSubTab(sub.key as any)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    catalogSubTab === sub.key ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCTS TAB */}
          {catalogSubTab === "products" && (
            <div className="space-y-3">
              {/* Filter controls */}
              <div className="bg-white p-4 rounded-[20px] border border-gray-200/60 shadow-xs space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    id="catalog-prod-search"
                    type="text"
                    placeholder="Search product code, brand or name..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px]">
                    {["All", "Wellness", "Nutrition", "Skincare", "Beauty", "Home Care"].map(cat => (
                      <button
                        id={`cat-filter-${cat}`}
                        key={cat}
                        onClick={() => setProdCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-full border transition-all ${
                          prodCategoryFilter === cat ? "bg-slate-900 border-slate-900 text-white font-bold" : "bg-slate-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button
                    id="add-prod-btn"
                    onClick={() => { clearProductForm(); setSelectedProduct(null); setShowAddProduct(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>

              {/* Product Creation / Edit form overlay */}
              {showAddProduct && (
                <form onSubmit={handleSaveProduct} className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                    <span className="font-bold text-slate-800">{selectedProduct ? "Edit Amway Product" : "Create Manual Product"}</span>
                    <button type="button" onClick={() => setShowAddProduct(false)} className="text-slate-400 font-semibold hover:text-slate-600">Close</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Product Name *</label>
                      <input
                        id="form-pname"
                        type="text"
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Botanical Protein"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Product Code / SKU *</label>
                      <input
                        id="form-pcode"
                        type="text"
                        required
                        value={pCode}
                        onChange={(e) => setPCode(e.target.value)}
                        placeholder="NUTR-1003"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Category</label>
                      <select
                        id="form-pcategory"
                        value={pCategory}
                        onChange={(e) => setPCategory(e.target.value)}
                        className="w-full p-2 border rounded-xl bg-white"
                      >
                        <option value="Wellness">Wellness</option>
                        <option value="Nutrition">Nutrition</option>
                        <option value="Skincare">Skincare</option>
                        <option value="Beauty">Beauty</option>
                        <option value="Home Care">Home Care</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Brand</label>
                      <input
                        id="form-pbrand"
                        type="text"
                        value={pBrand}
                        onChange={(e) => setPBrand(e.target.value)}
                        placeholder="Nutrilite"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Description</label>
                    <textarea
                      id="form-pdesc"
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      rows={2}
                      placeholder="Brief product description..."
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                    <div>
                      <label className="block text-[7px] uppercase font-bold text-slate-500">Retail (RM)</label>
                      <input
                        id="form-pretail"
                        type="number"
                        step="0.01"
                        value={pRetail}
                        onChange={(e) => setPRetail(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] uppercase font-bold text-slate-500">ABO (RM)</label>
                      <input
                        id="form-pabo"
                        type="number"
                        step="0.01"
                        value={pAbo}
                        onChange={(e) => setPAbo(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] uppercase font-bold text-slate-500">PV</label>
                      <input
                        id="form-ppv"
                        type="number"
                        value={pPv}
                        onChange={(e) => setPPv(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] uppercase font-bold text-slate-500">BV</label>
                      <input
                        id="form-pbv"
                        type="number"
                        value={pBv}
                        onChange={(e) => setPBv(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl text-center font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Official Amway URL</label>
                      <input
                        id="form-purl"
                        type="url"
                        value={pUrl}
                        onChange={(e) => setPUrl(e.target.value)}
                        placeholder="https://www.amway.my/p/..."
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Internal notes</label>
                      <input
                        id="form-pnotes"
                        type="text"
                        value={pNotes}
                        onChange={(e) => setPNotes(e.target.value)}
                        placeholder="Pairs with protein shaker"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>
                  <button
                    id="form-prod-submit"
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    Save Product Record
                  </button>
                </form>
              )}

              {/* Products list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-10 bg-white rounded-2xl border col-span-full">No products match your search.</p>
                ) : (
                  filteredProducts.map(prod => (
                    <div key={prod.id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{prod.product_name}</h4>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                            {prod.product_code} • {prod.brand}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            id={`edit-prod-${prod.id}`}
                            onClick={() => handleEditProductClick(prod)}
                            className="text-slate-400 hover:text-slate-800 text-[10px] font-bold p-1"
                          >
                            Edit
                          </button>
                          <button
                            id={`del-prod-${prod.id}`}
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold p-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 rounded-xl text-center font-mono text-[9px] text-slate-600 border border-slate-100">
                        <div>
                          <span className="block text-[7px] uppercase font-bold text-slate-400">Retail</span>
                          <span className="font-bold">RM{prod.retail_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[7px] uppercase font-bold text-slate-400">ABO</span>
                          <span className="font-bold">RM{prod.abo_price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[7px] uppercase font-bold text-slate-400">PV</span>
                          <span className="font-bold">{prod.pv}</span>
                        </div>
                        <div>
                          <span className="block text-[7px] uppercase font-bold text-slate-400">BV</span>
                          <span className="font-bold">{prod.bv}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BUNDLES TAB */}
          {catalogSubTab === "bundles" && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-xs flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Custom Promotional Bundles</h4>
                  <p className="text-[10px] text-slate-400">Group top products for higher cart conversions</p>
                </div>
                <button
                  id="add-bundle-btn"
                  onClick={() => setShowAddBundle(true)}
                  className="bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Bundle</span>
                </button>
              </div>

              {showAddBundle && (
                <form onSubmit={handleSaveBundle} className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800">Create New Bundle Package</span>
                    <button type="button" onClick={() => setShowAddBundle(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Bundle Name *</label>
                      <input
                        id="form-bname"
                        type="text"
                        required
                        value={bName}
                        onChange={(e) => setBName(e.target.value)}
                        placeholder="E.g. Clear Skin Pack"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Package Category</label>
                      <select
                        id="form-bcategory"
                        value={bCategory}
                        onChange={(e) => setBCategory(e.target.value)}
                        className="w-full p-2 border rounded-xl bg-white"
                      >
                        <option value="Wellness">Wellness</option>
                        <option value="Nutrition">Nutrition</option>
                        <option value="Skincare">Skincare</option>
                        <option value="Beauty">Beauty</option>
                        <option value="Home Care">Home Care</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Package Retail Price (RM) *</label>
                      <input
                        id="form-bprice"
                        type="number"
                        required
                        value={bPrice}
                        onChange={(e) => setBPrice(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Context Notes</label>
                      <input
                        id="form-bnotes"
                        type="text"
                        value={bNotes}
                        onChange={(e) => setBNotes(e.target.value)}
                        placeholder="Seasonal promotion"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Description</label>
                    <textarea
                      id="form-bdesc"
                      value={bDesc}
                      onChange={(e) => setBDesc(e.target.value)}
                      rows={2}
                      className="w-full p-2 border rounded-xl"
                    />
                  </div>

                  {/* Add products to bundle list selector */}
                  <div className="space-y-2 border-t pt-3">
                    <span className="block text-[10px] font-bold text-slate-600">Select Products in Bundle</span>
                    <div className="max-h-32 overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                      {products.map(p => {
                        const qty = selectedBundleProducts.find(bp => bp.id === p.id)?.quantity || 0;
                        return (
                          <div key={p.id} className="flex justify-between items-center text-[11px] p-1 bg-white rounded border">
                            <span>{p.product_name} ({p.product_code})</span>
                            <div className="flex items-center space-x-1.5">
                              {qty > 0 && <span className="font-bold text-blue-600">{qty}x</span>}
                              <button
                                type="button"
                                onClick={() => handleAddProductToBundle(p.id)}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border rounded font-bold"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    id="form-bundle-submit"
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                  >
                    Save Bundle Package
                  </button>
                </form>
              )}

              {/* Bundles List */}
              <div className="space-y-2">
                {bundles.map(bund => {
                  const items = localDb.getBundleItems(bund.id);
                  return (
                    <div key={bund.id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{bund.bundle_name}</h4>
                          <span className="text-[9px] text-slate-400">{bund.category} Bundle</span>
                        </div>
                        <button
                          id={`del-bund-${bund.id}`}
                          onClick={() => handleDeleteBundle(bund.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">{bund.description}</p>
                      <div className="bg-slate-50 p-2.5 rounded-xl border space-y-1">
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Included Products:</span>
                        {items.map(bi => {
                          const p = products.find(prod => prod.id === bi.product_id);
                          return (
                            <div key={bi.id} className="flex justify-between text-[10px] text-slate-600">
                              <span>{p ? p.product_name : "Unknown Product"}</span>
                              <span className="font-bold">{bi.quantity}x</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-dashed">
                        <span className="text-slate-400">Bundle Price:</span>
                        <span className="text-emerald-600 font-mono">RM {bund.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* IMPORTS TAB */}
          {catalogSubTab === "imports" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-slate-800">CSV Bulk Product Import Sandbox</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Avoid typing products manually! Copy and paste your comma-separated text into the area below. Ensure column order matches the layout parameters exactly.
                </p>
                <button
                  id="sample-csv-btn"
                  type="button"
                  onClick={loadSampleCsvTemplate}
                  className="w-full py-1.5 bg-slate-50 border border-dashed rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                >
                  Load Sample Amway Product Template
                </button>
              </div>

              <div className="space-y-2 bg-white p-4 rounded-[20px] border shadow-xs text-xs">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Paste Comma-Separated Values</label>
                <textarea
                  id="csv-paste-textarea"
                  value={csvPasteText}
                  onChange={(e) => setCsvPasteText(e.target.value)}
                  rows={6}
                  placeholder="product_name,product_code,category,brand,description,retail_price,abo_price,pv,bv,official_product_url,notes..."
                  className="w-full p-2 border rounded-xl font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                />
                <button
                  id="csv-parse-btn"
                  type="button"
                  onClick={handleImportCsv}
                  className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-transform"
                >
                  Import Paste Results
                </button>
              </div>

              {/* Import History */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-slate-400">Import Logs Report</h4>
                {imports.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border">No import sessions recorded yet.</p>
                ) : (
                  imports.map(imp => (
                    <div key={imp.id} className="bg-white p-3 rounded-xl border text-xs space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-slate-800">{imp.file_name}</span>
                        <span className={`font-mono font-bold ${imp.import_status === "Completed" ? "text-emerald-600" : "text-rose-600"}`}>
                          {imp.import_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">Processed: {imp.total_rows} rows • Successful: {imp.successful_rows} • Errors: {imp.failed_rows}</p>
                      {imp.error_report && (
                        <pre className="p-2 bg-rose-50 text-rose-800 rounded font-mono text-[8px] whitespace-pre-wrap max-h-20 overflow-y-auto mt-1 border border-rose-100">
                          {imp.error_report}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER ORDERS SECTION */}
      {activeSegment === "orders" && (
        <div className="space-y-4 animate-fade-in">
          {/* ORDERS SUMMARY AND TRIGGER BUTTONS */}
          <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Direct Customer Orders</h3>
              <p className="text-[10px] text-slate-400">Log customer acquisitions & payment links</p>
            </div>
            <button
              id="trigger-order-modal"
              onClick={() => { setShowCreateOrder(true); setWizardStep(1); }}
              className="bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Order</span>
            </button>
          </div>

          {/* CREATE ORDER MODAL/WIZARD FORM */}
          {showCreateOrder && (
            <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-800">Log Customer Order (Step {wizardStep} of 3)</span>
                <button type="button" onClick={() => setShowCreateOrder(false)} className="text-slate-400 hover:text-slate-600">Close</button>
              </div>

              {/* STEP 1: SELECT PROSPECT / INPUT CONTACT */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Link to CRM Prospect (Optional)</label>
                    <select
                      id="wizard-lead-select"
                      value={ordLeadId}
                      onChange={(e) => handleSelectLeadForOrder(e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-slate-50 focus:outline-none text-xs"
                    >
                      <option value="">-- Direct Sale (No Lead link) --</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.phone}) • {l.stage}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-dashed">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Customer Name *</label>
                      <input
                        id="wizard-cust-name"
                        type="text"
                        required
                        value={ordCustName}
                        onChange={(e) => setOrdCustName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Phone Number *</label>
                        <input
                          id="wizard-cust-phone"
                          type="text"
                          required
                          value={ordCustPhone}
                          onChange={(e) => setOrdCustPhone(e.target.value)}
                          placeholder="6012..."
                          className="w-full p-2 border rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Email Address</label>
                        <input
                          id="wizard-cust-email"
                          type="email"
                          value={ordCustEmail}
                          onChange={(e) => setOrdCustEmail(e.target.value)}
                          placeholder="name@email.com"
                          className="w-full p-2 border rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="wizard-step1-next"
                    type="button"
                    onClick={() => {
                      if (!ordCustName || !ordCustPhone) {
                        alert("Customer Name and Phone are required.");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl mt-2"
                  >
                    Next: Add Products
                  </button>
                </div>
              )}

              {/* STEP 2: CART SELECTOR */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Add Items to Cart</span>
                  
                  {/* List items available */}
                  <div className="max-h-40 overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Products:</div>
                    {products.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-[10px] p-1.5 bg-white rounded border">
                        <span>{p.product_name} (RM {p.retail_price})</span>
                        <button
                          type="button"
                          onClick={() => handleAddProductToOrderCart(p.id, "product")}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border rounded font-bold text-[9px]"
                        >
                          + Add
                        </button>
                      </div>
                    ))}

                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-1">Bundles:</div>
                    {bundles.map(b => (
                      <div key={b.id} className="flex justify-between items-center text-[10px] p-1.5 bg-white rounded border border-indigo-100">
                        <span>{b.bundle_name} (RM {b.total_price})</span>
                        <button
                          type="button"
                          onClick={() => handleAddProductToOrderCart(b.id, "bundle")}
                          className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border rounded font-bold text-[9px]"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* ACTIVE CART ITEMS */}
                  <div className="bg-slate-100 p-3 rounded-xl border space-y-1.5">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cart Contents</span>
                    {orderCart.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-2">Cart is empty. Add products above.</p>
                    ) : (
                      orderCart.map(c => {
                        const name = c.type === "product" ? products.find(p => p.id === c.id)?.product_name : bundles.find(b => b.id === c.id)?.bundle_name;
                        const price = c.type === "product" ? products.find(p => p.id === c.id)?.retail_price : bundles.find(b => b.id === c.id)?.total_price;
                        return (
                          <div key={c.id} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded border">
                            <span className="truncate w-32">{name}</span>
                            <div className="flex items-center space-x-1.5">
                              <button type="button" onClick={() => handleUpdateCartQuantity(c.id, c.type, -1)} className="px-1.5 border rounded bg-slate-50 font-bold">-</button>
                              <span className="font-bold">{c.quantity}</span>
                              <button type="button" onClick={() => handleUpdateCartQuantity(c.id, c.type, 1)} className="px-1.5 border rounded bg-slate-50 font-bold">+</button>
                              <span className="font-mono font-bold text-slate-700 min-w-14 text-right">RM {((price || 0) * c.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex space-x-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="flex-1 py-2 border rounded-xl hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      id="wizard-step2-next"
                      type="button"
                      onClick={() => {
                        if (orderCart.length === 0) {
                          alert("Please add at least one product to the cart.");
                          return;
                        }
                        setWizardStep(3);
                      }}
                      className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-xl"
                    >
                      Next: checkout details
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: BILLING & COMPLETE */}
              {wizardStep === 3 && (
                <div className="space-y-3.5">
                  <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Billing Details & Confirmation</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Delivery Fee (RM)</label>
                      <input
                        id="wizard-delivery-fee"
                        type="number"
                        value={ordDelivery}
                        onChange={(e) => setOrdDelivery(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Discount (RM)</label>
                      <input
                        id="wizard-discount"
                        type="number"
                        value={ordDiscount}
                        onChange={(e) => setOrdDiscount(Number(e.target.value))}
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Payment Method</label>
                      <select
                        id="wizard-payment-method"
                        value={ordPaymentMethod}
                        onChange={(e) => setOrdPaymentMethod(e.target.value as any)}
                        className="w-full p-2 border rounded-xl bg-white"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="DuitNow">DuitNow</option>
                        <option value="Cash">Cash (In-person)</option>
                        <option value="Stripe Card Payment">Stripe Payment Link</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Checkout Notes</label>
                      <input
                        id="wizard-notes"
                        type="text"
                        value={ordNotes}
                        onChange={(e) => setOrdNotes(e.target.value)}
                        placeholder="Deliver to office address"
                        className="w-full p-2 border rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Pricing and PV breakdown */}
                  {(() => {
                    const { subtotal, total, pv, bv } = calculateCartTotals();
                    const aboSub = calculateCartABOSubtotal();
                    const estimatedCommissions = subtotal - aboSub;
                    return (
                      <div className="bg-slate-50 p-3.5 rounded-xl border font-mono space-y-1.5 text-[10px] text-slate-600">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-bold">RM {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span className="font-bold">+RM {ordDelivery.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount Applied:</span>
                          <span className="font-bold text-rose-600">-RM {ordDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 border-t border-dashed pt-1 font-sans text-xs font-bold">
                          <span>Grand Total:</span>
                          <span className="text-emerald-600">RM {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t text-[9px] text-slate-400">
                          <span>Total PV / BV:</span>
                          <span className="font-bold text-slate-600">{pv} PV / {bv} BV</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-indigo-500 font-bold">
                          <span>Est. Retail Commissions:</span>
                          <span>RM {estimatedCommissions.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex space-x-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="flex-1 py-2 border rounded-xl hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      id="wizard-complete-btn"
                      type="button"
                      onClick={handleCreateOrderSubmit}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      Log Order Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE ORDER LIST */}
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-10 bg-white rounded-[20px] border">No active customer orders tracked yet.</p>
            ) : (
              orders.map(ord => {
                const isSelected = selectedOrder?.id === ord.id;
                return (
                  <div key={ord.id} className={`bg-white rounded-[20px] border shadow-xs overflow-hidden transition-all space-y-3 p-4 ${isSelected ? 'border-slate-400 ring-1 ring-slate-100' : 'border-gray-100 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-800">{ord.customer_name}</span>
                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-mono font-bold">
                            {ord.order_status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">Date: {ord.order_date} • Order: {ord.id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-600 font-mono">RM {ord.total_amount.toFixed(2)}</span>
                        <span className="block text-[8px] uppercase font-bold text-slate-400 font-mono">{ord.payment_method}</span>
                      </div>
                    </div>

                    {/* Action Toolbar on Order Cards */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                      <button
                        id={`open-templates-${ord.id}`}
                        onClick={() => handleOpenWhatsAppTemplates(ord)}
                        className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 transition-colors"
                      >
                        <Share2 className="w-3 h-3 text-emerald-400" />
                        <span>Outreach presets</span>
                      </button>

                      <button
                        id={`toggle-details-${ord.id}`}
                        onClick={() => handleToggleDetails(ord)}
                        className={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all ${
                          isSelected ? "bg-slate-200 text-slate-800" : "bg-blue-50 hover:bg-blue-100 text-blue-700"
                        }`}
                      >
                        <span>{isSelected ? "Hide details ▲" : "View Details ▼"}</span>
                      </button>

                      {/* Dropdown status update quickly */}
                      <select
                        id={`status-select-${ord.id}`}
                        value={ord.order_status}
                        onChange={(e) => handleUpdateOrderStatus(ord, e.target.value as any)}
                        className="py-1 px-2 border rounded-lg bg-slate-50 text-[10px] font-bold focus:outline-none"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Payment Pending">Payment Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Ordered from Amway">Ordered from Amway</option>
                        <option value="Ready for Delivery">Ready for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <button
                        id={`del-ord-${ord.id}`}
                        onClick={() => handleDeleteOrder(ord.id)}
                        className="text-rose-500 hover:text-rose-700 text-[10px] font-semibold ml-auto"
                      >
                        Delete
                      </button>
                    </div>

                    {/* EXPANDED INVOICE / ORDER DETAILS PANEL */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3.5 text-xs animate-fade-in">
                        {/* Customer contact details */}
                        <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-semibold text-[9px] uppercase">Email</span>
                            <span className="text-slate-700 font-medium truncate block">{ord.customer_email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold text-[9px] uppercase">Phone Number</span>
                            <span className="text-slate-700 font-medium block">{ord.customer_phone}</span>
                          </div>
                        </div>

                        {/* Ordered Items Table */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ordered Items Detail</span>
                          <div className="border border-slate-100 rounded-xl overflow-x-auto bg-slate-50/50 hide-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[300px]">
                              <thead>
                                <tr className="bg-slate-100/70 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-150">
                                  <th className="p-2 whitespace-nowrap">Product</th>
                                  <th className="p-2 text-center whitespace-nowrap">Qty</th>
                                  <th className="p-2 text-right whitespace-nowrap">Price</th>
                                  <th className="p-2 text-right whitespace-nowrap">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[11px]">
                                {(localDb.getOrderItems(ord.id) || []).map(item => (
                                  <tr key={item.id} className="text-slate-700">
                                    <td className="p-2">
                                      <span className="font-bold block text-slate-800 whitespace-nowrap">{item.product_name}</span>
                                      <span className="text-[8px] text-slate-400 font-mono">{item.product_code}</span>
                                    </td>
                                    <td className="p-2 text-center font-mono font-bold text-slate-700">{item.quantity}</td>
                                    <td className="p-2 text-right font-mono text-slate-600 font-medium whitespace-nowrap">RM {item.unit_price.toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">RM {item.total_price.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* PV/BV, Commissions summary */}
                        <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0 text-[10px]">
                          <div>
                            <span className="text-slate-500 font-semibold">Order Volume:</span>
                            <span className="font-bold text-slate-700 font-mono ml-1">
                              {(localDb.getOrderItems(ord.id) || []).reduce((acc, c) => acc + (c.pv * c.quantity), 0)} PV / {(localDb.getOrderItems(ord.id) || []).reduce((acc, c) => acc + (c.bv * c.quantity), 0)} BV
                            </span>
                          </div>
                          <div>
                            <span className="text-indigo-600 font-semibold">Retail Commissions:</span>
                            <span className="font-bold text-indigo-700 font-mono ml-1">
                              RM {((localDb.getOrderItems(ord.id) || []).reduce((acc, c) => acc + (c.total_price - (c.unit_price * 0.8) * c.quantity), 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* CUSTOM VARIABLE WHATSAPP LINK GENERATOR */}
                        <div className="bg-emerald-50/40 border border-emerald-200/40 p-3.5 rounded-xl space-y-2 text-slate-800">
                          <div className="flex items-center space-x-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Pre-filled WhatsApp Generator</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                            Trigger dynamic customer chats with live variables like <code>{"{{order_items}}"}</code> and <code>{"{{total_amount}}"}</code>:
                          </p>
                          
                          {/* Dynamic Template input */}
                          <div className="space-y-1.5">
                            <textarea
                              id={`wa-template-${ord.id}`}
                              rows={3}
                              defaultValue={`Hi ${ord.customer_name}, thank you for choosing us! 🌟 Your order consists of: {{order_items}} with total {{total_amount}}. We will process it immediately!`}
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[11px] font-sans leading-relaxed focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                            
                            <button
                              id={`btn-wa-link-${ord.id}`}
                              type="button"
                              onClick={() => {
                                const textarea = document.getElementById(`wa-template-${ord.id}`) as HTMLTextAreaElement;
                                const rawTemplate = textarea?.value || "";
                                const items = localDb.getOrderItems(ord.id) || [];
                                const itemsText = items.map(item => `${item.quantity}x ${item.product_name}`).join(", ");
                                const amountText = `RM ${ord.total_amount.toFixed(2)}`;
                                
                                let parsedText = rawTemplate
                                  .replace(/\{\{order_items\}\}/g, itemsText)
                                  .replace(/\{\{total_amount\}\}/g, amountText)
                                  .replace(/\{\{customer_name\}\}/g, ord.customer_name)
                                  .replace(/\{\{order_id\}\}/g, ord.id);
                                  
                                const cleanPhone = ord.customer_phone.replace(/\D/g, "");
                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(parsedText)}`, "_blank");
                                
                                // Log interaction
                                localDb.addInteraction({
                                  lead_id: ord.lead_id || "",
                                  type: "WhatsApp outreach",
                                  notes: `Sent pre-filled variable WhatsApp message: ${ord.id}`,
                                  date: new Date().toISOString()
                                });
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Launch {"{{order_items}}"} WhatsApp Link</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* WHATSAPP TEMPLATES DRAWER/MODAL OVERLAY */}
      {showMsgTemplateModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400">Compliance Outreach Engine</h3>
                <h2 className="text-sm font-bold truncate">Customer: {selectedOrder.customer_name}</h2>
              </div>
              <button onClick={() => setShowMsgTemplateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              {/* Category Toggles */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  { key: "confirmation", label: "Confirm" },
                  { key: "payment", label: "Pay Link" },
                  { key: "amway", label: "Amway Placed" },
                  { key: "delivery", label: "Delivery" },
                  { key: "reorder", label: "Reorder" },
                  { key: "feedback", label: "Feedback" }
                ].map(scen => (
                  <button
                    id={`wa-scenario-${scen.key}`}
                    key={scen.key}
                    onClick={() => generateWhatsAppTemplateText(scen.key as any, selectedOrder)}
                    className={`py-1 rounded text-[9px] font-bold border transition-colors ${
                      activeMsgScenario === scen.key ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 border-gray-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {scen.label}
                  </button>
                ))}
              </div>

              {/* Message editable text box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Generated WhatsApp Message (Compliant & Personal)</label>
                <textarea
                  id="wa-editable-text"
                  value={editableWhatsAppText}
                  onChange={(e) => setEditableWhatsAppText(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-700 font-sans focus:outline-none"
                />
              </div>

              {/* Compliance note warning */}
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 text-[9px] leading-relaxed">
                <span className="font-bold block">Amway Rules of Conduct Safeguard:</span>
                This template avoids common risky phrases such as guaranteed income claims, medical cures, or secret setups. Review it before sending.
              </div>

              <button
                id="dispatch-wa-outreach"
                onClick={handleLaunchWhatsAppOutreach}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1"
              >
                <Send className="w-4 h-4 text-emerald-100" />
                <span>Launch WhatsApp application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
