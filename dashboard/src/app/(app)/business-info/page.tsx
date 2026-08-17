"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Spinner, TextArea } from "@/lib/ui";
import {
  IconStore,
  IconShoppingBag,
  IconCreditCard,
  IconFileText,
  IconSparkles,
  IconCheck,
  IconInfo,
  IconEdit,
  IconX,
  IconPhone,
  IconActivity,
  IconPlus,
} from "@/components/Icons";

const DEFAULT_ORDER_INFO =
  "অর্ডারের জন্য Customer-এর নাম, ফোন নম্বর, Delivery Address এবং পণ্যের নাম/সাইজ প্রয়োজন হবে।";
const DEFAULT_PAYMENT_INFO = "Payment Method: Cash on Delivery, bKash, Nagad";
const DEFAULT_DELIVERY_INFO =
  "Inside Dhaka: 60 tk & delivery time 1–2 days\nOutside Dhaka: 120 tk & delivery time 3–4 days";
const DEFAULT_RETURN_POLICY =
  "পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে Return Request করা যাবে, যদি পণ্যে কোনো Manufacturing Defect থাকে অথবা ভুল Product পাঠানো হয়ে থাকে।";
const DEFAULT_EXCHANGE_POLICY =
  "Product Availability সাপেক্ষে ৭ দিনের মধ্যে Size Exchange করা যাবে।";
const DEFAULT_REFUND_POLICY =
  "Returned Product যাচাই করার পর Return অনুমোদিত হলে Refund Process করা হবে।";
const DEFAULT_WARRANTY =
  "কোনো Product-এর ক্ষেত্রে আলাদাভাবে উল্লেখ না থাকলে Warranty দেওয়া হয় না।";
const DEFAULT_COD_MESSAGE = `আপনার Payment Verify হয়ে গেছে! ✅ আপনার Order Confirm করা হলো।
খুব শীঘ্রই আমরা প্রোডাক্টটি প্যাক করে Courier-এর মাধ্যমে পাঠিয়ে দেব। ডেলিভারি পেতে সাধারণত [X-Y কার্যদিবস] সময় লাগে।
পণ্য হাতে পাওয়ার পর বাকি টাকা ({{remaining_amount}} টাকা) Cash দিয়ে পরিশোধ করবেন।
কোনো প্রশ্ন থাকলে জানাবেন! 😊`;
const DEFAULT_FULL_MESSAGE = `আপনার Payment Verify হয়ে গেছে! ✅ আপনার Order Confirm করা হলো।
খুব শীঘ্রই আমরা প্রোডাক্টটি প্যাক করে পাঠিয়ে দেওয়া হবে। ডেলিভারি পেতে সাধারণত [X-Y কার্যদিবস] সময় লাগবে।
ধন্যবাদ আমাদের সাথে অর্ডার করার জন্য! 😊`;

interface BotConfig {
  useBusinessInfo: boolean;
  businessName: string | null;
  businessType: string | null;
  contactNumber: string | null;
  businessInfo: string | null;
  orderInfo: string | null;
  paymentInfo: string | null;
  deliveryInfo: string | null;
  additionalInfo: string | null;
  returnPolicy: string | null;
  exchangePolicy: string | null;
  refundPolicy: string | null;
  warranty: string | null;
  paymentNumber: string | null;
  codMessage: string | null;
  fullMessage: string | null;
}

type FieldKey = keyof Omit<BotConfig, "useBusinessInfo">;

interface FieldDefinition {
  key: FieldKey;
  label: string;
  category: "identity" | "logistics" | "payment" | "policy";
  description: string;
  type: "text" | "textarea";
  placeholder: string;
  required?: boolean;
  hasVariableHelper?: boolean;
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Identity
  {
    key: "businessName",
    label: "Business Name",
    category: "identity",
    description: "The official name of your store or brand.",
    type: "text",
    placeholder: "Trendy Wear BD",
    required: true,
  },
  {
    key: "businessType",
    label: "Category / Business Type",
    category: "identity",
    description: "Your store's industry, product category, or specialty.",
    type: "text",
    placeholder: "পোশাক ও ফ্যাশন (Men's Fashion)",
  },
  {
    key: "contactNumber",
    label: "Customer Contact / Hotline Phone",
    category: "identity",
    description: "The primary phone number for customer inquiries or escalation.",
    type: "text",
    placeholder: "017XXXXXXXX",
    required: true,
  },
  {
    key: "businessInfo",
    label: "Store Description & Value Proposition",
    category: "identity",
    description: "Detailed description of your products, brand, quality, and store ethos.",
    type: "textarea",
    placeholder: "Trendy Wear BD একটি অনলাইন পোশাকের শপ। আমরা ছেলেদের জন্য Premium Shirt, T-Shirt, Polo Shirt এবং Casual Wear বিক্রি করি...",
    required: true,
  },
  // Logistics
  {
    key: "orderInfo",
    label: "Order Requirements",
    category: "logistics",
    description: "Information the bot collects from customer before placing an order.",
    type: "textarea",
    placeholder: DEFAULT_ORDER_INFO,
  },
  {
    key: "deliveryInfo",
    label: "Delivery Charges & Timelines",
    category: "logistics",
    description: "Delivery fees inside/outside Dhaka and estimated transit days.",
    type: "textarea",
    placeholder: DEFAULT_DELIVERY_INFO,
  },
  // Payment
  {
    key: "paymentInfo",
    label: "Accepted Payment Methods",
    category: "payment",
    description: "Methods supported: Cash on Delivery, bKash, Nagad, etc.",
    type: "text",
    placeholder: DEFAULT_PAYMENT_INFO,
  },
  {
    key: "paymentNumber",
    label: "Merchant / Personal Payment Number",
    category: "payment",
    description: "bKash / Nagad number where customers send payment.",
    type: "text",
    placeholder: "017XXXXXXXX (bKash/Nagad)",
  },
  {
    key: "codMessage",
    label: "Cash on Delivery (COD) Confirmation Message",
    category: "payment",
    description: "Automated Messenger confirmation sent upon COD order verification.",
    type: "textarea",
    placeholder: DEFAULT_COD_MESSAGE,
    hasVariableHelper: true,
  },
  {
    key: "fullMessage",
    label: "Full Payment Confirmation Message",
    category: "payment",
    description: "Automated Messenger confirmation sent upon full payment verification.",
    type: "textarea",
    placeholder: DEFAULT_FULL_MESSAGE,
  },
  // Policy
  {
    key: "returnPolicy",
    label: "Return Policy",
    category: "policy",
    description: "Terms and conditions for returning delivered items.",
    type: "textarea",
    placeholder: DEFAULT_RETURN_POLICY,
  },
  {
    key: "exchangePolicy",
    label: "Exchange Policy",
    category: "policy",
    description: "Size or product exchange criteria and time window.",
    type: "textarea",
    placeholder: DEFAULT_EXCHANGE_POLICY,
  },
  {
    key: "refundPolicy",
    label: "Refund Policy",
    category: "policy",
    description: "Conditions under which customer payments are refunded.",
    type: "textarea",
    placeholder: DEFAULT_REFUND_POLICY,
  },
  {
    key: "warranty",
    label: "Warranty Information",
    category: "policy",
    description: "Warranty coverage on electronics, watches, or specific items.",
    type: "textarea",
    placeholder: DEFAULT_WARRANTY,
  },
  {
    key: "additionalInfo",
    label: "Additional Rules & Custom Instructions",
    category: "policy",
    description: "Any extra edge-case rules or custom business instructions for AI.",
    type: "textarea",
    placeholder: "Return/exchange rules, communication rules, special discount policies…",
  },
];

export default function BusinessInfoPage() {
  const { pageId } = usePage();
  const [form, setForm] = useState({
    useBusinessInfo: true,
    businessName: "",
    businessType: "",
    contactNumber: "",
    businessInfo: "",
    orderInfo: "",
    paymentInfo: "",
    deliveryInfo: "",
    additionalInfo: "",
    returnPolicy: "",
    exchangePolicy: "",
    refundPolicy: "",
    warranty: "",
    paymentNumber: "",
    codMessage: DEFAULT_COD_MESSAGE,
    fullMessage: DEFAULT_FULL_MESSAGE,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Modal State
  const [activeModalField, setActiveModalField] = useState<FieldDefinition | null>(null);
  const [modalValue, setModalValue] = useState<string>("");

  useEffect(() => {
    if (!pageId) return;
    setLoaded(false);
    api<BotConfig | null>(`/api/settings/${pageId}`)
      .then((c) => {
        if (c) {
          setForm({
            useBusinessInfo: c.useBusinessInfo ?? true,
            businessName: c.businessName ?? "",
            businessType: c.businessType ?? "",
            contactNumber: c.contactNumber ?? "",
            businessInfo: c.businessInfo ?? "",
            orderInfo: c.orderInfo ?? "",
            paymentInfo: c.paymentInfo ?? "",
            deliveryInfo: c.deliveryInfo ?? "",
            additionalInfo: c.additionalInfo ?? "",
            returnPolicy: c.returnPolicy ?? "",
            exchangePolicy: c.exchangePolicy ?? "",
            refundPolicy: c.refundPolicy ?? "",
            warranty: c.warranty ?? "",
            paymentNumber: c.paymentNumber ?? "",
            codMessage: c.codMessage ?? DEFAULT_COD_MESSAGE,
            fullMessage: c.fullMessage ?? DEFAULT_FULL_MESSAGE,
          });
        }
        setLoaded(true);
      })
      .catch((e) => setError(e.message || "Failed to load business settings"));
  }, [pageId]);

  // ESC key listener for modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && activeModalField) {
        closeModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalField]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (activeModalField) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModalField]);

  // Open modal with field data
  function openFieldModal(fieldDef: FieldDefinition) {
    setActiveModalField(fieldDef);
    setModalValue(form[fieldDef.key] || "");
    setError("");
  }

  function closeModal() {
    setActiveModalField(null);
    setModalValue("");
  }

  // Save changes for specific field or entire form
  async function handleSaveModal() {
    if (!activeModalField) return;

    if (activeModalField.required && !modalValue.trim()) {
      setError(`${activeModalField.label} cannot be empty.`);
      return;
    }

    const updatedForm = {
      ...form,
      [activeModalField.key]: modalValue,
    };

    setSaving(true);
    setError("");
    try {
      await api(`/api/settings/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          useBusinessInfo: updatedForm.useBusinessInfo,
          businessName: updatedForm.businessName || null,
          businessType: updatedForm.businessType || null,
          contactNumber: updatedForm.contactNumber || null,
          businessInfo: updatedForm.businessInfo || null,
          orderInfo: updatedForm.orderInfo || null,
          paymentInfo: updatedForm.paymentInfo || null,
          deliveryInfo: updatedForm.deliveryInfo || null,
          additionalInfo: updatedForm.additionalInfo || null,
          returnPolicy: updatedForm.returnPolicy || null,
          exchangePolicy: updatedForm.exchangePolicy || null,
          refundPolicy: updatedForm.refundPolicy || null,
          warranty: updatedForm.warranty || null,
          paymentNumber: updatedForm.paymentNumber || null,
          codMessage: updatedForm.codMessage || null,
          fullMessage: updatedForm.fullMessage || null,
        }),
      });

      setForm(updatedForm);
      setSaved(true);
      closeModal();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save field");
    } finally {
      setSaving(false);
    }
  }

  // Toggle master AI use switch
  async function toggleMasterSwitch() {
    const nextVal = !form.useBusinessInfo;
    setForm((prev) => ({ ...prev, useBusinessInfo: nextVal }));
    try {
      await api(`/api/settings/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({ useBusinessInfo: nextVal }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update switch");
    }
  }

  // Profile Completeness calculation
  const completeness = useMemo(() => {
    const fields = [
      Boolean(form.businessName.trim()),
      Boolean(form.contactNumber.trim()),
      Boolean(form.businessInfo.trim()),
      Boolean(form.orderInfo.trim()),
      Boolean(form.deliveryInfo.trim()),
      Boolean(form.paymentInfo.trim()),
      Boolean(form.paymentNumber.trim()),
      Boolean(form.returnPolicy.trim()),
      Boolean(form.exchangePolicy.trim()),
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  if (!pageId) return <Spinner />;

  // Render a view-only field card row
  const renderFieldRow = (fieldDef: FieldDefinition) => {
    const val = form[fieldDef.key];
    const isSet = Boolean(val && val.trim());

    return (
      <div
        key={fieldDef.key}
        onClick={() => openFieldModal(fieldDef)}
        className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 transition-all duration-150 hover:border-[#087F5B]/50 hover:bg-[#FAFCFB] hover:shadow-2xs"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#101828]">
                {fieldDef.label}
              </span>
              {fieldDef.required && (
                <span className="text-[11px] font-bold text-danger">*</span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {fieldDef.description}
            </p>
          </div>

          <button
            type="button"
            aria-label={`Edit ${fieldDef.label}`}
            className="flex h-7 items-center gap-1 rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-[11px] font-semibold text-[#172033] opacity-80 shadow-2xs group-hover:border-[#087F5B] group-hover:bg-[#E8F5EF] group-hover:text-[#087F5B] group-hover:opacity-100 transition-all"
          >
            <IconEdit size={12} />
            <span>Edit</span>
          </button>
        </div>

        {/* View-Only Content Display */}
        <div className="mt-3 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] p-3 text-xs">
          {isSet ? (
            <div className="whitespace-pre-wrap font-medium text-[#172033] line-clamp-3">
              {val}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#94A3B8] italic">
              <IconPlus size={13} />
              <span>Not configured yet. Click to add instructions...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* 1. Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#101828]">
            Business Info
          </h1>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Click any section or field to open the full editor modal and configure AI instructions.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#E8F5EF] px-3 py-1 text-xs font-semibold text-[#087F5B]">
            <IconCheck size={14} />
            <span>Changes saved to AI context</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconInfo size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top AI Master Switch Banner */}
      <Card className="p-5 border-[#D0E7DC] bg-[#F6FBF8]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
              <IconSparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-[#101828]">
                  AI Business Knowledge Context
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    form.useBusinessInfo
                      ? "bg-[#E8F5EF] text-[#087F5B]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {form.useBusinessInfo ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#475569]">
                When enabled, the AI sales copilot automatically references your saved business details, delivery rates, and policies during live customer chats.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#172033]">
              {form.useBusinessInfo ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.useBusinessInfo}
              onClick={toggleMasterSwitch}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.useBusinessInfo ? "bg-[#087F5B]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-all ${
                  form.useBusinessInfo ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {!loaded ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        /* 3. 2-Column Responsive Layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 8 COLS: Categorized Field View Lists */}
          <div className="space-y-6 lg:col-span-8">
            {/* Category 1: Store Identity & Contact */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5EF] text-[#087F5B]">
                    <IconStore size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#101828]">
                      Store Profile & Identity
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Basic store info used to introduce your business to customers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {FIELD_DEFINITIONS.filter((f) => f.category === "identity").map(
                  renderFieldRow
                )}
              </div>
            </Card>

            {/* Category 2: Ordering & Delivery */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <IconShoppingBag size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#101828]">
                      Ordering & Delivery Information
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Rules the AI uses when taking orders and calculating delivery.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {FIELD_DEFINITIONS.filter((f) => f.category === "logistics").map(
                  renderFieldRow
                )}
              </div>
            </Card>

            {/* Category 3: Payment & Messages */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4E5] text-[#D97706]">
                    <IconCreditCard size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#101828]">
                      Payment Methods & Confirmation Messages
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Payment gateway info and customer verification message templates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {FIELD_DEFINITIONS.filter((f) => f.category === "payment").map(
                  renderFieldRow
                )}
              </div>
            </Card>

            {/* Category 4: Policies & Warranty */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#8B5CF6]">
                    <IconFileText size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#101828]">
                      Store Policies & Warranty
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Policies the AI references for returns, exchanges, and guarantees.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {FIELD_DEFINITIONS.filter((f) => f.category === "policy").map(
                  renderFieldRow
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT 4 COLS: Profile Completeness & AI Preview */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              {/* Card 1: Profile Completeness */}
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#101828]">
                    Profile Strength
                  </h3>
                  <span className="font-display text-sm font-bold text-[#087F5B]">
                    {completeness}%
                  </span>
                </div>

                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-full rounded-full bg-[#087F5B] transition-all duration-300"
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#475569]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          form.businessName ? "bg-[#087F5B]" : "bg-neutral-300"
                        }`}
                      />
                      <span>Store Profile</span>
                    </span>
                    <span className="font-medium text-[#101828]">
                      {form.businessName ? "Set" : "Missing"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#475569]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          form.deliveryInfo ? "bg-[#087F5B]" : "bg-neutral-300"
                        }`}
                      />
                      <span>Delivery Rules</span>
                    </span>
                    <span className="font-medium text-[#101828]">
                      {form.deliveryInfo ? "Set" : "Default"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#475569]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          form.paymentNumber ? "bg-[#087F5B]" : "bg-neutral-300"
                        }`}
                      />
                      <span>Payment Numbers</span>
                    </span>
                    <span className="font-medium text-[#101828]">
                      {form.paymentNumber ? "Set" : "Optional"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#475569]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          form.returnPolicy ? "bg-[#087F5B]" : "bg-neutral-300"
                        }`}
                      />
                      <span>Policies & Warranty</span>
                    </span>
                    <span className="font-medium text-[#101828]">
                      {form.returnPolicy ? "Set" : "Default"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 2: AI Knowledge Simulation */}
              <Card className="p-5 border-[#E2E8F0] bg-[#FAFCFB]">
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-[#087F5B]" />
                  <h3 className="text-xs font-bold text-[#101828]">
                    Live AI Context Preview
                  </h3>
                </div>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  How the AI introduces your store in customer chats:
                </p>

                <div className="mt-3 rounded-xl border border-[#D9E2E8] bg-white p-3 text-[11px] text-[#172033] shadow-2xs space-y-2">
                  <div className="font-semibold text-[#087F5B]">
                    {form.businessName || "Your Store"}
                  </div>
                  <div className="line-clamp-3 text-[#475569]">
                    {form.businessInfo ||
                      "আমরা ভালো মানের কাপড়, আধুনিক ডিজাইন এবং দ্রুত ডেলিভারি নিশ্চিত করি।"}
                  </div>
                  <div className="border-t border-[#E5E7EB] pt-1.5 flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Delivery: {form.deliveryInfo ? "Custom" : "Standard"}</span>
                    <span>COD: Available</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 4. LARGE POPUP / MODAL EDITOR */}
      {activeModalField && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeModal}
          />

          {/* Modal Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <div
              className="relative flex h-[88vh] max-h-[900px] w-[95vw] max-w-6xl flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                    <IconEdit size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#101828]">
                      Edit {activeModalField.label}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {activeModalField.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="no-scrollbar flex flex-1 flex-col space-y-3 overflow-y-auto p-6 text-xs">
                {activeModalField.hasVariableHelper && (
                  <div className="flex items-center justify-between rounded-xl border border-[#B7DEC9] bg-[#E8F5EF]/60 p-3 text-xs text-[#065F46]">
                    <span>Insert dynamic order balance amount tag:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!modalValue.includes("{{remaining_amount}}")) {
                          setModalValue((prev) => prev + " {{remaining_amount}}");
                        }
                      }}
                      className="rounded-md bg-[#087F5B] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-[#066B4D]"
                    >
                      + {"{{remaining_amount}}"}
                    </button>
                  </div>
                )}

                <div className="flex flex-1 flex-col">
                  <label className="mb-1.5 block text-xs font-semibold text-[#172033]">
                    {activeModalField.label} Instructions & Context:
                  </label>
                  <textarea
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                    placeholder={activeModalField.placeholder}
                    className="flex-1 min-h-[380px] sm:min-h-[440px] w-full rounded-xl border border-[#D9E2E8] p-4 text-xs sm:text-[13px] leading-relaxed text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>The AI sales copilot references these instructions verbatim during conversations.</span>
                    <span className="font-mono font-medium text-[#101828]">
                      {modalValue.length} characters
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#F8FAFC] px-6 py-4 rounded-b-2xl">
                <Button
                  variant="ghost"
                  onClick={closeModal}
                  className="h-9 border-[#D9E2E8] bg-white px-4 text-xs font-semibold text-[#172033]"
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="h-9 bg-[#087F5B] px-6 text-xs font-semibold text-white hover:bg-[#066B4D]"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
