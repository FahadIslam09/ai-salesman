"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, EmptyState, Select, Skeleton } from "@/lib/ui";
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconMoreVertical,
  IconEdit,
  IconTrash,
  IconCopy,
  IconPackage,
  IconCheck,
  IconChevronDown,
  IconX,
  IconDownload,
  IconUpload,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@/components/Icons";

interface Product {
  id: string;
  name: string;
  keywords: string;
  imageUrl: string;
  price: number | null;
  stockStatus: string; // available, low_stock, out_of_stock, hidden
  discount: number | null;
  category: string | null;
  sku: string | null;
  variants: string[] | null;
  description: string | null;
  images: string[] | null;
  isActive: boolean;
  createdAt: string;
}

type TabKey = "all" | "published" | "draft" | "trash";

// Helper to format date into 2 lines: "May 14, 2025" and "10:30 AM"
function formatProductDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: "—", time: "" };
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: "—", time: "" };
  }
}

// Generate fallback SKU if none is stored
function getSku(p: Product): string {
  if (p.sku?.trim()) return p.sku.trim();
  const prefix = (p.category?.slice(0, 2) || p.name.slice(0, 2)).toUpperCase();
  const suffix = p.id.slice(0, 3).toUpperCase();
  return `${prefix}-${suffix}`;
}

export default function ProductsPage() {
  const router = useRouter();
  const { pageId } = usePage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Selection & bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Modals & Action Menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = () => {
    if (!pageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    api<Product[]>(`/api/products?pageId=${pageId}`)
      .then((rows) => setProducts(rows || []))
      .catch((err) => setError(err.message || "Failed to load product catalog"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [pageId]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const all = products.length;
    const published = products.filter((p) => p.stockStatus !== "hidden" && p.stockStatus !== "out_of_stock").length;
    const draft = products.filter((p) => p.stockStatus === "hidden").length;
    const trash = products.filter((p) => p.stockStatus === "out_of_stock").length;
    return { all, published, draft, trash };
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Tab filter
      if (activeTab === "published" && (p.stockStatus === "hidden" || p.stockStatus === "out_of_stock")) return false;
      if (activeTab === "draft" && p.stockStatus !== "hidden") return false;
      if (activeTab === "trash" && p.stockStatus !== "out_of_stock") return false;

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesKeywords = p.keywords?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesKeywords && !matchesCategory && !matchesSku) return false;
      }

      // 3. Category filter
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

      // 4. Stock filter
      if (stockFilter !== "all" && p.stockStatus !== stockFilter) return false;

      // 5. Status filter
      if (statusFilter === "published" && (p.stockStatus === "hidden" || p.stockStatus === "out_of_stock")) return false;
      if (statusFilter === "draft" && p.stockStatus !== "hidden") return false;
      if (statusFilter === "trash" && p.stockStatus !== "out_of_stock") return false;

      return true;
    });
  }, [products, activeTab, searchQuery, categoryFilter, stockFilter, statusFilter]);

  // Paginated products
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  // Select all visible
  const allVisibleSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedProducts.some((p) => p.id === id))
      );
    } else {
      const visibleIds = paginatedProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Apply Handler
  async function handleApplyBulk() {
    if (!bulkAction || selectedIds.length === 0) return;
    if (bulkAction === "delete" || bulkAction === "trash") {
      setBulkDeleteModalOpen(true);
      return;
    }
    setBusy(true);
    try {
      if (bulkAction === "publish" || bulkAction === "available") {
        for (const id of selectedIds) {
          await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ stockStatus: "available" }) });
        }
      } else if (bulkAction === "draft" || bulkAction === "hidden") {
        for (const id of selectedIds) {
          await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ stockStatus: "hidden" }) });
        }
      } else if (bulkAction === "out_of_stock") {
        for (const id of selectedIds) {
          await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ stockStatus: "out_of_stock" }) });
        }
      }
      setSelectedIds([]);
      setBulkAction("");
      load();
    } finally {
      setBusy(false);
    }
  }

  // Delete Single Product
  async function handleDeleteSingle(product: Product) {
    setBusy(true);
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      setDeleteModalProduct(null);
      setSelectedIds((prev) => prev.filter((id) => id !== product.id));
      load();
    } finally {
      setBusy(false);
    }
  }

  // Bulk Delete
  async function handleBulkDelete() {
    setBusy(true);
    try {
      for (const id of selectedIds) {
        await api(`/api/products/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      setBulkAction("");
      setBulkDeleteModalOpen(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  // Duplicate Product
  async function handleDuplicate(product: Product) {
    if (!pageId) return;
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          name: `${product.name} (Copy)`,
          keywords: product.keywords,
          sku: product.sku ? `${product.sku}-COPY` : null,
          imageUrl: product.imageUrl,
          images: product.images || [product.imageUrl],
          price: product.price,
          discount: product.discount,
          stockStatus: product.stockStatus,
          category: product.category,
          variants: product.variants,
          description: product.description,
        }),
      });
      load();
    } catch {}
    setActiveMenuId(null);
  }

  // Quick Stock Toggle
  async function handleQuickStock(product: Product, stockStatus: string) {
    try {
      await api(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stockStatus }),
      });
      load();
    } catch {}
    setActiveMenuId(null);
  }

  // Export to CSV
  function handleExport() {
    if (products.length === 0) return;
    const headers = ["Name", "SKU", "Price (BDT)", "Stock Status", "Category", "Variants", "Created At", "Keywords", "Image URL"];
    const rows = filteredProducts.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${getSku(p)}"`,
      p.price ?? 0,
      `"${p.stockStatus}"`,
      `"${(p.category || "").replace(/"/g, '""')}"`,
      `"${(p.variants || []).join(", ").replace(/"/g, '""')}"`,
      `"${p.createdAt}"`,
      `"${(p.keywords || "").replace(/"/g, '""')}"`,
      `"${p.imageUrl || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Import CSV / JSON
  async function handleImportFile(file: File) {
    if (!pageId) return;
    setImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      const text = await file.text();
      let importedRows: Array<{
        name: string;
        keywords: string;
        sku?: string;
        price?: number;
        stockStatus?: string;
        category?: string;
        imageUrl?: string;
      }> = [];

      if (file.name.endsWith(".json")) {
        importedRows = JSON.parse(text);
      } else {
        // Simple CSV parse
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) throw new Error("CSV file is empty or missing headers");
        const header = lines[0].toLowerCase();
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
          if (cols[0]) {
            importedRows.push({
              name: cols[0],
              sku: cols[1] || undefined,
              price: cols[2] ? Number(cols[2]) : undefined,
              stockStatus: cols[3] || "available",
              category: cols[4] || undefined,
              keywords: cols[7] || cols[0].toLowerCase(),
              imageUrl: cols[8] || "https://placehold.co/400x400/png?text=Product",
            });
          }
        }
      }

      if (importedRows.length === 0) {
        throw new Error("No valid product records found to import");
      }

      let createdCount = 0;
      for (const item of importedRows) {
        if (!item.name) continue;
        await api("/api/products", {
          method: "POST",
          body: JSON.stringify({
            pageId,
            name: item.name,
            keywords: item.keywords || item.name.toLowerCase(),
            sku: item.sku || null,
            price: item.price ? Number(item.price) : null,
            stockStatus: item.stockStatus || "available",
            category: item.category || null,
            imageUrl: item.imageUrl || "https://placehold.co/400x400/png?text=Product",
            images: [item.imageUrl || "https://placehold.co/400x400/png?text=Product"],
          }),
        });
        createdCount++;
      }

      setImportSuccess(`Successfully imported ${createdCount} products.`);
      load();
      setTimeout(() => {
        setImportModalOpen(false);
        setImportSuccess("");
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Failed to parse import file.");
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  // Stock Badge Render
  function renderStockBadge(stockStatus: string) {
    switch (stockStatus) {
      case "available":
      case "in_stock":
        return (
          <span className="inline-flex h-6 items-center rounded-full bg-[#E8F5EF] px-2.5 text-xs font-semibold text-[#087F5B]">
            In stock
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex h-6 items-center rounded-full bg-[#FFF4E5] px-2.5 text-xs font-semibold text-[#B45309]">
            Low stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex h-6 items-center rounded-full bg-[#FEECEC] px-2.5 text-xs font-semibold text-[#C24141]">
            Out of stock
          </span>
        );
      case "hidden":
        return (
          <span className="inline-flex h-6 items-center rounded-full bg-[#F0F3F2] px-2.5 text-xs font-semibold text-[#61716B]">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex h-6 items-center rounded-full bg-[#E8F5EF] px-2.5 text-xs font-semibold text-[#087F5B]">
            In stock
          </span>
        );
    }
  }

  // Product Status Badge Render
  function renderStatusBadge(stockStatus: string) {
    if (stockStatus === "hidden") {
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-[#EFF6FF] px-2.5 text-xs font-semibold text-[#3B82F6]">
          Draft
        </span>
      );
    }
    if (stockStatus === "out_of_stock") {
      return (
        <span className="inline-flex h-6 items-center rounded-full bg-[#FEECEC] px-2.5 text-xs font-semibold text-[#C24141]">
          Trash
        </span>
      );
    }
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#E8F5EF] px-2.5 text-xs font-semibold text-[#087F5B]">
        Published
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Products
          </h1>
          <p className="mt-0.5 text-sm font-normal text-[#64748B]">
            Manage your product catalog.
          </p>
        </div>

        {/* Action Buttons: Import, Export, + Add New Product */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="ghost"
            onClick={() => setImportModalOpen(true)}
            className="h-10 border-[#D9E1E7] bg-white px-4 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC]"
          >
            <IconDownload size={15} className="rotate-180 text-[#64748B]" />
            <span>Import</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleExport}
            className="h-10 border-[#D9E1E7] bg-white px-4 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC]"
          >
            <IconDownload size={15} className="text-[#64748B]" />
            <span>Export</span>
          </Button>

          <Link href="/products/new">
            <Button className="h-10 rounded-lg bg-[#087F5B] px-4.5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D] active:bg-[#05573D]">
              <IconPlus size={16} />
              <span>Add New Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Main Product Management Surface Container */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {/* Status Navigation Tabs */}
        <div className="no-scrollbar flex items-center gap-6 overflow-x-auto border-b border-[#E5E7EB] px-5">
          {[
            { key: "all", label: "All", count: tabCounts.all },
            { key: "published", label: "Published", count: tabCounts.published },
            { key: "draft", label: "Draft", count: tabCounts.draft },
            { key: "trash", label: "Trash", count: tabCounts.trash },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as TabKey);
                  setCurrentPage(1);
                }}
                className={`relative flex shrink-0 items-center gap-1.5 py-3.5 text-sm transition-colors ${
                  active
                    ? "font-semibold text-[#087F5B]"
                    : "font-medium text-[#64748B] hover:text-[#172033]"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-xs text-[#98A2B3]">({tab.count})</span>
                {active && (
                  <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#087F5B]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar (Desktop & Tablet) */}
        <div className="border-b border-[#E5E7EB] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Toolbar Left: Bulk actions + Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Bulk actions dropdown */}
              <div className="flex items-center gap-1.5">
                <Select
                  sizeVariant="sm"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  wrapperClassName="w-auto min-w-[140px]"
                >
                  <option value="">Bulk actions</option>
                  <option value="publish">Mark Published / In Stock</option>
                  <option value="draft">Move to Draft</option>
                  <option value="out_of_stock">Mark Out of Stock</option>
                  <option value="delete">Delete permanently</option>
                </Select>
                <Button
                  variant="ghost"
                  disabled={!bulkAction || selectedIds.length === 0 || busy}
                  onClick={handleApplyBulk}
                  className="h-8.5 border-[#DCE3E8] bg-white px-3 text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                >
                  Apply
                </Button>
              </div>

              {/* Desktop Filters: Category, Stock, Status */}
              <div className="hidden items-center gap-2 sm:flex">
                {/* Category Select */}
                <Select
                  sizeVariant="sm"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  wrapperClassName="w-auto min-w-[145px]"
                >
                  <option value="all">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>

                {/* Stock Select */}
                <Select
                  sizeVariant="sm"
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  wrapperClassName="w-auto min-w-[140px]"
                >
                  <option value="all">Filter by stock</option>
                  <option value="available">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </Select>

                {/* Status Select */}
                <Select
                  sizeVariant="sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  wrapperClassName="w-auto min-w-[140px]"
                >
                  <option value="all">Filter by status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="trash">Trash</option>
                </Select>

                {/* Reset / Filter Button */}
                {(categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCategoryFilter("all");
                      setStockFilter("all");
                      setStatusFilter("all");
                    }}
                    className="h-10 border-[#087F5B] bg-[#E8F5EF] px-3 text-xs font-semibold text-[#087F5B] hover:bg-[#d6ece2]"
                  >
                    <IconFilter size={13} />
                    <span>Reset</span>
                  </Button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <div className="sm:hidden">
                <Button
                  variant="ghost"
                  onClick={() => setMobileFilterOpen(true)}
                  className={`h-10 border-[#DCE3E8] px-3 text-xs ${
                    categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all"
                      ? "border-[#087F5B] bg-[#E8F5EF] text-[#087F5B]"
                      : "bg-white text-[#172033]"
                  }`}
                >
                  <IconFilter size={14} />
                  <span>Filters</span>
                  {(categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all") && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#087F5B]" />
                  )}
                </Button>
              </div>
            </div>

            {/* Toolbar Right: Search input + Item count */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#DCE3E8] bg-white pr-9 pl-3 text-xs text-[#172033] placeholder:text-[#64748B] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#64748B]">
                  <IconSearch size={15} />
                </div>
              </div>
              <span className="hidden shrink-0 text-xs font-medium text-[#64748B] md:inline">
                {filteredProducts.length} items
              </span>
            </div>
          </div>
        </div>

        {/* 3. Table / Card Content */}
        {loading ? (
          <div className="divide-y divide-[#E5E7EB] p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-base font-bold text-[#101828]">Unable to load products</p>
            <p className="mt-1 text-xs text-[#64748B]">{error}</p>
            <Button onClick={load} variant="ghost" className="mt-4">
              Try again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            {searchQuery || categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all" ? (
              <EmptyState
                icon={<IconSearch size={26} className="text-[#64748B]" />}
                title="No products found"
                subtitle="Try a different search term or clear your active filters."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setStockFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<IconPackage size={30} className="text-[#087F5B]" />}
                title="No products yet"
                subtitle="Add your first product to start building your catalog."
                action={
                  <Link href="/products/new">
                    <Button className="bg-[#087F5B] text-white">
                      <IconPlus size={16} />
                      <span>Add New Product</span>
                    </Button>
                  </Link>
                }
              />
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#FAFCFB] text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B]">
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded-xs border-[#DCE3E8] text-[#087F5B] accent-[#087F5B] focus:ring-[#087F5B]"
                      />
                    </th>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">SKU</th>
                    <th className="px-4 py-3.5">Stock</th>
                    <th className="px-4 py-3.5">Price (BDT)</th>
                    <th className="px-4 py-3.5">Categories</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {paginatedProducts.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    const isMenuOpen = activeMenuId === p.id;
                    const primaryImage =
                      Array.isArray(p.images) && p.images.length > 0
                        ? p.images[0]
                        : p.imageUrl || "";
                    const sku = getSku(p);
                    const { date, time } = formatProductDate(p.createdAt);

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors hover:bg-[#F8FAFC] ${
                          isSelected ? "bg-[#E8F5EF]/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.id)}
                            className="h-4 w-4 rounded-xs border-[#DCE3E8] text-[#087F5B] accent-[#087F5B] focus:ring-[#087F5B]"
                          />
                        </td>

                        {/* Product Thumbnail & Name + Action Links */}
                        <td className="min-w-[260px] max-w-[340px] px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#98A2B3]">
                                  <IconPackage size={18} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/products/${p.id}`}
                                className="block truncate text-[14px] font-semibold text-[#172033] hover:text-[#087F5B]"
                                title={p.name}
                              >
                                {p.name}
                              </Link>
                              {/* Quick Action Options directly below title */}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium leading-none">
                                <Link
                                  href={`/products/${p.id}`}
                                  className="text-[#087F5B] hover:text-[#066B4D] hover:underline"
                                >
                                  Edit Product
                                </Link>
                                <span className="text-[#D0D5DD]">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(p)}
                                  className="text-[#475569] hover:text-[#101828] hover:underline cursor-pointer"
                                >
                                  Duplicate
                                </button>
                                <span className="text-[#D0D5DD]">•</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStock(
                                      p,
                                      p.stockStatus === "available"
                                        ? "out_of_stock"
                                        : "available"
                                    )
                                  }
                                  className="text-[#475569] hover:text-[#101828] hover:underline cursor-pointer"
                                >
                                  {p.stockStatus === "available"
                                    ? "Mark Out of Stock"
                                    : "Mark In Stock"}
                                </button>
                                <span className="text-[#D0D5DD]">•</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteModalProduct(p);
                                  }}
                                  className="text-[#DC2626] hover:text-[#B91C1C] hover:underline cursor-pointer"
                                >
                                  Delete product
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3.5 font-medium text-[#475569]">
                          {sku}
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3.5">{renderStockBadge(p.stockStatus)}</td>

                        {/* Price (BDT) */}
                        <td className="px-4 py-3.5 font-semibold text-[#172033]">
                          {fmtTaka(p.price)}
                        </td>

                        {/* Categories */}
                        <td className="px-4 py-3.5 text-[#64748B]">
                          {p.category || "—"}
                        </td>

                        {/* Date (Two lines: Date + Time) */}
                        <td className="px-4 py-3.5 leading-tight">
                          <div className="text-[13px] font-medium text-[#172033]">{date}</div>
                          <div className="text-[12px] text-[#64748B]">{time}</div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">{renderStatusBadge(p.stockStatus)}</td>

                        {/* Actions (Edit Button + 3-dot Menu) */}
                        <td className="relative px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/products/${p.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033]"
                              title="Edit product"
                            >
                              <IconEdit size={15} />
                            </Link>

                            <button
                              type="button"
                              aria-label="More actions"
                              onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033]"
                            >
                              <IconMoreVertical size={15} />
                            </button>
                          </div>

                          {/* Row Popover Menu */}
                          {isMenuOpen && (
                            <div
                              className="absolute top-11 right-4 z-30 w-44 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/products/${p.id}`}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                              >
                                <IconEdit size={14} />
                                <span>Edit Product</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(p)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                              >
                                <IconCopy size={14} />
                                <span>Duplicate</span>
                              </button>
                              <div className="my-1 border-t border-[#E5E7EB]" />
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStock(
                                    p,
                                    p.stockStatus === "available"
                                      ? "out_of_stock"
                                      : "available"
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                              >
                                <IconCheck size={14} />
                                <span>
                                  {p.stockStatus === "available"
                                    ? "Mark Out of Stock"
                                    : "Mark In Stock"}
                                </span>
                              </button>
                              <div className="my-1 border-t border-[#E5E7EB]" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteModalProduct(p);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#C24141] hover:bg-[#FEECEC]"
                              >
                                <IconTrash size={14} />
                                <span>Delete product</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Card View (< 768px) */}
            <div className="divide-y divide-[#E5E7EB] md:hidden">
              {paginatedProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isMenuOpen = activeMenuId === p.id;
                const primaryImage =
                  Array.isArray(p.images) && p.images.length > 0
                    ? p.images[0]
                    : p.imageUrl || "";
                const sku = getSku(p);

                return (
                  <div
                    key={p.id}
                    className={`p-4 transition-colors ${
                      isSelected ? "bg-[#E8F5EF]/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                        className="mt-1 h-4 w-4 rounded-xs border-[#DCE3E8] text-[#087F5B] accent-[#087F5B] focus:ring-[#087F5B]"
                      />
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]">
                        {primaryImage ? (
                          <img src={primaryImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#98A2B3]">
                            <IconPackage size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/products/${p.id}`}
                              className="block truncate text-sm font-semibold text-[#101828]"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs text-[#64748B]">{sku}</p>
                            {/* Action options directly below title */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium leading-none">
                              <Link
                                href={`/products/${p.id}`}
                                className="text-[#087F5B] hover:text-[#066B4D] hover:underline"
                              >
                                Edit Product
                              </Link>
                              <span className="text-[#D0D5DD]">•</span>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(p)}
                                className="text-[#475569] hover:text-[#101828] hover:underline cursor-pointer"
                              >
                                Duplicate
                              </button>
                              <span className="text-[#D0D5DD]">•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStock(
                                    p,
                                    p.stockStatus === "available"
                                      ? "out_of_stock"
                                      : "available"
                                  )
                                }
                                className="text-[#475569] hover:text-[#101828] hover:underline cursor-pointer"
                              >
                                {p.stockStatus === "available"
                                  ? "Mark Out of Stock"
                                  : "Mark In Stock"}
                              </button>
                              <span className="text-[#D0D5DD]">•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteModalProduct(p);
                                }}
                                className="text-[#DC2626] hover:text-[#B91C1C] hover:underline cursor-pointer"
                              >
                                Delete product
                              </button>
                            </div>
                          </div>

                          <div className="relative flex items-center">
                            <Link
                              href={`/products/${p.id}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                            >
                              <IconEdit size={14} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                            >
                              <IconMoreVertical size={14} />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute top-8 right-0 z-30 w-44 rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  href={`/products/${p.id}`}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                                >
                                  <IconEdit size={14} />
                                  <span>Edit Product</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(p)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                                >
                                  <IconCopy size={14} />
                                  <span>Duplicate</span>
                                </button>
                                <div className="my-1 border-t border-[#E5E7EB]" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteModalProduct(p);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#C24141] hover:bg-[#FEECEC]"
                                >
                                  <IconTrash size={14} />
                                  <span>Delete product</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-bold text-[#101828]">{fmtTaka(p.price)}</p>
                          <div className="flex items-center gap-1.5">
                            {renderStockBadge(p.stockStatus)}
                            {p.category && (
                              <span className="text-xs text-[#64748B]">· {p.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. Bottom Footer Toolbar & Pagination */}
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              {/* Bottom Left: Secondary Bulk actions */}
              <div className="hidden items-center gap-1.5 sm:flex">
                <Select
                  sizeVariant="sm"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  wrapperClassName="w-auto min-w-[140px]"
                >
                  <option value="">Bulk actions</option>
                  <option value="publish">Mark Published</option>
                  <option value="draft">Move to Draft</option>
                  <option value="out_of_stock">Mark Out of Stock</option>
                  <option value="delete">Delete permanently</option>
                </Select>
                <Button
                  variant="ghost"
                  disabled={!bulkAction || selectedIds.length === 0 || busy}
                  onClick={handleApplyBulk}
                  className="h-8.5 border-[#DCE3E8] bg-white px-3 text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC]"
                >
                  Apply
                </Button>
              </div>

              {/* Bottom Right: Compact Pagination matching Screenshot */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <span className="text-xs font-medium text-[#64748B]">
                  {filteredProducts.length === 0
                    ? "0 items"
                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                        currentPage * pageSize,
                        filteredProducts.length
                      )} of ${filteredProducts.length}`}
                </span>

                <div className="flex items-center gap-1">
                  {/* First page */}
                  <button
                    type="button"
                    title="First page"
                    aria-label="First page"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3E8] text-[#64748B] transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    <IconChevronsLeft size={14} />
                  </button>

                  {/* Previous page */}
                  <button
                    type="button"
                    title="Previous page"
                    aria-label="Previous page"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3E8] text-[#64748B] transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    ‹
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                    })
                    .map((page) => {
                      const active = page === currentPage;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[#E8F5EF] font-bold text-[#087F5B]"
                              : "border border-[#DCE3E8] bg-white text-[#172033] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                  {/* Next page */}
                  <button
                    type="button"
                    title="Next page"
                    aria-label="Next page"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3E8] text-[#64748B] transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    ›
                  </button>

                  {/* Last page */}
                  <button
                    type="button"
                    title="Last page"
                    aria-label="Last page"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3E8] text-[#64748B] transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    <IconChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. Mobile Filter Drawer / Bottom Modal */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-xs"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101828]">Filter Products</h3>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFilterOpen(false)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Category
                </label>
                <Select
                  sizeVariant="md"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Stock Status
                </label>
                <Select
                  sizeVariant="md"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="all">All stock statuses</option>
                  <option value="available">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Product Status
                </label>
                <Select
                  sizeVariant="md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="trash">Trash</option>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCategoryFilter("all");
                  setStockFilter("all");
                  setStatusFilter("all");
                  setMobileFilterOpen(false);
                }}
                className="flex-1"
              >
                Clear all
              </Button>
              <Button
                variant="primary"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 bg-[#087F5B]"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Import Modal */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setImportModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101828]">Import Products</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setImportModalOpen(false)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <IconX size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Upload a CSV or JSON file containing product names, prices, categories, and keywords.
            </p>

            <div
              onClick={() => importFileRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#DCE3E8] bg-[#F8FAFC] p-8 text-center transition-colors hover:border-[#087F5B]"
            >
              <IconUpload size={24} className="text-[#087F5B]" />
              <p className="mt-2 text-xs font-semibold text-[#172033]">
                Click to browse or drag and drop file
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748B]">Supports CSV and JSON</p>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </div>

            {importing && (
              <p className="mt-3 text-xs font-medium text-[#087F5B] animate-pulse">
                Importing products into your catalog…
              </p>
            )}

            {importError && (
              <p className="mt-3 text-xs font-medium text-[#C24141]">{importError}</p>
            )}

            {importSuccess && (
              <p className="mt-3 text-xs font-medium text-[#087F5B]">{importSuccess}</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const sampleCsv = `Name,SKU,Price,StockStatus,Category,Variants,Description,Keywords,ImageUrl\n"Premium Oxford Shirt","SH-001",1790,"available","Shirts","M, L","Pure cotton oxford","shirt, oxford, formal","https://placehold.co/400x400/png?text=Shirt"`;
                  const link = document.createElement("a");
                  link.href = "data:text/csv;charset=utf-8," + encodeURI(sampleCsv);
                  link.download = "sample-products-template.csv";
                  link.click();
                }}
                className="text-xs font-semibold text-[#087F5B] hover:underline"
              >
                Download CSV template
              </button>
              <Button variant="ghost" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Single Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setDeleteModalProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#101828]">Delete product permanently?</h3>
            <p className="mt-2 text-xs text-[#64748B]">
              &quot;{deleteModalProduct.name}&quot; will be permanently removed from your catalog and AI assistant memory. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteModalProduct(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteSingle(deleteModalProduct)}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setBulkDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#101828]">
              Delete {selectedIds.length} products?
            </h3>
            <p className="mt-2 text-xs text-[#64748B]">
              These products will be removed permanently from your catalog. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBulkDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleBulkDelete} disabled={busy}>
                {busy ? "Deleting…" : `Delete ${selectedIds.length} products`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
