"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API, api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Select, Spinner } from "@/lib/ui";
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
  IconTrash,
  IconInfo,
  IconFileText,
  IconSend,
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { pageId } = usePage();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [sizes, setSizes] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [stockStatus, setStockStatus] = useState("available");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [productInstructions, setProductInstructions] = useState("");
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariantUploadId, setActiveVariantUploadId] = useState<string | null>(null);
  const [dragOverVariantId, setDragOverVariantId] = useState<string | null>(null);

  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [publishStatus, setPublishStatus] = useState<"public" | "draft" | "private">("public");
  const [publishDate, setPublishDate] = useState("May 16, 2025 12:00 PM");

  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "variant" | "image";
    id: string;
    name?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isSavedRef = useRef(false);
  const initialDataRef = useRef<string>("");
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);

  // Form dirty state check: true if user modified fields, uploaded images, or upload is in progress
  const isDirty = useMemo(() => {
    if (uploadingImage) return true;
    if (!initialDataRef.current) return false;
    const currentSnapshot = JSON.stringify({
      name: name.trim(),
      sku: sku.trim(),
      sizes: sizes.trim(),
      price: price.trim(),
      compareAtPrice: compareAtPrice.trim(),
      discount: discount.trim(),
      discountType,
      stockStatus,
      stockQuantity: stockQuantity.trim(),
      productInstructions: productInstructions.trim(),
      description: description.trim(),
      images,
      variants,
      selectedCategories,
      tags,
    });
    return currentSnapshot !== initialDataRef.current;
  }, [
    uploadingImage,
    name,
    sku,
    sizes,
    price,
    compareAtPrice,
    discount,
    discountType,
    stockStatus,
    stockQuantity,
    productInstructions,
    description,
    images,
    variants,
    selectedCategories,
    tags,
  ]);

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api(`/api/products/${id}`)
      .then((p) => {
        const loadedName = p.name ?? "";
        const loadedSku = p.sku ?? "";
        const loadedPrice = p.price != null ? String(p.price) : "";
        const loadedDiscount = p.discount != null ? String(p.discount) : "";
        const loadedDiscountType = (p.discountType === "percent" || p.discountType === "fixed") ? p.discountType : "fixed";
        const loadedStockStatus = p.stockStatus ?? "available";
        const loadedStockQuantity = p.stockQuantity != null ? String(p.stockQuantity) : "0";
        let loadedCompareAtPrice = "";

        setName(loadedName);
        setSku(loadedSku);
        setPrice(loadedPrice);
        setDiscount(loadedDiscount);
        setDiscountType(loadedDiscountType);
        setStockStatus(loadedStockStatus);
        setStockQuantity(loadedStockQuantity);
        setPublishStatus(loadedStockStatus === "hidden" ? "draft" : "public");

        if (p.discount && p.price && loadedDiscountType === "percent") {
          const comp = Math.round(p.price / (1 - p.discount / 100));
          loadedCompareAtPrice = String(comp);
          setCompareAtPrice(loadedCompareAtPrice);
        }

        let rawDesc = p.description ?? "";
        let loadedSizes = "";
        // Extract sizes from description if present
        const sizeMatch = rawDesc.match(/Sizes?:\s*([^\n]+)/i);
        if (sizeMatch) {
          loadedSizes = sizeMatch[1].trim();
          setSizes(loadedSizes);
          rawDesc = rawDesc.replace(/Sizes?:\s*[^\n]+\n*/i, "").trim();
        }

        let loadedInstructions = "";
        // Extract instructions from description if present
        const instMatch = rawDesc.match(/Instructions?:\s*([^\n]+)/i);
        if (instMatch) {
          loadedInstructions = instMatch[1].trim();
          setProductInstructions(loadedInstructions);
          rawDesc = rawDesc.replace(/Instructions?:\s*[^\n]+\n*/i, "").trim();
        }

        setDescription(rawDesc);

        let loadedCategories: string[] = [];
        if (p.category) {
          loadedCategories = [p.category];
          setSelectedCategories(loadedCategories);
        }

        let loadedTags: string[] = [];
        if (p.keywords) {
          loadedTags = p.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
          setTags(loadedTags);
        }

        let loadedImages: string[] = [];
        if (Array.isArray(p.images) && p.images.length > 0) {
          loadedImages = p.images;
          setImages(loadedImages);
        } else if (p.imageUrl) {
          loadedImages = [p.imageUrl];
          setImages(loadedImages);
        }

        // Handle variants if array of structured objects or strings
        let loadedVariants: ColorVariant[] = [];
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          loadedVariants = p.variants.map((v: any, idx: number) => {
            if (typeof v === "string") {
              return {
                id: `v-${idx}`,
                color: v,
                price: p.price != null ? String(p.price) : "",
                stock: "0",
                sku: "",
                images: [],
              };
            }
            return {
              id: v.id || `v-${idx}`,
              color: v.color || "Color",
              price: v.price != null ? String(v.price) : "",
              stock: v.stock != null ? String(v.stock) : "0",
              sku: v.sku || "",
              images: Array.isArray(v.images) ? v.images : [],
            };
          });
          setVariants(loadedVariants);
        }

        // Save initial snapshot for dirty checking
        initialDataRef.current = JSON.stringify({
          name: loadedName.trim(),
          sku: loadedSku.trim(),
          sizes: loadedSizes.trim(),
          price: loadedPrice.trim(),
          compareAtPrice: loadedCompareAtPrice.trim(),
          discount: loadedDiscount.trim(),
          discountType: loadedDiscountType,
          stockStatus: loadedStockStatus,
          stockQuantity: loadedStockQuantity.trim(),
          productInstructions: loadedInstructions.trim(),
          description: rawDesc.trim(),
          images: loadedImages,
          variants: loadedVariants,
          selectedCategories: loadedCategories,
          tags: loadedTags,
        });
      })
      .catch((e) => setError(e.message || "Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

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

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        color: "",
        price: price || "",
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

  function updateVariant(vId: string, updates: Partial<ColorVariant>) {
    setVariants((prev) => prev.map((v) => (v.id === vId ? { ...v, ...updates } : v)));
  }

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

  async function handleSave(intendedStatus?: "published" | "draft") {
    setError("");
    const errors: Record<string, string> = {};

    const effectiveStatus = intendedStatus ?? (publishStatus === "public" ? "published" : "draft");

    if (!name.trim()) errors.name = "Product name is required.";
    if (effectiveStatus === "published" && !price) errors.price = "Price is required.";

    const allCollectedImages = [
      ...images,
      ...variants.flatMap((v) => v.images),
    ].filter(Boolean);

    if (allCollectedImages.length === 0) {
      errors.images = "Upload at least one product image.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please resolve required fields.");
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
      // If publishing -> if it was hidden (draft), activate as "available" (or keep user's chosen low_stock/out_of_stock)
      let finalStockStatus: string;
      if (effectiveStatus === "draft" || (!intendedStatus && publishStatus === "private")) {
        finalStockStatus = "hidden";
      } else {
        finalStockStatus = stockStatus === "hidden" ? "available" : stockStatus;
      }

      const fullDescription = [
        sizes.trim() ? `Sizes: ${sizes.trim()}` : null,
        productInstructions.trim() ? `Instructions: ${productInstructions.trim()}` : null,
        description.trim() ? description.trim() : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      await api(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
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
      setError(err.message || "Failed to update product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      isSavedRef.current = true;
      router.push("/products");
    } catch (err: any) {
      setError(err.message || "Failed to delete product.");
      setSaving(false);
    }
  }

  const filteredCategoriesList = useMemo(() => {
    if (!categorySearch.trim()) return availableCategories;
    return availableCategories.filter((c) =>
      c.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [availableCategories, categorySearch]);

  if (loading) return <Spinner className="h-96" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Edit Product
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
            <Link href="/products" className="hover:text-[#087F5B]">
              Products
            </Link>
            <span>›</span>
            <span className="font-medium text-[#172033]">Edit Product</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            className="h-10 px-4 text-xs font-semibold"
          >
            <IconTrash size={14} />
            <span>Delete</span>
          </Button>

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
            <span>
              {saving
                ? publishStatus === "draft"
                  ? "Publishing…"
                  : "Saving…"
                : publishStatus === "draft"
                  ? "Publish Product"
                  : "Save Changes"}
            </span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-[#172033]">
              Product Information
            </h2>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Product Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
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
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
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
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white pr-3 pl-8 text-sm font-semibold text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
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
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white pr-3 pl-8 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                    />
                  </div>
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

              {/* Product Sizes Input Box */}
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
                  Enter available sizes separated by commas
                </p>
              </div>

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
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Instructions */}
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Description
                </label>
                <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[#D9E2E8] bg-[#F8FAFC] p-1.5">
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
                </div>
                <textarea
                  ref={descriptionRef}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-b-lg border border-[#D9E2E8] bg-white p-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Product Images */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-[#172033]">Product Images</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Only image files (PNG, JPG, WEBP, GIF) are accepted.
            </p>
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
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D9E2E8] bg-[#F8FAFC] p-6 text-center transition-colors hover:border-[#087F5B]"
            >
              <IconUpload size={20} className="text-[#087F5B]" />
              <p className="mt-2 text-xs font-semibold text-[#172033]">
                Upload images <span className="font-normal text-[#64748B]">or drag and drop</span>
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

            {images.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white"
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
                      onClick={() => setDeleteTarget({ type: "image", id: String(i) })}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white opacity-0 group-hover:opacity-100"
                    >
                      <IconX size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Variants (Color) */}
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
                className="h-8 rounded-lg bg-[#087F5B] px-3 text-xs font-semibold text-white hover:bg-[#066B4D]"
              >
                <IconPlus size={14} />
                <span>Add Color</span>
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Drag + Color Name Input */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="cursor-grab text-[#94A3B8]">
                        <IconGripVertical size={16} />
                      </div>
                      <div className="w-full sm:w-40">
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Color Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) =>
                            updateVariant(v.id, { color: e.target.value })
                          }
                          placeholder="e.g. Black, Blue, Maroon"
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Price (BDT)
                        </label>
                        <input
                          type="number"
                          placeholder={price}
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(v.id, { price: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) =>
                            updateVariant(v.id, { stock: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          SKU
                        </label>
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(v.id, { sku: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2 text-xs text-[#172033]"
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
                              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
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
          </Card>
        </div>

        {/* Right Column (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
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
            </div>
          </Card>

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

            {showAddCategory && (
              <div className="mt-3 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New category..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-[#D9E2E8] px-2 text-xs"
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

            <div className="no-scrollbar mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
              {filteredCategoriesList.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs text-[#334155] hover:bg-[#F8FAFC]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="h-3.5 w-3.5 rounded-xs border-[#D9E2E8] text-[#087F5B] accent-[#087F5B]"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#172033]">Tags</h3>
            <div className="mt-3">
              <input
                type="text"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="h-8 w-full rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs text-[#172033] focus:border-[#087F5B] focus:outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#334155]"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-[#94A3B8] hover:text-danger"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#172033]">Product Summary</h3>
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
                <span className="text-[#64748B]">Variants</span>
                <span className="font-semibold text-[#172033]">
                  {variants.length} colors
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal for Product */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl animate-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#DC2626]">
              <IconTrash size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101828]">Delete product permanently?</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              &quot;{name}&quot; will be permanently deleted from catalog. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054] shadow-2xs hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B91C1C]"
              >
                {saving ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              You have unsaved product changes or uploaded images. If you leave or close this page now, your changes will be discarded. You must save or update the product before leaving.
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
