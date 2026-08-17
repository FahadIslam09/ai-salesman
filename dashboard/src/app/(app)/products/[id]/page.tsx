"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API, api, fmtTaka } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Spinner } from "@/lib/ui";
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { pageId } = usePage();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stockStatus, setStockStatus] = useState("available");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariantUploadId, setActiveVariantUploadId] = useState<string | null>(null);

  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [visibility, setVisibility] = useState("public");
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
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api(`/api/products/${id}`)
      .then((p) => {
        setName(p.name ?? "");
        setSku(p.sku ?? "");
        setPrice(p.price != null ? String(p.price) : "");
        setStockStatus(p.stockStatus ?? "available");
        setStatus(p.stockStatus === "hidden" ? "draft" : "published");

        if (p.discount && p.price) {
          const comp = Math.round(p.price / (1 - p.discount / 100));
          setCompareAtPrice(String(comp));
        }

        setDescription(p.description ?? "");
        if (p.category) {
          setSelectedCategories([p.category]);
        }

        if (p.keywords) {
          const kwList = p.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
          setTags(kwList);
        }

        if (Array.isArray(p.images) && p.images.length > 0) {
          setImages(p.images);
        } else if (p.imageUrl) {
          setImages([p.imageUrl]);
        }

        // Handle variants if array of structured objects or strings
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const parsed = p.variants.map((v: any, idx: number) => {
            if (typeof v === "string") {
              return {
                id: `v-${idx}`,
                color: v,
                colorHex: "#111827",
                price: p.price != null ? String(p.price) : "",
                stock: "0",
                sku: "",
                images: [],
              };
            }
            return {
              id: v.id || `v-${idx}`,
              color: v.color || "Color",
              colorHex: v.colorHex || "#111827",
              price: v.price != null ? String(v.price) : "",
              stock: v.stock != null ? String(v.stock) : "0",
              sku: v.sku || "",
              images: Array.isArray(v.images) ? v.images : [],
            };
          });
          setVariants(parsed);
        }
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
    const nextIndex = variants.length + 1;
    const preset = PRESET_COLORS[nextIndex % PRESET_COLORS.length];
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        color: preset.name,
        colorHex: preset.hex,
        price: price || "",
        stock: "0",
        sku: sku ? `${sku}-${preset.name.slice(0, 3).toUpperCase()}` : "",
        images: [],
      },
    ]);
  }

  function removeVariant(vId: string) {
    setVariants((prev) => prev.filter((v) => v.id !== vId));
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

  async function handleSave(intendedStatus: "published" | "draft") {
    setError("");
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "Product name is required.";
    if (intendedStatus === "published" && !price) errors.price = "Price is required.";

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

      await api(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
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
          description: description.trim() || null,
        }),
      });

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
            className="h-10 rounded-lg bg-[#087F5B] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D]"
          >
            <IconSend size={15} />
            <span>{saving ? "Saving…" : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
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
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#334155]">
                    Stock Status
                  </label>
                  <select
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-sm text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                  >
                    <option value="available">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
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
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D9E2E8] bg-[#F8FAFC] p-6 text-center transition-colors hover:border-[#087F5B]"
            >
              <IconUpload size={20} className="text-[#087F5B]" />
              <p className="mt-2 text-xs font-semibold text-[#172033]">
                Upload images or drag and drop
              </p>
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
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
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
              <h2 className="text-base font-semibold text-[#172033]">
                Variants (Color)
              </h2>
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
                    <div className="flex items-center gap-2.5">
                      <div className="cursor-grab text-[#94A3B8]">
                        <IconGripVertical size={16} />
                      </div>
                      <label
                        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#D9E2E8]"
                        style={{ backgroundColor: v.colorHex }}
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
                      <div className="w-32">
                        <label className="mb-1 block text-[11px] font-semibold text-[#64748B]">
                          Color Name
                        </label>
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) =>
                            updateVariant(v.id, { color: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-xs text-[#172033]"
                        />
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-3 gap-2.5">
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

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {v.images.map((imgUrl, imgIdx) => (
                          <div
                            key={`${imgUrl}-${imgIdx}`}
                            className="group relative h-9 w-9 overflow-hidden rounded-md border border-[#E5E7EB] bg-white"
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
                          onClick={() => {
                            setActiveVariantUploadId(v.id);
                            variantFileInputRef.current?.click();
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-[#D9E2E8] text-[#64748B] hover:border-[#087F5B]"
                        >
                          <IconPlus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label="Remove variant"
                        onClick={() => removeVariant(v.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#C24141] hover:bg-[#FEECEC]"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
          </Card>
        </div>

        {/* Right Column (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#172033]">Publish</h3>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="draft">● Draft</option>
                  <option value="published">● Published</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#334155]">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#D9E2E8] bg-white px-3 text-xs font-medium text-[#172033] shadow-2xs focus:border-[#087F5B] focus:outline-none"
                >
                  <option value="public">● Public</option>
                  <option value="private">● Private</option>
                </select>
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#101828]">Delete product permanently?</h3>
            <p className="mt-2 text-xs text-[#64748B]">
              &quot;{name}&quot; will be permanently deleted from catalog. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
