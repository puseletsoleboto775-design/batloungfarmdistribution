import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  ExternalLink,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Navigation,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  TriangleAlert,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  PROVINCES,
  SIZES,
  api,
  type Fruit,
  type LowStock,
  type PackagingSize,
  type PaymentMethod,
  type PaymentStatus,
  type Purchase,
  type Report,
  type Sale,
  type StockRow,
  type Supplier,
  type Vendor,
} from "./api";

const heroImage =
  "https://images.unsplash.com/photo-1677783074667-5989e13e6a86?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=86&w=1800";

type Page = "Overview" | "Inventory" | "Sales" | "Purchases" | "Suppliers" | "Vendors" | "Reports";
type Period = "7" | "30" | "month" | "all";
type Tone = "green" | "amber" | "red";
type EntityKind = "supplier" | "vendor" | "fruit";

interface Data {
  suppliers: Supplier[];
  vendors: Vendor[];
  fruits: Fruit[];
  stock: StockRow[];
  sales: Sale[];
  purchases: Purchase[];
  low: LowStock;
}

interface Txn {
  key: string;
  id: string;
  type: "Sale" | "Purchase";
  party: string;
  summary: string;
  amount: number;
  boxes: number;
  status: string;
  tone: Tone;
  date: string;
  method: string;
  fruits: string[];
}

interface FruitStock {
  id: number;
  name: string;
  small: number;
  medium: number;
  large: number;
  total: number;
  color: string;
  lowSizes: number;
}

const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Inventory", icon: Boxes },
  { label: "Sales", icon: ShoppingCart },
  { label: "Purchases", icon: PackagePlus },
  { label: "Suppliers", icon: Truck },
  { label: "Vendors", icon: Store },
];

const palette = ["#e84d3c", "#f3c647", "#f28a2e", "#e0a334", "#70407c", "#3d7958", "#2f7fa8", "#b5527a"];
const sizeLabel = (size: PackagingSize) => size.charAt(0) + size.slice(1).toLowerCase();

// Return the correct emoji for the five fruits distributed by the company.
const fruitEmoji = (name: string) => {
  const normalized = name.trim().toLowerCase();
  const emojiByFruit: Record<string, string> = {
    apple: "🍎",
    apples: "🍎",
    banana: "🍌",
    bananas: "🍌",
    orange: "🍊",
    oranges: "🍊",
    mango: "🥭",
    mangos: "🥭",
    mangoes: "🥭",
    grape: "🍇",
    grapes: "🍇",
  };

  return emojiByFruit[normalized] ?? "🍇";
};

function FruitEmoji({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label={name}
      style={{ fontSize: size, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {fruitEmoji(name)}
    </span>
  );
}

const money = (value: number) =>
  `M ${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatDate = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

function describeItems(items: { quantity: number; packaging_size: PackagingSize; fruit_name: string }[]) {
  if (items.length === 0) return "No items";
  const first = items[0];
  const text = `${first.quantity} × ${sizeLabel(first.packaging_size)} ${first.fruit_name}`;
  return items.length > 1 ? `${text} +${items.length - 1} more` : text;
}

function buildTransactions(sales: Sale[], purchases: Purchase[]): Txn[] {
  const fromSales = sales.map<Txn>((s) => ({
    key: `S${s.sale_id}`,
    id: `SL-${String(s.sale_id).padStart(4, "0")}`,
    type: "Sale",
    party: s.vendor_name,
    summary: describeItems(s.items),
    amount: s.total_amount,
    boxes: s.items.reduce((sum, i) => sum + i.quantity, 0),
    status:
      s.payment_status === "PAID"
        ? "Paid"
        : s.payment_status === "PARTIALLY_PAID"
          ? "Partially paid"
          : "Unpaid",
    tone: s.payment_status === "PAID" ? "green" : s.payment_status === "UNPAID" ? "red" : "amber",
    date: s.sale_date,
    method: s.payment_method,
    fruits: s.items.map((i) => i.fruit_name),
  }));
  const fromPurchases = purchases.map<Txn>((p) => ({
    key: `P${p.purchase_id}`,
    id: `PO-${String(p.purchase_id).padStart(4, "0")}`,
    type: "Purchase",
    party: p.supplier_name,
    summary: describeItems(p.items),
    amount: p.total_amount,
    boxes: p.items.reduce((sum, i) => sum + i.quantity, 0),
    status: "Received",
    tone: "green",
    date: p.purchase_date,
    method: "",
    fruits: p.items.map((i) => i.fruit_name),
  }));
  return [...fromSales, ...fromPurchases].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}

function buildInventory(stock: StockRow[], low: LowStock): FruitStock[] {
  const byFruit = new Map<number, FruitStock>();
  for (const row of stock) {
    let fruit = byFruit.get(row.fruit_id);
    if (!fruit) {
      fruit = {
        id: row.fruit_id,
        name: row.fruit_name,
        small: 0,
        medium: 0,
        large: 0,
        total: 0,
        color: palette[byFruit.size % palette.length],
        lowSizes: 0,
      };
      byFruit.set(row.fruit_id, fruit);
    }
    if (row.packaging_size === "SMALL") fruit.small = row.available_quantity;
    if (row.packaging_size === "MEDIUM") fruit.medium = row.available_quantity;
    if (row.packaging_size === "LARGE") fruit.large = row.available_quantity;
    fruit.total += row.available_quantity;
  }
  for (const row of low.rows) {
    const fruit = byFruit.get(row.fruit_id);
    if (fruit) fruit.lowSizes += 1;
  }
  return [...byFruit.values()];
}

// ---------- Google Maps (no API key needed) ----------
const FARM_LOCATION = (import.meta.env.VITE_FARM_LOCATION as string | undefined) || "Maseru, Lesotho";
const withCountry = (text: string, country: string) =>
  text.toLowerCase().includes(country.toLowerCase()) ? text : `${text}, ${country}`;
const supplierPlace = (s: Supplier) =>
  withCountry([s.address, s.province].filter(Boolean).join(", "), "South Africa");
const vendorPlace = (v: Vendor) => withCountry(v.location, "Lesotho");
const mapsEmbedUrl = (place: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
const mapsSearchUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
const mapsDirectionsUrl = (place: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(FARM_LOCATION)}&destination=${encodeURIComponent(place)}`;

// ---------- Filters ----------
function inRange(date: string, from: string, to: string) {
  const d = date.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

function FilterBar({
  count,
  noun,
  active,
  onClear,
  children,
}: {
  count: number;
  noun: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section className="filter-bar" aria-label="Filters">
      <div className="filter-title">
        <SlidersHorizontal size={16} /> Filters
      </div>
      <div className="filter-fields">{children}</div>
      <div className="filter-end">
        <span className="filter-count" aria-live="polite">
          {count} {noun}
          {count === 1 ? "" : "s"}
        </span>
        <button type="button" className="filter-clear" onClick={onClear} disabled={!active}>
          <X size={14} /> Clear filters
        </button>
      </div>
    </section>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  return (
    <>
      <label className="filter-field">
        <span>From</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
      </label>
      <label className="filter-field">
        <span>To</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </label>
    </>
  );
}

function MapLinks({ place }: { place: string }) {
  return (
    <div className="map-links">
      <a href={mapsSearchUrl(place)} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={14} /> Open in Google Maps
      </a>
      <a href={mapsDirectionsUrl(place)} target="_blank" rel="noopener noreferrer">
        <Navigation size={14} /> Directions
      </a>
    </div>
  );
}

function MapPanel({ place, title }: { place: string | null; title: string }) {
  return (
    <aside className="map-panel" aria-label="Map">
      {place ? (
        <>
          <div className="map-head">
            <MapPin size={16} />
            <div>
              <strong>{title}</strong>
              <span>{place}</span>
            </div>
          </div>
          <iframe
            key={place}
            title={`Google Map: ${title}`}
            src={mapsEmbedUrl(place)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <MapLinks place={place} />
        </>
      ) : (
        <div className="empty">Select an entry to see it on the map.</div>
      )}
    </aside>
  );
}

function PartyLink({ item, suppliers, vendors }: { item: Txn; suppliers: Supplier[]; vendors: Vendor[] }) {
  const place =
    item.type === "Sale"
      ? (() => {
          const v = vendors.find((x) => x.vendor_name === item.party);
          return v ? vendorPlace(v) : null;
        })()
      : (() => {
          const sp = suppliers.find((x) => x.business_name === item.party);
          return sp ? supplierPlace(sp) : null;
        })();
  return (
    <>
      <strong>{item.party}</strong>
      {place && (
        <a
          className="pin-link"
          href={mapsSearchUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Show ${item.party} on Google Maps`}
          aria-label={`Show ${item.party} on Google Maps`}
        >
          <MapPin size={14} />
        </a>
      )}
    </>
  );
}

function Status({ value, tone }: { value: string; tone: Tone }) {
  return (
    <span className={`status ${tone}`}>
      <i />
      {value}
    </span>
  );
}

function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [transactionModal, setTransactionModal] = useState<"Sale" | "Purchase" | null>(null);
  const [entityModal, setEntityModal] = useState<EntityKind | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [suppliers, vendors, fruits, stock, sales, purchases, low] = await Promise.all([
        api.suppliers(),
        api.vendors(),
        api.fruits(),
        api.stock(),
        api.sales(),
        api.purchases(),
        api.lowStock(),
      ]);
      setData({ suppliers, vendors, fruits, stock, sales, purchases, low });
      setLoadError("");
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3600);
    return () => clearTimeout(timer);
  }, [notice]);

  const navigate = (next: Page) => {
    setPage(next);
    setMobileNav(false);
    setQuery("");
  };

  const saved = async (message: string) => {
    setTransactionModal(null);
    setEntityModal(null);
    setNotice(message);
    await refresh();
  };

  const transactions = useMemo(
    () => (data ? buildTransactions(data.sales, data.purchases) : []),
    [data],
  );
  const inventory = useMemo(() => (data ? buildInventory(data.stock, data.low) : []), [data]);
  const owing = data ? data.vendors.filter((v) => v.outstanding_balance > 0) : [];

  const addAction =
    page === "Sales"
      ? { label: "Record sale", run: () => setTransactionModal("Sale") }
      : page === "Purchases"
        ? { label: "Record purchase", run: () => setTransactionModal("Purchase") }
        : page === "Suppliers"
          ? { label: "Add supplier", run: () => setEntityModal("supplier") }
          : page === "Vendors"
            ? { label: "Add vendor", run: () => setEntityModal("vendor") }
            : page === "Inventory"
              ? { label: "Add fruit", run: () => setEntityModal("fruit") }
              : { label: "New sale", run: () => setTransactionModal("Sale") };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={21} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Batloung</strong>
            <span>FARM DISTRIBUTION</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <nav>
          <p className="nav-label">WORKSPACE</p>
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={page === label ? "active" : ""}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Inventory" && data && data.low.rows.length > 0 && (
                <em>{data.low.rows.length}</em>
              )}
            </button>
          ))}
          <p className="nav-label lower">MANAGEMENT</p>
          <button className={page === "Reports" ? "active" : ""} onClick={() => navigate("Reports")}>
            <ClipboardList size={19} />
            <span>Reports</span>
          </button>
        </nav>
        <div className="sidebar-card">
          <div className="sidebar-card-icon">
            <CircleDollarSign size={20} />
          </div>
          <strong>Outstanding payments</strong>
          <span>
            {!data
              ? "Loading balances…"
              : owing.length === 0
                ? "No vendor balances are due"
                : `${owing.length} vendor${owing.length === 1 ? " has" : "s have"} balances due`}
          </span>
          <button onClick={() => navigate("Vendors")}>
            Review balances <ArrowRight size={14} />
          </button>
        </div>
        <div className="profile">
          <div className="avatar">BF</div>
          <div>
            <strong>Batloung Farm</strong>
            <span>Administrator</span>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}

      <main>
        <header>
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="header-title">
            <span>
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <h1>{page === "Overview" ? "Farm overview" : page}</h1>
          </div>
          <div className="header-actions">
            {page !== "Overview" && page !== "Reports" && (
              <label className="search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${page.toLowerCase()}...`}
                />
              </label>
            )}
            <button className="primary-button" onClick={addAction.run}>
              <Plus size={18} /> {addAction.label}
            </button>
          </div>
        </header>

        <div className="content">
          {notice && (
            <div className="toast" role="status">
              <Leaf size={18} />
              {notice}
            </div>
          )}
          {loadError && (
            <div className="error-banner" role="alert">
              <TriangleAlert size={20} />
              <p>
                <strong>Could not load farm data</strong>
                <span>{loadError}</span>
              </p>
              <button className="secondary-button" onClick={() => void refresh()}>
                <RefreshCw size={15} /> Try again
              </button>
            </div>
          )}
          {!data && !loadError && <div className="empty">Loading farm data…</div>}
          {data && page === "Overview" && (
            <Overview
              data={data}
              inventory={inventory}
              transactions={transactions}
              owingTotal={owing.reduce((sum, v) => sum + v.outstanding_balance, 0)}
              owingCount={owing.length}
              navigate={navigate}
            />
          )}
          {data && page === "Inventory" && (
            <InventoryPage inventory={inventory} threshold={data.low.threshold} query={query} />
          )}
          {data && (page === "Sales" || page === "Purchases") && (
            <TransactionsPage
              type={page === "Sales" ? "Sale" : "Purchase"}
              transactions={transactions}
              query={query}
              suppliers={data.suppliers}
              vendors={data.vendors}
              fruitNames={data.fruits.map((f) => f.fruit_name)}
            />
          )}
          {data && page === "Suppliers" && <SuppliersPage suppliers={data.suppliers} query={query} />}
          {data && page === "Vendors" && <VendorsPage vendors={data.vendors} query={query} />}
          {data && page === "Reports" && <ReportsPage data={data} />}
        </div>
      </main>

      {data && transactionModal && (
        <TransactionModal
          data={data}
          initialType={transactionModal}
          onClose={() => setTransactionModal(null)}
          onSaved={saved}
        />
      )}
      {entityModal && (
        <EntityModal kind={entityModal} onClose={() => setEntityModal(null)} onSaved={saved} />
      )}
    </div>
  );
}

function Overview({
  data,
  inventory,
  transactions,
  owingTotal,
  owingCount,
  navigate,
}: {
  data: Data;
  inventory: FruitStock[];
  transactions: Txn[];
  owingTotal: number;
  owingCount: number;
  navigate: (page: Page) => void;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [fruitFilter, setFruitFilter] = useState("all");
  const [activity, setActivity] = useState("all");

  const today = new Date();
  const startOf = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    return ymd(d);
  };
  const periodStart =
    period === "7" ? startOf(7) : period === "30" ? startOf(30) : period === "month" ? `${ymd(today).slice(0, 7)}-01` : "";
  const periodLabel =
    period === "7" ? "last 7 days" : period === "30" ? "last 30 days" : period === "month" ? "this month" : "all time";

  const visibleInventory = inventory.filter((f) => fruitFilter === "all" || String(f.id) === fruitFilter);
  const totalBoxes = visibleInventory.reduce((sum, f) => sum + f.total, 0);
  const periodSales = data.sales.filter((s) => inRange(s.sale_date, periodStart, ymd(today)));
  const monthSales = periodSales;
  const monthRevenue = periodSales.reduce((sum, s) => sum + s.total_amount, 0);

  const barCount = period === "30" ? 30 : period === "month" ? Math.max(today.getDate(), 1) : 7;
  const days =
    period === "all"
      ? Array.from({ length: 6 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
          const key = ymd(d).slice(0, 7);
          return {
            label: d.toLocaleDateString("en-GB", { month: "short" }),
            total: data.sales.filter((x) => x.sale_date.startsWith(key)).reduce((sum, x) => sum + x.total_amount, 0),
          };
        })
      : Array.from({ length: barCount }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (barCount - 1 - i));
          const key = ymd(d);
          return {
            label: barCount > 7 ? String(d.getDate()) : d.toLocaleDateString("en-GB", { weekday: "short" }),
            total: data.sales.filter((x) => x.sale_date === key).reduce((sum, x) => sum + x.total_amount, 0),
          };
        });
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const maxDay = Math.max(...days.map((d) => d.total), 1);
  const recent = transactions
    .filter((t) => inRange(t.date, periodStart, ymd(today)))
    .filter((t) => activity === "all" || t.type === activity)
    .filter((t) => fruitFilter === "all" || t.fruits.includes(data.fruits.find((f) => String(f.fruit_id) === fruitFilter)?.fruit_name ?? ""));
  const overviewActive = period !== "month" || fruitFilter !== "all" || activity !== "all";

  return (
    <>
      <FilterBar
        count={recent.length}
        noun="transaction"
        active={overviewActive}
        onClear={() => {
          setPeriod("month");
          setFruitFilter("all");
          setActivity("all");
        }}
      >
        <SelectFilter
          label="Period"
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "month", label: "This month" },
            { value: "all", label: "All time" },
          ]}
        />
        <SelectFilter
          label="Fruit"
          value={fruitFilter}
          onChange={setFruitFilter}
          options={[
            { value: "all", label: "All fruit" },
            ...inventory.map((f) => ({ value: String(f.id), label: f.name })),
          ]}
        />
        <SelectFilter
          label="Activity"
          value={activity}
          onChange={setActivity}
          options={[
            { value: "all", label: "Sales & purchases" },
            { value: "Sale", label: "Sales only" },
            { value: "Purchase", label: "Purchases only" },
          ]}
        />
      </FilterBar>
      <section className="hero">
        <img src={heroImage} alt="A colourful assortment of fresh fruit and vegetables" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-kicker">
            <i /> {data.low.rows.length === 0 ? "STOCK LEVELS ARE HEALTHY" : "STOCK NEEDS ATTENTION"}
          </span>
          <h2>
            Fresh produce,
            <br />
            always moving.
          </h2>
          <p>Track every box from trusted growers to local vendors across Lesotho.</p>
          <button onClick={() => navigate("Inventory")}>
            View stock levels <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-stat">
          <span>Boxes in stock</span>
          <strong>{totalBoxes.toLocaleString("en-US")}</strong>
          <em>
            <Boxes size={14} /> &nbsp;{inventory.length} fruit{inventory.length === 1 ? "" : "s"}
          </em>
        </div>
      </section>

      <section className="metrics-grid">
        <Metric
          icon={Boxes}
          label="Total stock"
          value={`${totalBoxes.toLocaleString("en-US")} boxes`}
          detail={
            data.low.rows.length === 0
              ? "No low-stock items"
              : `${data.low.rows.length} low-stock item${data.low.rows.length === 1 ? "" : "s"}`
          }
          tone={data.low.rows.length === 0 ? "green" : "red"}
        />
        <Metric
          icon={ShoppingCart}
          label={`Sales · ${periodLabel}`}
          value={money(monthRevenue)}
          detail={`${monthSales.length} sale${monthSales.length === 1 ? "" : "s"}`}
          tone="orange"
        />
        <Metric
          icon={UsersRound}
          label="Vendors"
          value={String(data.vendors.length)}
          detail="Registered accounts"
          tone="purple"
        />
        <Metric
          icon={WalletCards}
          label="Outstanding"
          value={money(owingTotal)}
          detail={`${owingCount} vendor account${owingCount === 1 ? "" : "s"}`}
          tone={owingTotal > 0 ? "red" : "green"}
        />
      </section>

      <div className="overview-grid">
        <section className="panel stock-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">INVENTORY</span>
              <h3>Stock overview</h3>
            </div>
            <button onClick={() => navigate("Inventory")}>
              View inventory <ArrowRight size={15} />
            </button>
          </div>
          <div className="stock-list">
            {visibleInventory.length === 0 && <div className="empty">No fruit has been added yet.</div>}
            {visibleInventory.map((fruit) => (
              <div className="stock-row" key={fruit.id}>
                <div className="fruit-dot" style={{ "--fruit": fruit.color } as CSSProperties}>
                  <FruitEmoji name={fruit.name} size={22} />
                </div>
                <strong>{fruit.name}</strong>
                <div className="mini-bar">
                  <i style={{ width: `${Math.min(fruit.total, 100)}%`, background: fruit.color }} />
                </div>
                <div className="sizes">
                  <span>
                    S <b>{fruit.small}</b>
                  </span>
                  <span>
                    M <b>{fruit.medium}</b>
                  </span>
                  <span>
                    L <b>{fruit.large}</b>
                  </span>
                </div>
                <b>{fruit.total}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">PERFORMANCE</span>
              <h3>Sales revenue</h3>
            </div>
            <span className="period-label">{periodLabel}</span>
          </div>
          <div className="chart-summary">
            <strong>{money(weekTotal)}</strong>
            <span>
              <ArrowUpRight size={14} /> {periodLabel}
            </span>
          </div>
          <div className="chart">
            {days.map((day, index) => (
              <div key={index} title={`${day.label}: ${money(day.total)}`}>
                <i style={{ height: `${Math.max((day.total / maxDay) * 100, day.total > 0 ? 4 : 0)}%` }} />
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel transactions-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">ACTIVITY</span>
            <h3>Recent transactions</h3>
          </div>
          <button onClick={() => navigate("Sales")}>
            View all <ArrowRight size={15} />
          </button>
        </div>
        <TransactionTable items={recent.slice(0, 5)} suppliers={data.suppliers} vendors={data.vendors} />
      </section>
    </>
  );
}

function Metric({
  icon: Icon,
  iconNode,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Boxes;
  iconNode?: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}>
        {iconNode ?? <Icon size={20} />}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em className={tone === "red" ? "down" : ""}>{detail}</em>
      </div>
    </div>
  );
}

function InventoryPage({
  inventory,
  threshold,
  query,
}: {
  inventory: FruitStock[];
  threshold: number;
  query: string;
}) {
  const [status, setStatus] = useState("all");
  const [size, setSize] = useState("all");
  const [fruit, setFruit] = useState("all");
  const [sort, setSort] = useState("name");
  const sizeKey = (item: FruitStock) =>
    size === "SMALL" ? item.small : size === "MEDIUM" ? item.medium : size === "LARGE" ? item.large : item.total;
  const filtered = inventory
    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .filter((item) => fruit === "all" || String(item.id) === fruit)
    .filter((item) => status === "all" || (status === "low" ? item.lowSizes > 0 : item.lowSizes === 0))
    .filter((item) => size === "all" || status !== "low" || sizeKey(item) < threshold)
    .sort((a, b) =>
      sort === "stock-asc" ? sizeKey(a) - sizeKey(b) : sort === "stock-desc" ? sizeKey(b) - sizeKey(a) : a.name.localeCompare(b.name),
    );
  const invActive = status !== "all" || size !== "all" || fruit !== "all" || sort !== "name";
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">WAREHOUSE</span>
          <h2>Packaging-specific stock</h2>
          <p>Monitor every fruit across small, medium, and large boxes.</p>
        </div>
      </div>
      <FilterBar
        count={filtered.length}
        noun="fruit"
        active={invActive}
        onClear={() => {
          setStatus("all");
          setSize("all");
          setFruit("all");
          setSort("name");
        }}
      >
        <SelectFilter
          label="Fruit"
          value={fruit}
          onChange={setFruit}
          options={[{ value: "all", label: "All fruit" }, ...inventory.map((f) => ({ value: String(f.id), label: f.name }))]}
        />
        <SelectFilter
          label="Stock status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "healthy", label: "Healthy" },
            { value: "low", label: "Low stock" },
          ]}
        />
        <SelectFilter
          label="Box size"
          value={size}
          onChange={setSize}
          options={[
            { value: "all", label: "All sizes" },
            ...SIZES.map((x) => ({ value: x, label: sizeLabel(x) })),
          ]}
        />
        <SelectFilter
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "name", label: "Name (A–Z)" },
            { value: "stock-asc", label: "Stock: low to high" },
            { value: "stock-desc", label: "Stock: high to low" },
          ]}
        />
      </FilterBar>
      {filtered.length === 0 && <div className="empty">No matching fruit found.</div>}
      <div className="inventory-cards">
        {filtered.map((fruit) => (
          <article className="inventory-card" key={fruit.id}>
            <div className="inventory-top">
              <div className="fruit-dot large" style={{ "--fruit": fruit.color } as CSSProperties}>
                <FruitEmoji name={fruit.name} size={30} />
              </div>
              <span className={fruit.lowSizes > 0 ? "low-pill" : "ok-pill"}>
                {fruit.lowSizes > 0 ? "Low stock" : "Healthy"}
              </span>
            </div>
            <h3>{fruit.name}</h3>
            <p>{fruit.total} boxes available</p>
            <div className="package-sizes">
              <div>
                <span>SMALL</span>
                <strong>{fruit.small}</strong>
                <em>boxes</em>
              </div>
              <div>
                <span>MEDIUM</span>
                <strong>{fruit.medium}</strong>
                <em>boxes</em>
              </div>
              <div>
                <span>LARGE</span>
                <strong>{fruit.large}</strong>
                <em>boxes</em>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="info-banner">
        <div>
          <Boxes size={23} />
        </div>
        <p>
          <strong>Low-stock rule is active.</strong>
          <span>
            A fruit is flagged whenever the balance of any package size falls below {threshold}{" "}
            boxes.
          </span>
        </p>
      </div>
    </>
  );
}

function TransactionsPage({
  type,
  transactions,
  query,
  suppliers,
  vendors,
  fruitNames,
}: {
  type: "Sale" | "Purchase";
  transactions: Txn[];
  query: string;
  suppliers: Supplier[];
  vendors: Vendor[];
  fruitNames: string[];
}) {
  const [party, setParty] = useState("all");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [fruit, setFruit] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const base = useMemo(() => transactions.filter((item) => item.type === type), [transactions, type]);
  const parties = useMemo(() => [...new Set(base.map((t) => t.party))].sort(), [base]);
  const items = useMemo(
    () =>
      base
        .filter(
          (item) =>
            `${item.party} ${item.summary} ${item.id}`.toLowerCase().includes(query.toLowerCase()) &&
            (party === "all" || item.party === party) &&
            (status === "all" || item.status === status) &&
            (method === "all" || item.method === method) &&
            (fruit === "all" || item.fruits.includes(fruit)) &&
            inRange(item.date, from, to),
        )
        .sort((a, b) =>
          sort === "oldest"
            ? a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
            : sort === "highest"
              ? b.amount - a.amount
              : sort === "lowest"
                ? a.amount - b.amount
                : 0,
        ),
    [base, query, party, status, method, fruit, from, to, sort],
  );
  const txActive = party !== "all" || status !== "all" || method !== "all" || fruit !== "all" || from !== "" || to !== "" || sort !== "newest";
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">{type === "Sale" ? "VENDOR ORDERS" : "INBOUND STOCK"}</span>
          <h2>{type === "Sale" ? "Sales management" : "Purchase management"}</h2>
          <p>
            {type === "Sale"
              ? "Track orders, payment status, and vendor balances."
              : "Record supplier purchases and automatically increase stock."}
          </p>
        </div>
      </div>
      <FilterBar
        count={items.length}
        noun={type.toLowerCase()}
        active={txActive}
        onClear={() => {
          setParty("all");
          setStatus("all");
          setMethod("all");
          setFruit("all");
          setFrom("");
          setTo("");
          setSort("newest");
        }}
      >
        <SelectFilter
          label={type === "Sale" ? "Vendor" : "Supplier"}
          value={party}
          onChange={setParty}
          options={[{ value: "all", label: type === "Sale" ? "All vendors" : "All suppliers" }, ...parties.map((p) => ({ value: p, label: p }))]}
        />
        {type === "Sale" && (
          <>
            <SelectFilter
              label="Payment status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Any status" },
                { value: "Paid", label: "Paid" },
                { value: "Partially paid", label: "Partially paid" },
                { value: "Unpaid", label: "Unpaid" },
              ]}
            />
            <SelectFilter
              label="Payment method"
              value={method}
              onChange={setMethod}
              options={[
                { value: "all", label: "Any method" },
                { value: "CASH", label: "Cash" },
                { value: "MOBILE_MONEY", label: "Mobile money" },
                { value: "CREDIT", label: "Credit" },
              ]}
            />
          </>
        )}
        <SelectFilter
          label="Fruit"
          value={fruit}
          onChange={setFruit}
          options={[{ value: "all", label: "All fruit" }, ...fruitNames.map((n) => ({ value: n, label: n }))]}
        />
        <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <SelectFilter
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "highest", label: "Highest amount" },
            { value: "lowest", label: "Lowest amount" },
          ]}
        />
      </FilterBar>
      <section className="metrics-grid compact">
        <Metric
          icon={type === "Sale" ? ShoppingCart : PackagePlus}
          label={`Total ${type.toLowerCase()}s`}
          value={String(items.length)}
          detail={txActive || query ? "Matching filters" : "All records"}
          tone="green"
        />
        <Metric
          icon={CircleDollarSign}
          label="Total value"
          value={money(total)}
          detail={txActive || query ? "Matching filters" : "All records"}
          tone="orange"
        />
        <Metric
          icon={Boxes}
          label="Boxes moved"
          value={`${items.reduce((s, i) => s + i.boxes, 0)} boxes`}
          detail="Across all sizes"
          tone="purple"
        />
      </section>
      <section className="panel directory-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">ALL RECORDS</span>
            <h3>{type}s</h3>
          </div>
        </div>
        <TransactionTable items={items} suppliers={suppliers} vendors={vendors} />
      </section>
    </>
  );
}

function TransactionTable({ items, suppliers, vendors }: { items: Txn[]; suppliers: Supplier[]; vendors: Vendor[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>REFERENCE</th>
            <th>VENDOR / SUPPLIER</th>
            <th>ITEM</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
            <th>DATE</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td>
                <b>{item.id}</b>
                <small>{item.type}</small>
              </td>
              <td>
                <PartyLink item={item} suppliers={suppliers} vendors={vendors} />
              </td>
              <td>{item.summary}</td>
              <td>
                <b>{money(item.amount)}</b>
              </td>
              <td>
                <Status value={item.status} tone={item.tone} />
              </td>
              <td>{formatDate(item.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <div className="empty">No matching records found.</div>}
    </div>
  );
}

function SuppliersPage({ suppliers, query }: { suppliers: Supplier[]; query: string }) {
  const [province, setProvince] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const provinces = useMemo(() => [...new Set(suppliers.map((s) => s.province))].sort(), [suppliers]);
  const filtered = suppliers
    .filter((s) => JSON.stringify(s).toLowerCase().includes(query.toLowerCase()))
    .filter((s) => province === "all" || s.province === province);
  const selected = filtered.find((s) => s.supplier_id === selectedId) ?? filtered[0] ?? null;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">SOUTH AFRICA</span>
          <h2>Supplier network</h2>
          <p>Grower partners across South Africa</p>
        </div>
      </div>
      <FilterBar count={filtered.length} noun="supplier" active={province !== "all"} onClear={() => setProvince("all")}>
        <SelectFilter
          label="Province"
          value={province}
          onChange={setProvince}
          options={[{ value: "all", label: "All provinces" }, ...provinces.map((x) => ({ value: x, label: x }))]}
        />
      </FilterBar>
      <div className="map-split">
      <section className="panel directory-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h3>
              {filtered.length} supplier{filtered.length === 1 ? "" : "s"}
            </h3>
          </div>
        </div>
        <div className="directory-grid">
          {filtered.map((s) => (
            <article
              className={`person-card selectable${selected?.supplier_id === s.supplier_id ? " selected" : ""}`}
              key={s.supplier_id}
              onClick={() => setSelectedId(s.supplier_id)}
            >
              <div className="person-avatar">
                <Truck size={21} />
              </div>
              <div className="person-main">
                <h3>{s.business_name}</h3>
                <p>{s.province}</p>
              </div>
              <dl>
                <div>
                  <dt>PHONE</dt>
                  <dd>{s.phone}</dd>
                </div>
                <div>
                  <dt>CONTACT</dt>
                  <dd>{s.contact_person}</dd>
                </div>
                <div>
                  <dt>ADDRESS</dt>
                  <dd>{s.address}</dd>
                </div>
              </dl>
              <MapLinks place={supplierPlace(s)} />
            </article>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty">No suppliers found.</div>}
      </section>
      <MapPanel place={selected ? supplierPlace(selected) : null} title={selected?.business_name ?? ""} />
      </div>
    </>
  );
}

function VendorsPage({ vendors, query }: { vendors: Vendor[]; query: string }) {
  const [balance, setBalance] = useState("all");
  const [area, setArea] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const areas = useMemo(() => [...new Set(vendors.map((v) => v.location))].sort(), [vendors]);
  const filtered = vendors
    .filter((v) => JSON.stringify(v).toLowerCase().includes(query.toLowerCase()))
    .filter((v) => balance === "all" || (balance === "owing" ? v.outstanding_balance > 0 : v.outstanding_balance <= 0))
    .filter((v) => area === "all" || v.location === area);
  const selected = filtered.find((v) => v.vendor_id === selectedId) ?? filtered[0] ?? null;
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">LESOTHO</span>
          <h2>Vendor accounts</h2>
          <p>Street vendors and small retailers in Lesotho</p>
        </div>
      </div>
      <FilterBar
        count={filtered.length}
        noun="vendor"
        active={balance !== "all" || area !== "all"}
        onClear={() => {
          setBalance("all");
          setArea("all");
        }}
      >
        <SelectFilter
          label="Location"
          value={area}
          onChange={setArea}
          options={[{ value: "all", label: "All locations" }, ...areas.map((x) => ({ value: x, label: x }))]}
        />
        <SelectFilter
          label="Balance"
          value={balance}
          onChange={setBalance}
          options={[
            { value: "all", label: "All vendors" },
            { value: "owing", label: "Owing money" },
            { value: "paid", label: "Paid in full" },
          ]}
        />
      </FilterBar>
      <div className="map-split">
      <section className="panel directory-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DIRECTORY</span>
            <h3>
              {filtered.length} vendor{filtered.length === 1 ? "" : "s"}
            </h3>
          </div>
        </div>
        <div className="directory-grid">
          {filtered.map((v) => (
            <article
              className={`person-card selectable${selected?.vendor_id === v.vendor_id ? " selected" : ""}`}
              key={v.vendor_id}
              onClick={() => setSelectedId(v.vendor_id)}
            >
              <div className="person-avatar">
                <UserRound size={21} />
              </div>
              <div className="person-main">
                <h3>{v.vendor_name}</h3>
                <p>{v.location}</p>
              </div>
              <dl>
                <div>
                  <dt>PHONE</dt>
                  <dd>{v.phone_number}</dd>
                </div>
                <div>
                  <dt>BOXES PURCHASED</dt>
                  <dd>{v.boxes_purchased}</dd>
                </div>
                <div>
                  <dt>OUTSTANDING</dt>
                  <dd className={v.outstanding_balance > 0 ? "balance" : ""}>
                    {v.outstanding_balance > 0 ? money(v.outstanding_balance) : "Paid in full"}
                  </dd>
                </div>
              </dl>
              <MapLinks place={vendorPlace(v)} />
              <button
                type="button"
                className="secondary-button"
                onClick={async (event) => {
                  event.stopPropagation();
                  if (!window.confirm(`Are you sure you want to delete ${v.vendor_name}?`)) return;
                  try {
                    await api.deleteVendor(v.vendor_id);
                    window.location.reload();
                  } catch (error) {
                    window.alert(errorMessage(error));
                  }
                }}
              >
                <Trash2 size={16} /> Delete vendor
              </button>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty">No vendors found.</div>}
      </section>
      <MapPanel place={selected ? vendorPlace(selected) : null} title={selected?.vendor_name ?? ""} />
      </div>
    </>
  );
}

function ReportsPage({ data }: { data: Data }) {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(ymd(today));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (start: string, end: string) => {
    setBusy(true);
    setError("");
    try {
      setReport(await api.report(start, end));
    } catch (e) {
      setReport(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(from, to);
    // run once when the page opens; later runs are triggered by the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owing = data.vendors
    .filter((v) => v.outstanding_balance > 0)
    .sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  const maxBoxes = Math.max(...(report?.topFruits.map((f) => f.boxes_sold) ?? [1]), 1);

  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">INSIGHTS</span>
          <h2>Reports</h2>
          <p>Sales results for a date range, plus current stock and balances.</p>
        </div>
      </div>
      <div className="preset-row" role="group" aria-label="Date presets">
        {[
          { label: "This month", range: () => [`${ymd(new Date()).slice(0, 7)}-01`, ymd(new Date())] },
          {
            label: "Last 30 days",
            range: () => {
              const d = new Date();
              d.setDate(d.getDate() - 29);
              return [ymd(d), ymd(new Date())];
            },
          },
          { label: "This year", range: () => [`${new Date().getFullYear()}-01-01`, ymd(new Date())] },
        ].map((preset) => (
          <button
            type="button"
            key={preset.label}
            className="preset-chip"
            onClick={() => {
              const [a, b] = preset.range();
              setFrom(a);
              setTo(b);
              void run(a, b);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <form
        className="report-filter"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void run(from, to);
        }}
      >
        <label>
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? "Loading…" : "Run report"}
        </button>
      </form>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {report && (
        <section className="metrics-grid compact">
          <Metric
            icon={CircleDollarSign}
            label="Revenue in range"
            value={money(report.revenue.total_revenue)}
            detail={`${formatDate(from)} – ${formatDate(to)}`}
            tone="orange"
          />
          <Metric
            icon={Store}
            label="Top vendor"
            value={report.topVendor ? report.topVendor.vendor_name : "No sales"}
            detail={report.topVendor ? `${report.topVendor.boxes_purchased} boxes` : "In this range"}
            tone="purple"
          />
          <Metric
            icon={Boxes}
            iconNode={<FruitEmoji name={report.topFruits[0]?.fruit_name ?? "fruit"} size={22} />}
            label="Best-selling fruit"
            value={report.topFruits[0] ? report.topFruits[0].fruit_name : "No sales"}
            detail={report.topFruits[0] ? `${report.topFruits[0].boxes_sold} boxes` : "In this range"}
            tone="green"
          />
        </section>
      )}
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">TOP 5</span>
              <h3>Most frequently sold fruits</h3>
            </div>
          </div>
          <div className="stock-list">
            {report && report.topFruits.length === 0 && (
              <div className="empty">No sales in this date range.</div>
            )}
            {report?.topFruits.map((f, i) => (
              <div className="report-row" key={f.fruit_name}>
                <strong>{f.fruit_name}</strong>
                <div className="mini-bar">
                  <i
                    style={{
                      width: `${(f.boxes_sold / maxBoxes) * 100}%`,
                      background: palette[i % palette.length],
                    }}
                  />
                </div>
                <b>{f.boxes_sold} boxes</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">RIGHT NOW</span>
              <h3>Low stock</h3>
            </div>
          </div>
          <div className="stock-list">
            {data.low.rows.length === 0 && (
              <div className="empty">Nothing is below {data.low.threshold} boxes.</div>
            )}
            {data.low.rows.map((r) => (
              <div className="report-row" key={`${r.fruit_id}-${r.packaging_size}`}>
                <strong>{r.fruit_name}</strong>
                <span>{sizeLabel(r.packaging_size)}</span>
                <b>{r.available_quantity} left</b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel transactions-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">RIGHT NOW</span>
            <h3>Outstanding balance by vendor</h3>
          </div>
        </div>
        <div className="stock-list">
          {owing.length === 0 && <div className="empty">Every vendor is paid in full.</div>}
          {owing.map((v) => (
            <div className="report-row" key={v.vendor_id}>
              <strong>{v.vendor_name}</strong>
              <span>{v.location}</span>
              <b className="balance-text">{money(v.outstanding_balance)}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

interface LineDraft {
  fruitId: number;
  size: PackagingSize;
  quantity: string;
  price: string;
}

function TransactionModal({
  data,
  initialType,
  onClose,
  onSaved,
}: {
  data: Data;
  initialType: "Sale" | "Purchase";
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const fruits = data.fruits.filter((f) => f.status === "ACTIVE");
  const blankLine = (): LineDraft => ({
    fruitId: fruits[0]?.fruit_id ?? 0,
    size: "SMALL",
    quantity: "1",
    price: "",
  });

  const [type, setType] = useState(initialType);
  const [partyId, setPartyId] = useState(0);
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const parties =
    type === "Sale"
      ? data.vendors.map((v) => ({ id: v.vendor_id, name: v.vendor_name }))
      : data.suppliers.map((s) => ({ id: s.supplier_id, name: s.business_name }));
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  const available = (line: LineDraft) =>
    data.stock.find((s) => s.fruit_id === line.fruitId && s.packaging_size === line.size)
      ?.available_quantity ?? 0;

  const updateLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partyId) {
      setError(`Choose a ${type === "Sale" ? "vendor" : "supplier"}.`);
      return;
    }
    const payload = lines.map((l) => ({
      fruitId: l.fruitId,
      packagingSize: l.size,
      quantity: Number(l.quantity),
      price: Number(l.price),
    }));
    setBusy(true);
    setError("");
    try {
      if (type === "Sale") {
        await api.recordSale({
          vendorId: partyId,
          paymentStatus,
          paymentMethod,
          amountPaid:
            paymentStatus === "PAID" ? total : paymentStatus === "UNPAID" ? 0 : Number(amountPaid),
          lines: payload,
        });
      } else {
        await api.recordPurchase({ supplierId: partyId, lines: payload });
      }
      await onSaved(`${type} recorded successfully`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true">
      <button className="modal-scrim" onClick={onClose} aria-label="Close" />
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">STOCK MOVEMENT</span>
            <h2>Record {type.toLowerCase()}</h2>
            <p>Add one or more items. Totals are calculated automatically.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Transaction type
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as "Sale" | "Purchase");
                setPartyId(0);
              }}
            >
              <option>Sale</option>
              <option>Purchase</option>
            </select>
          </label>
          <label>
            {type === "Sale" ? "Vendor" : "Supplier"}
            <select value={partyId} onChange={(e) => setPartyId(Number(e.target.value))} required>
              <option value={0}>Select…</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="lines field-wide">
            {lines.map((line, index) => (
              <div className="line-row" key={index}>
                <label>
                  Fruit
                  <select
                    value={line.fruitId}
                    onChange={(e) => updateLine(index, { fruitId: Number(e.target.value) })}
                  >
                    {fruits.map((f) => (
                      <option key={f.fruit_id} value={f.fruit_id}>
                        {f.fruit_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Size
                  <select
                    value={line.size}
                    onChange={(e) => updateLine(index, { size: e.target.value as PackagingSize })}
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {sizeLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Boxes
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                </label>
                <label>
                  {type === "Sale" ? "Unit price (M)" : "Unit cost (M)"}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={line.price}
                    onChange={(e) => updateLine(index, { price: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Remove item"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </button>
                {type === "Sale" && <small>{available(line)} in stock</small>}
              </div>
            ))}
            <button
              type="button"
              className="secondary-button add-line"
              disabled={fruits.length === 0}
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              <Plus size={15} /> Add another item
            </button>
          </div>
          {type === "Sale" && (
            <>
              <label>
                Payment status
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                >
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially paid</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </label>
              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </label>
              {paymentStatus === "PARTIALLY_PAID" && (
                <label>
                  Amount paid (M)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </label>
              )}
            </>
          )}
        </div>
        <div className="form-note">
          <Boxes size={18} />
          {type === "Sale"
            ? "Sales are rejected if packaging-specific stock is insufficient."
            : "Purchases add the boxes to stock automatically."}
          <b className="form-total">Total {money(total)}</b>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy || fruits.length === 0}>
            {busy ? "Saving…" : "Save transaction"} <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}

function EntityModal({
  kind,
  onClose,
  onSaved,
}: {
  kind: EntityKind;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = { supplier: "Add supplier", vendor: "Add vendor", fruit: "Add fruit" };
  const names = { supplier: "Supplier", vendor: "Vendor", fruit: "Fruit" };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      if (kind === "supplier") {
        await api.createSupplier({
          businessName: field("businessName"),
          contactPerson: field("contactPerson"),
          phone: field("phone"),
          province: field("province"),
          address: field("address"),
        });
      } else if (kind === "vendor") {
        await api.createVendor({
          vendorName: field("vendorName"),
          phoneNumber: field("phoneNumber"),
          location: field("location"),
        });
      } else {
        await api.createFruit({ fruitName: field("fruitName"), description: field("description") });
      }
      await onSaved(`${names[kind]} added`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true">
      <button className="modal-scrim" onClick={onClose} aria-label="Close" />
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">NEW RECORD</span>
            <h2>{titles[kind]}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <div className="form-grid">
          {kind === "supplier" && (
            <>
              <label>
                Business name
                <input name="businessName" required />
              </label>
              <label>
                Contact person
                <input name="contactPerson" required />
              </label>
              <label>
                Phone
                <input name="phone" required placeholder="+27 71 000 0000" />
              </label>
              <label>
                Province
                <select name="province" required defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="field-wide">
                Address
                <input name="address" required />
              </label>
            </>
          )}
          {kind === "vendor" && (
            <>
              <label>
                Vendor name
                <input name="vendorName" required />
              </label>
              <label>
                Phone number
                <input name="phoneNumber" required placeholder="+266 58 000 000" />
              </label>
              <label className="field-wide">
                Location
                <input name="location" required />
              </label>
            </>
          )}
          {kind === "fruit" && (
            <>
              <label>
                Fruit name
                <input name="fruitName" required />
              </label>
              <label>
                Description
                <input name="description" />
              </label>
            </>
          )}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "Saving…" : "Save"} <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
