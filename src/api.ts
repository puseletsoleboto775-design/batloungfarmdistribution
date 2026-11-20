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
  } catch {
    // not JSON (for example a proxy error page)
  }
  if (!response.ok || !body || body.success === false) {
    throw new Error(body?.message || `The server responded with an error (${response.status})`);
  }
  return body as T & { success: true };
}

const send = (method: string, payload: unknown): RequestInit => ({
  method,
  body: JSON.stringify(payload),
});

export const api = {
  suppliers: async () => (await request<{ data: Supplier[] }>("/suppliers")).data,
  vendors: async () => (await request<{ data: Vendor[] }>("/vendors")).data,
  fruits: async () => (await request<{ data: Fruit[] }>("/fruits")).data,
  stock: async () => (await request<{ data: StockRow[] }>("/fruits/stock")).data,
  lowStock: async (): Promise<LowStock> => {
    const body = await request<{ threshold: number; data: StockRow[] }>("/fruits/low-stock");
    return { threshold: body.threshold, rows: body.data };
  },
  sales: async () => (await request<{ data: Sale[] }>("/sales")).data,
  purchases: async () => (await request<{ data: Purchase[] }>("/purchases")).data,
  report: async (from: string, to: string) =>
    (
      await request<{ data: Report }>(
        `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      )
    ).data,

  createSupplier: (input: {
    businessName: string;
    contactPerson: string;
    phone: string;
    province: string;
    address: string;
  }) => request("/suppliers", send("POST", input)),
  createVendor: (input: { vendorName: string; phoneNumber: string; location: string }) =>
    request("/vendors", send("POST", input)),
  deleteVendor: (vendorId: number) =>
    request(`/vendors/${vendorId}`, { method: "DELETE" }),
  createFruit: (input: { fruitName: string; description?: string }) =>
    request("/fruits", send("POST", input)),

  recordSale: (input: {
    vendorId: number;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    lines: LineInput[];
  }) =>
    request(
      "/sales",
      send("POST", {
        vendorId: input.vendorId,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        items: input.lines.map((l) => ({
          fruitId: l.fruitId,
          packagingSize: l.packagingSize,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
      }),
    ),
  recordPurchase: (input: { supplierId: number; lines: LineInput[] }) =>
    request(
      "/purchases",
      send("POST", {
        supplierId: input.supplierId,
        items: input.lines.map((l) => ({
          fruitId: l.fruitId,
          packagingSize: l.packagingSize,
          quantity: l.quantity,
          unitCost: l.price,
        })),
      }),
    ),
};
