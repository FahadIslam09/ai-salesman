"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API, api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Select } from "@/lib/ui";
import {
  IconPlus,
  IconSearch,
  IconX,
  IconUpload,
  IconGripVertical,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconList,
  IconListOrdered,
  IconQuote,
  IconLink,
  IconTable,
  IconUndo,
  IconRedo,
  IconTrash,
  IconInfo,
  IconFileText,
  IconSend,
  IconChevronDown,
  IconEdit,
  IconCalendar,
  IconAlertTriangle,
} from "@/components/Icons";

interface ColorVariant {
  id: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
  images: string[];
}

const DEFAULT_CATEGORIES = [
  "Shirts",
  "Panjabi",
  "Sharee",
  "Jackets",
  "Shoes",
  "Accessories",
  "T-Shirts",
  "Pants",
];

export default function NewProductPage() {
  const router = useRouter();
  const { pageId } = usePage();

  // Basic info
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [sizes, setSizes] = useState("S, M, L, XL, XXL");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [stockStatus, setStockStatus] = useState("available");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [productInstructions, setProductInstructions] = useState("");
  const [description, setDescription] = useState("");

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariantUploadId, setActiveVariantUploadId] = useState<string | null>(null);
  const [dragOverVariantId, setDragOverVariantId] = useState<string | null>(null);

  // Variants (Colors) - manual text input
  const [variants, setVariants] = useState<ColorVariant[]>([
    {
      id: "v-1",
      color: "Black",
      price: "",
      stock: "0",
      sku: "",
      images: [],
    },
    {
      id: "v-2",
      color: "Blue",
      price: "",
      stock: "0",
      sku: "",
      images: [],
    },
  ]);

  // Sidebar Publish Status: Public, Draft, Private
  const [publishStatus, setPublishStatus] = useState<"public" | "draft" | "private">("draft");
  const [publishDate, setPublishDate] = useState(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  });

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "variant" | "image";
    id: string;
    name?: string;
  } | null>(null);

  // Categories & Tags
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Shirts"]);
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [tags, setTags] = useState<string[]>(["shirt", "formal", "cotton"]);
  const [tagInput, setTagInput] = useState("");

  // States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isSavedRef = useRef(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);

  // Form dirty state check: true if user modified fields, uploaded images, or upload is in progress
  const isDirty = useMemo(() => {
    if (uploadingImage) return true;
    if (name.trim() !== "") return true;
    if (price.trim() !== "") return true;
    if (sku.trim() !== "") return true;
    if (images.length > 0) return true;
    if (discount.trim() !== "") return true;
    if (productInstructions.trim() !== "") return true;
    if (description.trim() !== "") return true;
    if (
      variants.some(
        (v) =>
          v.images.length > 0 ||
          (v.color !== "Black" && v.color !== "Blue" && v.color.trim() !== "") ||
          v.price.trim() !== "" ||
          v.sku.trim() !== ""
      )
    )
      return true;
    return false;
  }, [uploadingImage, name, price, sku, images, discount, productInstructions, description, variants]);

  // Prevent closing tab / reloading page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Intercept in-app navigation link clicks (sidebar, header, breadcrumbs)
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty || isSavedRef.current) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        anchor.target === "_blank"
      )
        return;

      e.preventDefault();
      e.stopPropagation();
      setPendingNavigationHref(href);
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, [isDirty]);

  // Fetch existing categories from catalog
  useEffect(() => {
    if (!pageId) return;
    api<Array<{ category: string | null }>>(`/api/products?pageId=${pageId}`)
      .then((rows) => {
        const found = new Set(DEFAULT_CATEGORIES);
        rows?.forEach((r) => {
          if (r.category?.trim()) found.add(r.category.trim());
        });
        setAvailableCategories(Array.from(found));
      })
      .catch(() => {});
  }, [pageId]);

  // Upload image handler
  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFiles(files: File[], targetVariantId?: string | null) {
    setError("");

    // Strict image file filtering: accept image/* only
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Only image files (PNG, JPG, WEBP, GIF) are allowed.");
      return;
    }
    if (imageFiles.length < files.length) {
      setError("Non-image files were skipped. Only image files were uploaded.");
    }

    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const file of imageFiles) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5MB limit.`);
        }
        const dataUrl = await readAsDataUrl(file);
        const res = await fetch(`${API}/api/products/upload`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "text/plain" },
          body: dataUrl,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Upload failed");
        }
        const { url } = await res.json();
        urls.push(url);
      }

      if (targetVariantId) {
        setVariants((prev) =>
          prev.map((v) =>
            v.id === targetVariantId ? { ...v, images: [...v.images, ...urls] } : v
          )
        );
      } else {
        setImages((prev) => [...prev, ...urls]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      setActiveVariantUploadId(null);
      setDragOverVariantId(null);
    }
  }

  // Rich Text Editor Formatter
  function applyFormatting(format: string) {
    const el = descriptionRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = description.substring(start, end);
    let replacement = "";

    switch (format) {
      case "bold":
        replacement = `**${selected || "bold text"}**`;
        break;
      case "italic":
        replacement = `*${selected || "italic text"}*`;
        break;
      case "underline":
        replacement = `<u>${selected || "underlined text"}</u>`;
        break;
      case "strikethrough":
        replacement = `~~${selected || "strikethrough"}~~`;
        break;
      case "list":
        replacement = selected
          ? selected
              .split("\n")
              .map((l) => `- ${l}`)
              .join("\n")
          : "\n- Bullet item 1\n- Bullet item 2\n";
        break;
      case "list-ordered":
        replacement = selected
          ? selected
              .split("\n")
              .map((l, i) => `${i + 1}. ${l}`)
              .join("\n")
          : "\n1. Step 1\n2. Step 2\n";
        break;
      case "quote":
        replacement = `\n> ${selected || "Quote text"}\n`;
        break;
      case "link":
        replacement = `[${selected || "link text"}](https://)`;
        break;
      default:
        return;
    }

    const next = description.substring(0, start) + replacement + description.substring(end);
    setDescription(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  }

  // Variant actions
  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        color: "",
        price: "",
        stock: "0",
        sku: "",
        images: [],
      },
    ]);
  }

  function handleConfirmDeleteTarget() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "variant") {
      setVariants((prev) => prev.filter((v) => v.id !== deleteTarget.id));
    } else if (deleteTarget.type === "image") {
      setImages((prev) => prev.filter((_, idx) => String(idx) !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  function updateVariant(id: string, updates: Partial<ColorVariant>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }

  // Category toggle
  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function handleCreateCategory() {
    if (!newCategoryInput.trim()) return;
    const trimmed = newCategoryInput.trim();
    if (!availableCategories.includes(trimmed)) {
      setAvailableCategories((prev) => [...prev, trimmed]);
    }
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories((prev) => [...prev, trimmed]);
    }
    setNewCategoryInput("");
    setShowAddCategory(false);
  }

  // Tag handler
  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/,/g, "");
      if (!tags.includes(clean)) {
        setTags((prev) => [...prev, clean]);
      }
      setTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  // Validation & Save Handler
  async function handleSave(intendedStatus?: "published" | "draft") {
    setError("");
    const errors: Record<string, string> = {};

    const effectiveStatus = intendedStatus ?? (publishStatus === "public" ? "published" : "draft");

    if (!name.trim()) {
      errors.name = "Product name is required.";
    }
    if (effectiveStatus === "published" && !price) {
      errors.price = "Price is required to publish product.";
    }

    // Collect all images (main images + all variant images)
    const allCollectedImages = [
      ...images,
      ...variants.flatMap((v) => v.images),
    ].filter(Boolean);

    if (allCollectedImages.length === 0) {
      errors.images = "Upload at least one product or variant image.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please resolve the required fields marked below.");
      return;
    }

    if (!pageId) {
      setError("No Facebook Page selected. Please choose a page in the header.");
      return;
    }

    setSaving(true);
    try {
      const primaryImg = allCollectedImages[0];
      const keywordsString = Array.from(
        new Set([
          name.toLowerCase(),
          ...sizes.split(/[,/]+/).map((s) => s.trim().toLowerCase()).filter(Boolean),
          ...tags,
          ...selectedCategories.map((c) => c.toLowerCase()),
          ...variants.map((v) => v.color.toLowerCase()).filter(Boolean),
        ])
      )
        .filter(Boolean)
        .join(", ");

      const finalDiscount = discount ? Number(discount) : (
        price && compareAtPrice && Number(compareAtPrice) > Number(price)
          ? Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)
          : null
      );

      // Determine final stockStatus:
      // If saving as draft or private -> set to "hidden"
      // If publishing -> activate as "available" (or keep user's chosen low_stock/out_of_stock)
      let finalStockStatus: string;
      if (effectiveStatus === "draft" || (!intendedStatus && publishStatus === "private")) {
        finalStockStatus = "hidden";
      } else {
        finalStockStatus = stockStatus === "hidden" ? "available" : stockStatus;
      }

      // Full product description combining sizes + instructions + rich description
      const fullDescription = [
        sizes.trim() ? `Sizes: ${sizes.trim()}` : null,
        productInstructions.trim() ? `Instructions: ${productInstructions.trim()}` : null,
        description.trim() ? description.trim() : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          pageId,
          name: name.trim(),
          sku: sku.trim() || null,
          keywords: keywordsString || name.trim().toLowerCase(),
          imageUrl: primaryImg,
          images: allCollectedImages,
          price: price ? Number(price) : null,
          discount: finalDiscount,
          discountType: discount ? discountType : "percent",
          stockStatus: finalStockStatus,
          category: selectedCategories[0] || null,
          variants: variants.length > 0 ? variants : null,
          description: fullDescription || null,
        }),
      });

      isSavedRef.current = true;
      router.push("/products");
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  // Filtered category list
  const filteredCategoriesList = useMemo(() => {
    if (!categorySearch.trim()) return availableCategories;
    return availableCategories.filter((c) =>
      c.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [availableCategories, categorySearch]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* 1. Header with Breadcrumbs & Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Add New Product
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
            <Link href="/products" className="hover:text-[#087F5B]">
              Products
            </Link>
            <span>›</span>
            <span className="font-medium text-[#172033]">Add Product</span>
          </div>
        </div>

        {/* Top Right Buttons: Save Draft & Publish Product */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="h-10 border-[#D9E2E8] bg-white px-4 text-xs font-semibold text-[#172033] shadow-2xs hover:bg-[#F8FAFC]"
          >
            <IconFileText size={15} className="text-[#64748B]" />
            <span>Save Draft</span>
          </Button>

          <Button
            disabled={saving}
            onClick={() => handleSave("published")}
            className="h-10 rounded-lg bg-[#087F5B] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D] active:bg-[#05573D]"
          >
            <IconSend size={15} />
            <span>{saving ? "Publishing…" : "Publish Product"}</span>
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Main Form Grid (8 cols left, 4 cols right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Information, Images, Variants */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card A: Product Information */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-[#172033]">
              Product Information
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Basic product identity, pricing, and stock details.
            </p>

            <div className="mt-5 space-y-4">
              {/* Row 1: Product Name + SKU */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Product Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Black Formal Shirt"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none ${
                      fieldErrors.name ? "border-danger ring-1 ring-danger" : "border-[#D9E2E8]"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SH-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Price (BDT) + Compare at Price (BDT) + Max Negotiable Discount */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Price (BDT) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-[#64748B]">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (fieldErrors.price) {
                          setFieldErrors((prev) => ({ ...prev, price: "" }));
                        }
                      }}
                      className={`h-10 w-full rounded-lg border bg-white pr-3 pl-8 text-sm font-semibold text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none ${
                        fieldErrors.price ? "border-danger ring-1 ring-danger" : "border-[#D9E2E8]"
                      }`}
                    />
                  </div>
                  {fieldErrors.price && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Compare at Price (BDT)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-[#64748B]">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0.00"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white pr-3 pl-8 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Original price if on sale
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Max Negotiable Discount
                  </label>
                  <div className="flex rounded-lg border border-[#D9E2E8] bg-white shadow-2xs focus-within:border-[#087F5B]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-[#172033] placeholder:text-[#94A3B8] focus:outline-none"
                    />
                    <div className="flex items-center border-l border-[#D9E2E8] bg-[#F8FAFC] p-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType("fixed")}
                        className={`rounded px-2 py-1 text-xs font-bold transition-colors ${
                          discountType === "fixed"
                            ? "bg-[#087F5B] text-white shadow-xs"
                            : "text-[#64748B] hover:text-[#172033]"
                        }`}
                        title="Fixed Amount (৳)"
                      >
                        ৳
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`rounded px-2 py-1 text-xs font-bold transition-colors ${
                          discountType === "percent"
                            ? "bg-[#087F5B] text-white shadow-xs"
                            : "text-[#64748B] hover:text-[#172033]"
                        }`}
                        title="Percentage (%)"
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    AI sells at full price first; offers discount up to this limit
                  </p>
                </div>
              </div>

              {/* Row 3: Product Sizes / Options */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Product Sizes / Size Options
                </label>
                <input
                  type="text"
                  placeholder="e.g. S, M, L, XL, XXL or 38, 40, 42, 44 or Free Size"
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#64748B]">
                  Enter all available sizes for this product separated by commas
                </p>
              </div>

              {/* Row 4: Stock Status + Stock Quantity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Stock Status
                  </label>
                  <Select
                    sizeVariant="md"
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                  >
                    <option value="available">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </Select>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Select current stock availability
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Number of items available
                  </p>
                </div>
              </div>

              {/* Row 5: Product Instructions */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#334155]">
                    Product Instructions
                  </label>
                  <span className="text-[11px] font-medium text-[#087F5B]">
                    AI Sales Assistant Guidelines
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. Wash in cold water, dry clean only, includes free wooden hanger, non-refundable item, 1 year warranty..."
                  value={productInstructions}
                  onChange={(e) => setProductInstructions(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E2E8] bg-white p-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#64748B]">
                  Specific instructions or details for this product that the AI sales assistant should strictly follow and communicate to customers.
                </p>
              </div>

              {/* Row 6: Description with Rich Text Toolbar */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Description
                </label>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[#D9E2E8] bg-[#F8FAFC] p-1.5">
                  <Select
                    sizeVariant="sm"
                    wrapperClassName="w-auto"
                    className="!h-7 !py-0.5 text-xs"
                    onChange={(e) => {
                      if (e.target.value === "h2") {
                        const el = descriptionRef.current;
                        if (!el) return;
                        const next = `\n## Heading 2\n` + description;
                        setDescription(next);
                      }
                    }}
                  >
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                  </Select>

                  <div className="mx-1 h-4 w-[1px] bg-[#D9E2E8]" />

                  <button
                    type="button"
                    title="Bold"
                    onClick={() => applyFormatting("bold")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconBold size={14} />
                  </button>
                  <button
                    type="button"
                    title="Italic"
                    onClick={() => applyFormatting("italic")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconItalic size={14} />
                  </button>
                  <button
                    type="button"
                    title="Underline"
                    onClick={() => applyFormatting("underline")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconUnderline size={14} />
                  </button>
                  <button
                    type="button"
                    title="Strikethrough"
                    onClick={() => applyFormatting("strikethrough")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconStrikethrough size={14} />
                  </button>

                  <div className="mx-1 h-4 w-[1px] bg-[#D9E2E8]" />

                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => applyFormatting("list")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconList size={14} />
                  </button>
                  <button
                    type="button"
                    title="Numbered List"
                    onClick={() => applyFormatting("list-ordered")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconListOrdered size={14} />
                  </button>
                  <button
                    type="button"
                    title="Quote"
                    onClick={() => applyFormatting("quote")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconQuote size={14} />
                  </button>
                  <button
                    type="button"
                    title="Link"
                    onClick={() => applyFormatting("link")}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconLink size={14} />
                  </button>
                  <button
                    type="button"
                    title="Table"
                    onClick={() => {
                      const sampleTable = "\n| Feature | Detail |\n|---|---|\n| Material | 100% Cotton |\n| Fit | Slim Fit |\n";
                      setDescription((prev) => prev + sampleTable);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded hover:bg-white text-[#334155]"
                  >
                    <IconTable size={14} />
                  </button>
                </div>

                <textarea
                  ref={descriptionRef}
                  rows={5}
                  placeholder="Write detailed description about the product..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-b-lg border border-[#D9E2E8] bg-white p-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Card B: Product Images */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-[#172033]">Product Images</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Add clear images of your product. The first image will be used as the primary thumbnail. Only image files (PNG, JPG, WEBP, GIF) are accepted.
            </p>

            {/* Upload Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter((f) =>
                  f.type.startsWith("image/")
                );
                if (files.length) uploadFiles(files);
                else setError("Only image files are allowed.");
              }}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D9E2E8] bg-[#F8FAFC] p-7 text-center transition-colors hover:border-[#087F5B] hover:bg-[#E8F5EF]/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                <IconUpload size={20} />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#172033]">
                Upload images <span className="font-normal text-[#64748B]">or drag and drop here</span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748B]">PNG, JPG, WEBP up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif, image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) uploadFiles(files);
                  e.target.value = "";
                }}
              />
            </div>

            {uploadingImage && !activeVariantUploadId && (
              <p className="mt-2 text-xs font-medium text-[#087F5B] animate-pulse">
                Uploading images…
              </p>
            )}

            {/* Previews */}
            {images.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-2xs"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#101828]/80 px-1 py-0.2 text-[9px] font-bold text-white">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: "image", id: String(i) });
                      }}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-xs"
                    >
                      <IconX size={11} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-[#D9E2E8] text-[#64748B] hover:border-[#087F5B] hover:text-[#087F5B]"
                >
                  <IconPlus size={18} />
                </button>
              </div>
            )}
            {fieldErrors.images && (
              <p className="mt-2 text-xs text-danger">{fieldErrors.images}</p>
            )}
          </Card>

          {/* Card C: Variants (Color) */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">
                  Variants (Color)
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Enter color names manually and drag & drop multiple images for each color.
                </p>
              </div>
              <Button
                type="button"
                onClick={addVariant}
                className="h-8 rounded-lg bg-[#087F5B] px-3 text-xs font-semibold text-white shadow-2xs hover:bg-[#066B4D]"
              >
                <IconPlus size={14} />
                <span>Add Color</span>
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4 transition-all hover:border-[#D0D7D4]"
                >
                  {/* Desktop Variant Row */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Drag + Color Name Input */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="cursor-grab text-[#94A3B8]">
                        <IconGripVertical size={16} />
                      </div>

                      {/* Manual Color Name Input */}
                      <div className="w-full sm:w-40">
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Color Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={v.color}
                          onChange={(e) =>
                            updateVariant(v.id, { color: e.target.value })
                          }
                          placeholder="e.g. Black, Blue, Maroon"
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Middle: Price, Stock, SKU */}
                    <div className="grid flex-1 grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                      {/* Price */}
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Price (BDT)
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-[#64748B]">
                            ৳
                          </span>
                          <input
                            type="number"
                            min="0"
                            placeholder={price || "0.00"}
                            value={v.price}
                            onChange={(e) =>
                              updateVariant(v.id, { price: e.target.value })
                            }
                            className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white pr-2 pl-6 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) =>
                            updateVariant(v.id, { stock: e.target.value })
                          }
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                        />
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          SKU (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder={sku ? `${sku}-${v.color.slice(0, 3).toUpperCase()}` : "e.g. SH-001-BLK"}
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(v.id, { sku: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Right: Drag-and-Drop & Multi-Image Upload Area + Delete Variant */}
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Color Images ({v.images.length})
                        </label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverVariantId(v.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverVariantId === v.id) setDragOverVariantId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverVariantId(null);
                            const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                              f.type.startsWith("image/")
                            );
                            if (dropped.length) {
                              uploadFiles(dropped, v.id);
                            } else {
                              setError("Only image files (PNG, JPG, WEBP, GIF) are allowed.");
                            }
                          }}
                          className={`flex min-h-10 items-center gap-1.5 rounded-lg border p-1 transition-colors ${
                            dragOverVariantId === v.id
                              ? "border-[#087F5B] bg-[#E8F5EF]/50 ring-1 ring-[#087F5B]"
                              : "border-[#E5E7EB] bg-white"
                          }`}
                        >
                          {v.images.map((imgUrl, imgIdx) => (
                            <div
                              key={`${imgUrl}-${imgIdx}`}
                              className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-2xs"
                            >
                              <img
                                src={imgUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() =>
                                  updateVariant(v.id, {
                                    images: v.images.filter((_, i) => i !== imgIdx),
                                  })
                                }
                                className="absolute inset-0 flex items-center justify-center bg-danger/80 text-white opacity-0 group-hover:opacity-100"
                              >
                                <IconX size={10} />
                              </button>
                            </div>
                          ))}

                          {/* Plus Multi-Image Upload Button */}
                          <button
                            type="button"
                            title="Click or drag & drop multiple images"
                            onClick={() => {
                              setActiveVariantUploadId(v.id);
                              variantFileInputRef.current?.click();
                            }}
                            className="flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border border-dashed border-[#D9E2E8] bg-[#F8FAFC] px-2 text-[#64748B] hover:border-[#087F5B] hover:bg-[#E8F5EF]/30 hover:text-[#087F5B]"
                          >
                            <IconUpload size={13} />
                            <span className="text-[10px] font-semibold">
                              {v.images.length === 0 ? "Upload" : "+"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Delete Variant Button with Double Confirmation */}
                      <button
                        type="button"
                        aria-label="Remove variant"
                        onClick={() =>
                          setDeleteTarget({
                            type: "variant",
                            id: v.id,
                            name: v.color || "this color",
                          })
                        }
                        className="mt-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#C24141] hover:bg-[#FEECEC]"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hidden Input for variant multi-image uploading */}
            <input
              ref={variantFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif, image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length && activeVariantUploadId) {
                  uploadFiles(files, activeVariantUploadId);
                }
                e.target.value = "";
              }}
            />

            {/* Info callout note banner */}
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#DCE3E8] bg-[#F0FDF4]/60 p-3.5 text-xs text-[#065F46]">
              <IconInfo size={16} className="mt-0.5 shrink-0 text-[#087F5B]" />
              <span>
                Add different colors of this product. Drag and drop multiple photos for each color variant.
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): Publish, Categories, Tags, Summary */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card 1: Publish */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#172033]">Publish</h3>

            <div className="mt-4 space-y-3.5">
              {/* Single Unified Status Dropdown: Draft, Public, Private with glowing status dots */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Product Status
                </label>
                <Select
                  sizeVariant="md"
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value as any)}
                  options={[
                    {
                      value: "public",
                      label: (
                        <span className="flex items-center gap-2 font-medium text-[#172033]">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span>Public</span>
                        </span>
                      ),
                    },
                    {
                      value: "draft",
                      label: (
                        <span className="flex items-center gap-2 font-medium text-[#172033]">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          <span>Draft</span>
                        </span>
                      ),
                    },
                    {
                      value: "private",
                      label: (
                        <span className="flex items-center gap-2 font-medium text-[#172033]">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#64748B]" />
                          <span>Private</span>
                        </span>
                      ),
                    },
                  ]}
                />
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {publishStatus === "public" && "Visible in store and handled by AI agent"}
                  {publishStatus === "draft" && "Saved as draft, not visible to customers"}
                  {publishStatus === "private" && "Private product visible only to store admins"}
                </p>
              </div>

              {/* Publish Date */}
              <div className="border-t border-[#E5E7EB] pt-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <IconCalendar size={14} />
                    <span>{publishDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nowStr = new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });
                      setPublishDate(nowStr);
                    }}
                    className="font-semibold text-[#087F5B] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Categories */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172033]">Categories</h3>
              <button
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-xs font-semibold text-[#087F5B] hover:underline"
              >
                Add New
              </button>
            </div>

            {/* Quick Add Category Input */}
            {showAddCategory && (
              <div className="mt-3 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New category..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="h-8 flex-1 rounded-lg border border-[#D9E2E8] px-2 text-xs text-[#172033] focus:border-[#087F5B] focus:outline-none"
                />
                <Button
                  variant="primary"
                  onClick={handleCreateCategory}
                  className="h-8 px-2.5 text-xs bg-[#087F5B]"
                >
                  Create
                </Button>
              </div>
            )}

            {/* Search Categories */}
            <div className="relative mt-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white pr-7 pl-2.5 text-xs text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
              />
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#94A3B8]">
                <IconSearch size={13} />
              </div>
            </div>

            {/* Checklist */}
            <div className="no-scrollbar mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
              {filteredCategoriesList.map((cat) => {
                const checked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat)}
                      className="h-3.5 w-3.5 rounded-xs border-[#D9E2E8] text-[#087F5B] accent-[#087F5B] focus:ring-[#087F5B]"
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Card 3: Tags */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172033]">Tags</h3>
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
                    setTags((prev) => [...prev, tagInput.trim().toLowerCase()]);
                    setTagInput("");
                  }
                }}
                className="text-xs font-semibold text-[#087F5B] hover:underline"
              >
                Add New
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#64748B]">
                Press Enter to add new tag
              </p>
            </div>

            {/* Tag Pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#334155]"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => removeTag(t)}
                    className="text-[#94A3B8] hover:text-danger"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </Card>

          {/* Card 4: Product Summary */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#172033]">
              Product Summary
            </h3>
            <div className="mt-3 divide-y divide-[#E5E7EB] text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Name</span>
                <span className="max-w-[150px] truncate font-semibold text-[#172033]">
                  {name || "Untitled"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Price</span>
                <span className="font-semibold text-[#172033]">
                  {price ? fmtTaka(Number(price)) : "—"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Stock</span>
                <span className="font-semibold capitalize text-[#087F5B]">
                  {stockStatus.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Colors / Variants</span>
                <span className="font-semibold text-[#172033]">
                  {variants.length} {variants.length === 1 ? "color" : "colors"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Total Images</span>
                <span className="font-semibold text-[#172033]">
                  {images.length + variants.reduce((acc, v) => acc + v.images.length, 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Mobile Sticky Bottom Action Bar (< 768px) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[#E5E7EB] bg-white/95 p-3.5 backdrop-blur-md sm:hidden">
        <Button
          variant="ghost"
          disabled={saving}
          onClick={() => handleSave("draft")}
          className="h-10 border-[#D9E2E8] px-4 text-xs font-semibold text-[#172033]"
        >
          Save Draft
        </Button>

        <Button
          disabled={saving}
          onClick={() => handleSave("published")}
          className="h-10 bg-[#087F5B] px-5 text-xs font-semibold text-white"
        >
          {saving ? "Publishing…" : "Publish Product"}
        </Button>
      </div>
      {/* Double Confirmation Modal for Deleting Variants & Images */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl animate-dropdown">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#DC2626]">
              <IconTrash size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              {deleteTarget.type === "variant" && "Delete Color Variant?"}
              {deleteTarget.type === "image" && "Remove Image?"}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              {deleteTarget.type === "variant" &&
                `Are you sure you want to delete variant "${deleteTarget.name || "this color"}"? This action cannot be undone.`}
              {deleteTarget.type === "image" &&
                "Are you sure you want to remove this product image? You will need to re-upload it if needed."}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054] shadow-2xs hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTarget}
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B91C1C]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Unsaved Changes Warning Modal */}
      {pendingNavigationHref && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setPendingNavigationHref(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl animate-dropdown">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
              <IconAlertTriangle size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">
              Unsaved Changes Will Be Lost
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              You have unsaved product changes or uploaded images. If you leave or close this page now, your changes will be discarded. You must save or publish the product before leaving.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const dest = pendingNavigationHref;
                  setPendingNavigationHref(null);
                  isSavedRef.current = true;
                  router.push(dest);
                }}
                className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#DC2626] shadow-2xs hover:bg-[#FEE2E2]/30"
              >
                Leave Without Saving
              </button>
              <button
                type="button"
                onClick={() => setPendingNavigationHref(null)}
                className="rounded-xl bg-[#087F5B] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D]"
              >
                Stay & Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
