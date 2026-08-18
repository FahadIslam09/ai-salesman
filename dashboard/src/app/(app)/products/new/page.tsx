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
} from "@/components/Icons";

interface ColorVariant {
  id: string;
  color: string;
  colorHex: string;
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

const PRESET_COLORS = [
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Red", hex: "#DC2626" },
  { name: "Green", hex: "#16A34A" },
  { name: "Olive", hex: "#4D7C0F" },
  { name: "Maroon", hex: "#881337" },
  { name: "Gray", hex: "#6B7280" },
];

export default function NewProductPage() {
  const router = useRouter();
  const { pageId } = usePage();

  // Basic info
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stockStatus, setStockStatus] = useState("available");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariantUploadId, setActiveVariantUploadId] = useState<string | null>(null);

  // Variants (Colors)
  const [variants, setVariants] = useState<ColorVariant[]>([
    {
      id: "v-1",
      color: "Black",
      colorHex: "#111827",
      price: "",
      stock: "0",
      sku: "",
      images: [],
    },
    {
      id: "v-2",
      color: "Blue",
      colorHex: "#2563EB",
      price: "",
      stock: "0",
      sku: "",
      images: [],
    },
  ]);

  // Sidebar controls
  const [status, setStatus] = useState<"published" | "draft">("draft");
  const [visibility, setVisibility] = useState("public");
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
    setUploadingImage(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
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
    const nextIndex = variants.length + 1;
    const preset = PRESET_COLORS[nextIndex % PRESET_COLORS.length];
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        color: preset.name,
        colorHex: preset.hex,
        price: "",
        stock: "0",
        sku: sku ? `${sku}-${preset.name.slice(0, 3).toUpperCase()}` : "",
        images: [],
      },
    ]);
  }

  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
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
  async function handleSave(intendedStatus: "published" | "draft") {
    setError("");
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Product name is required.";
    }
    if (intendedStatus === "published" && !price) {
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
          ...tags,
          ...selectedCategories.map((c) => c.toLowerCase()),
          ...variants.map((v) => v.color.toLowerCase()),
        ])
      )
        .filter(Boolean)
        .join(", ");

      const computedDiscount =
        price && compareAtPrice && Number(compareAtPrice) > Number(price)
          ? Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)
          : null;

      const finalStockStatus =
        intendedStatus === "draft" ? "hidden" : stockStatus;

      // Full product description combining short + rich description
      const fullDescription = [
        shortDescription.trim() ? shortDescription.trim() : null,
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
          discount: computedDiscount,
          stockStatus: finalStockStatus,
          category: selectedCategories[0] || null,
          variants: variants.length > 0 ? variants : null,
          description: fullDescription || null,
        }),
      });

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
            <span className="font-medium text-[#172033]">Add New Product</span>
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

      {/* 2. Main Two-Column Layout (Desktop ~70% Left, ~30% Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Product Information, Images, Variants */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card A: Product Information */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-[#172033]">
              Product Information
            </h2>

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

              {/* Row 2: Price (BDT) + Compare at Price (BDT) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    Leave empty if not on sale
                  </p>
                </div>
              </div>

              {/* Row 3: Stock Status + Stock Quantity */}
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

              {/* Row 4: Short Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="A short summary about the product..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E2E8] bg-white p-3 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                />
              </div>

              {/* Row 5: Description with Rich Text Toolbar */}
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
              Add clear images of your product. The first image will be used as the primary thumbnail.
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
              <p className="mt-0.5 text-[11px] text-[#64748B]">PNG, JPG up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                        setImages((prev) => prev.filter((_, idx) => idx !== i));
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
              <h2 className="text-base font-semibold text-[#172033]">
                Variants (Color)
              </h2>
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
              {variants.map((v, index) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[#E5E7EB] bg-[#FAFCFB] p-4 transition-all hover:border-[#D0D7D4]"
                >
                  {/* Desktop Variant Row */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Drag + Swatch + Color Name */}
                    <div className="flex items-center gap-2.5">
                      <div className="cursor-grab text-[#94A3B8]">
                        <IconGripVertical size={16} />
                      </div>

                      {/* Color Picker Swatch */}
                      <label
                        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#D9E2E8] shadow-2xs transition-transform hover:scale-105"
                        style={{ backgroundColor: v.colorHex }}
                        title="Click to pick color"
                      >
                        <input
                          type="color"
                          value={v.colorHex}
                          onChange={(e) =>
                            updateVariant(v.id, { colorHex: e.target.value })
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>

                      {/* Color Name Input */}
                      <div className="w-32">
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
                          placeholder="e.g. Black"
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Middle: Price, Stock, SKU */}
                    <div className="grid flex-1 grid-cols-3 gap-2.5">
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

                    {/* Right: Images Preview / Upload & Delete Variant */}
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Images
                        </label>
                        <div className="flex items-center gap-1.5">
                          {v.images.map((imgUrl, imgIdx) => (
                            <div
                              key={`${imgUrl}-${imgIdx}`}
                              className="group relative h-9 w-9 overflow-hidden rounded-md border border-[#E5E7EB] bg-white"
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

                          {/* Plus Upload Button for this variant */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveVariantUploadId(v.id);
                              variantFileInputRef.current?.click();
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-[#D9E2E8] bg-white text-[#64748B] hover:border-[#087F5B] hover:text-[#087F5B]"
                          >
                            <IconPlus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Delete Variant Button */}
                      <button
                        type="button"
                        aria-label="Remove variant"
                        onClick={() => removeVariant(v.id)}
                        className="mt-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#C24141] hover:bg-[#FEECEC]"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hidden Input for variant image uploading */}
            <input
              ref={variantFileInputRef}
              type="file"
              accept="image/*"
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
                Add different colors of this product. Each color can have its own images, price, stock and SKU.
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
              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Status
                </label>
                <Select
                  sizeVariant="md"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="draft">● Draft</option>
                  <option value="published">● Published</option>
                </Select>
              </div>

              {/* Visibility */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Visibility
                </label>
                <Select
                  sizeVariant="md"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="public">● Public</option>
                  <option value="private">● Private</option>
                </Select>
              </div>

              {/* Publish immediately */}
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
    </div>
  );
}
