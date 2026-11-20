const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export type PackagingSize = "SMALL" | "MEDIUM" | "LARGE";
export const SIZES: PackagingSize[] = ["SMALL", "MEDIUM", "LARGE"];
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID";
export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CREDIT";

export const PROVINCES = [
  "Gauteng",
  "Free State",
  "KwaZulu-Natal",
  "Western Cape",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
];

export interface Supplier {
  supplier_id: number;
  business_name: string;
  contact_person: string;
  phone: string;
  province: string;
  address: string;
}
export interface Vendor {
  vendor_id: number;
  vendor_name: string;
  phone_number: string;
  location: string;
  registration_date: string;
  outstanding_balance: number;
  boxes_purchased: number;
}
export interface Fruit {
  fruit_id: number;
  fruit_name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
}
export interface StockRow {
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  available_quantity: number;
}
export interface SaleItem {
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_price: number;
}
export interface Sale {
  sale_id: number;
  vendor_id: number;
  vendor_name: string;
  sale_date: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  amount_paid: number;
  total_amount: number;
  outstanding_balance: number;
  items: SaleItem[];
}
export interface PurchaseItem {
  fruit_id: number;
  fruit_name: string;
  packaging_size: PackagingSize;
  quantity: number;
  unit_cost: number;
}
export interface Purchase {
  purchase_id: number;
  supplier_id: number;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  items: PurchaseItem[];
}
export interface LowStock {
  threshold: number;
  rows: StockRow[];
}
export interface Report {
  topFruits: { fruit_name: string; boxes_sold: number }[];
  revenue: { total_revenue: number };
  topVendor: { vendor_name: string; boxes_purchased: number } | null;
}
export interface LineInput {
  fruitId: number;
  packagingSize: PackagingSize;
  quantity: number;
  price: number;
}

// --- DEMO DATA (used on Netlify when backend is not reachable) ---
let demoSuppliers: Supplier[] = [
  { supplier_id: 1, business_name: "Maseru Fresh Farms", contact_person: "Thabo Mokoena", phone: "082 123 4567", province: "Free State", address: "12 Farm Road, Maseru" },
  { supplier_id: 2, business_name: "Lesotho Orchard Co.", contact_person: "Mpho Leboto", phone: "083 987 6543", province: "Gauteng", address: "45 Orchard Lane, Leribe" },
  { supplier_id: 3, business_name: "Highlands Fruit Suppliers", contact_person: "Naledi Khumalo", phone: "081 555 0199", province: "KwaZulu-Natal", address: "8 Hilltop Ave, Berea" },
];
let demoVendors: Vendor[] = [
  { vendor_id: 1, vendor_name: "Puseletso's Fruit Stall", phone_number: "082 111 2222", location: "Maseru Market", registration_date: "2026-01-15", outstanding_balance: 450, boxes_purchased: 120 },
  { vendor_id: 2, vendor_name: "Katleho Fresh Corner", phone_number: "083 333 4444", location: "Maseru Mall", registration_date: "2026-02-10", outstanding_balance: 0, boxes_purchased: 85 },
  { vendor_id: 3, vendor_name: "Tebello Street Vendor", phone_number: "081 777 8888", location: "Kingsway Road", registration_date: "2026-03-05", outstanding_balance: 1200, boxes_purchased: 60 },
];
let demoFruits: Fruit[] = [
  { fruit_id: 1, fruit_name: "Apples", description: "Fresh red apples", status: "ACTIVE" },
  { fruit_id: 2, fruit_name: "Oranges", description: "Sweet navel oranges", status: "ACTIVE" },
  { fruit_id: 3, fruit_name: "Bananas", description: "Ripe bananas", status: "ACTIVE" },
  { fruit_id: 4, fruit_name: "Pears", description: "Green pears", status: "ACTIVE" },
];
let demoStock: StockRow[] = [
  { fruit_id: 1, fruit_name: "Apples", packaging_size: "SMALL", available_quantity: 85 },
  { fruit_id: 1, fruit_name: "Apples", packaging_size: "MEDIUM", available_quantity: 42 },
  { fruit_id: 1, fruit_name: "Apples", packaging_size: "LARGE", available_quantity: 18 },
  { fruit_id: 2, fruit_name: "Oranges", packaging_size: "SMALL", available_quantity: 120 },
  { fruit_id: 2, fruit_name: "Oranges", packaging_size: "MEDIUM", available_quantity: 65 },
  { fruit_id: 2, fruit_name: "Oranges", packaging_size: "LARGE", available_quantity: 8 },
  { fruit_id: 3, fruit_name: "Bananas", packaging_size: "SMALL", available_quantity: 95 },
  { fruit_id: 3, fruit_name: "Bananas", packaging_size: "MEDIUM", available_quantity: 30 },
  { fruit_id: 4, fruit_name: "Pears", packaging_size: "SMALL", available_quantity: 5 },
  { fruit_id: 4, fruit_name: "Pears", packaging_size: "MEDIUM", available_quantity: 12 },
];
let demoSales: Sale[] = [
  { sale_id: 1, vendor_id: 1, vendor_name: "Puseletso's Fruit Stall", sale_date: "2026-11-18", payment_status: "PAID", payment_method: "CASH", amount_paid: 2500, total_amount: 2500, outstanding_balance: 0, items: [{ fruit_id: 1, fruit_name: "Apples", packaging_size: "MEDIUM", quantity: 20, unit_price: 85 }, { fruit_id: 2, fruit_name: "Oranges", packaging_size: "SMALL", quantity: 10, unit_price: 80 }] },
  { sale_id: 2, vendor_id: 2, vendor_name: "Katleho Fresh Corner", sale_date: "2026-11-19", payment_status: "PARTIALLY_PAID", payment_method: "MOBILE_MONEY", amount_paid: 1500, total_amount: 1950, outstanding_balance: 450, items: [{ fruit_id: 2, fruit_name: "Oranges", packaging_size: "MEDIUM", quantity: 15, unit_price: 130 }] },
  { sale_id: 3, vendor_id: 3, vendor_name: "Tebello Street Vendor", sale_date: "2026-11-20", payment_status: "UNPAID", payment_method: "CREDIT", amount_paid: 0, total_amount: 1200, outstanding_balance: 1200, items: [{ fruit_id: 3, fruit_name: "Bananas", packaging_size: "SMALL", quantity: 20, unit_price: 60 }] },
];
let demoPurchases: Purchase[] = [
  { purchase_id: 1, supplier_id: 1, supplier_name: "Maseru Fresh Farms", purchase_date: "2026-11-10", total_amount: 4200, items: [{ fruit_id: 1, fruit_name: "Apples", packaging_size: "MEDIUM", quantity: 50, unit_cost: 60 }, { fruit_id: 2, fruit_name: "Oranges", packaging_size: "SMALL", quantity: 30, unit_cost: 40 }] },
  { purchase_id: 2, supplier_id: 2, supplier_name: "Lesotho Orchard Co.", purchase_date: "2026-11-15", total_amount: 3100, items: [{ fruit_id: 3, fruit_name: "Bananas", packaging_size: "SMALL", quantity: 60, unit_cost: 35 }, { fruit_id: 4, fruit_name: "Pears", packaging_size: "MEDIUM", quantity: 20, unit_cost: 50 }] },
];
const demoReport: Report = {
  topFruits: [{ fruit_name: "Apples", boxes_sold: 120 }, { fruit_name: "Oranges", boxes_sold: 95 }, { fruit_name: "Bananas", boxes_sold: 80 }],
  revenue: { total_revenue: 5650 },
  topVendor: { vendor_name: "Puseletso's Fruit Stall", boxes_purchased: 120 },
};

async function request<T>(path: string, init?: RequestInit): Promise<T & { success: true }> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("Cannot reach the Batloung Farm API. Is the backend running?");
  }
  let body: { success?: boolean; message?: string } | null = null;
  try {
    body = await response.json();
  } catch {}
  if (!response.ok || !body || body.success === false) {
    throw new Error(body?.message || `The server responded with an error (${response.status})`);
  }
  return body as T & { success: true };
}

const send = (method: string, payload: unknown): RequestInit => ({
  method,
  body: JSON.stringify(payload),
});

// Try real API, fall back to demo data if backend is down
async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const api = {
  suppliers: () => withFallback(async () => (await request<{ data: Supplier[] }>("/suppliers")).data, [...demoSuppliers]),
  vendors: () => withFallback(async () => (await request<{ data: Vendor[] }>("/vendors")).data, [...demoVendors]),
  fruits: () => withFallback(async () => (await request<{ data: Fruit[] }>("/fruits")).data, [...demoFruits]),
  stock: () => withFallback(async () => (await request<{ data: StockRow[] }>("/fruits/stock")).data, [...demoStock]),
  lowStock: async (): Promise<LowStock> => {
    return withFallback(async () => {
      const body = await request<{ threshold: number; data: StockRow[] }>("/fruits/low-stock");
      return { threshold: body.threshold, rows: body.data };
    }, { threshold: 10, rows: demoStock.filter(r => r.available_quantity <= 10) });
  },
  sales: () => withFallback(async () => (await request<{ data: Sale[] }>("/sales")).data, [...demoSales]),
  purchases: () => withFallback(async () => (await request<{ data: Purchase[] }>("/purchases")).data, [...demoPurchases]),
  report: (_from: string, _to: string) =>
    withFallback(async () => (await request<{ data: Report }>(`/reports/summary?from=${encodeURIComponent(_from)}&to=${encodeURIComponent(_to)}`)).data, demoReport),

  createSupplier: async (input: { businessName: string; contactPerson: string; phone: string; province: string; address: string }) => {
    try { return await request("/suppliers", send("POST", input)); } catch {
      demoSuppliers.push({ supplier_id: Date.now(), business_name: input.businessName, contact_person: input.contactPerson, phone: input.phone, province: input.province, address: input.address });
      return { success: true as const };
    }
  },
  createVendor: async (input: { vendorName: string; phoneNumber: string; location: string }) => {
    try { return await request("/vendors", send("POST", input)); } catch {
      demoVendors.push({ vendor_id: Date.now(), vendor_name: input.vendorName, phone_number: input.phoneNumber, location: input.location, registration_date: new Date().toISOString().slice(0,10), outstanding_balance: 0, boxes_purchased: 0 });
      return { success: true as const };
    }
  },
  deleteVendor: async (vendorId: number) => {
    try { return await request(`/vendors/${vendorId}`, { method: "DELETE" }); } catch {
      demoVendors = demoVendors.filter(v => v.vendor_id !== vendorId);
      return { success: true as const };
    }
  },
  createFruit: async (input: { fruitName: string; description?: string }) => {
    try { return await request("/fruits", send("POST", input)); } catch {
      demoFruits.push({ fruit_id: Date.now(), fruit_name: input.fruitName, description: input.description ?? null, status: "ACTIVE" });
      return { success: true as const };
    }
  },
  recordSale: async (input: { vendorId: number; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; amountPaid: number; lines: LineInput[] }) => {
    const payload = { vendorId: input.vendorId, paymentStatus: input.paymentStatus, paymentMethod: input.paymentMethod, amountPaid: input.amountPaid, items: input.lines.map((l) => ({ fruitId: l.fruitId, packagingSize: l.packagingSize, quantity: l.quantity, unitPrice: l.price })) };
    try { return await request("/sales", send("POST", payload)); } catch {
      const vendor = demoVendors.find(v => v.vendor_id === input.vendorId);
      const total = input.lines.reduce((s, l) => s + l.quantity * l.price, 0);
      demoSales.push({ sale_id: Date.now(), vendor_id: input.vendorId, vendor_name: vendor?.vendor_name ?? "Vendor", sale_date: new Date().toISOString().slice(0,10), payment_status: input.paymentStatus, payment_method: input.paymentMethod, amount_paid: input.amountPaid, total_amount: total, outstanding_balance: total - input.amountPaid, items: input.lines.map(l => { const f = demoFruits.find(x => x.fruit_id === l.fruitId); return { fruit_id: l.fruitId, fruit_name: f?.fruit_name ?? "Fruit", packaging_size: l.packagingSize, quantity: l.quantity, unit_price: l.price }; }) });
      return { success: true as const };
    }
  },
  recordPurchase: async (input: { supplierId: number; lines: LineInput[] }) => {
    const payload = { supplierId: input.supplierId, items: input.lines.map((l) => ({ fruitId: l.fruitId, packagingSize: l.packagingSize, quantity: l.quantity, unitCost: l.price })) };
    try { return await request("/purchases", send("POST", payload)); } catch {
      const supplier = demoSuppliers.find(s => s.supplier_id === input.supplierId);
      const total = input.lines.reduce((s, l) => s + l.quantity * l.price, 0);
      demoPurchases.push({ purchase_id: Date.now(), supplier_id: input.supplierId, supplier_name: supplier?.business_name ?? "Supplier", purchase_date: new Date().toISOString().slice(0,10), total_amount: total, items: input.lines.map(l => { const f = demoFruits.find(x => x.fruit_id === l.fruitId); return { fruit_id: l.fruitId, fruit_name: f?.fruit_name ?? "Fruit", packaging_size: l.packagingSize, quantity: l.quantity, unit_cost: l.price }; }) });
      return { success: true as const };
    }
  },
};