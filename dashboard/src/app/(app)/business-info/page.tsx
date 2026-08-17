"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Spinner } from "@/lib/ui";
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
  IconChevronDown,
  IconCheckCircle2,
  IconAlertCircle,
  IconZap,
  IconMessageSquare,
  IconArrowRight,
  IconCopy,
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
  priceNegotiation: string | null;
}

type FieldKey = keyof Omit<BotConfig, "useBusinessInfo">;

type CategoryId = "identity" | "logistics" | "payment" | "policy";

interface FieldDefinition {
  key: FieldKey;
  label: string;
  category: CategoryId;
  description: string;
  type: "text" | "textarea";
  placeholder: string;
  required?: boolean;
  hasVariableHelper?: boolean;
  tips?: string;
  presets?: { label: string; text: string }[];
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
    tips: "This name is used throughout all conversations and greetings.",
  },
  {
    key: "businessType",
    label: "Category / Business Type",
    category: "identity",
    description: "Your store's industry, product category, or specialty.",
    type: "text",
    placeholder: "পোশাক ও ফ্যাশন (Men's Fashion)",
    tips: "Helps AI frame its domain vocabulary and product descriptions.",
  },
  {
    key: "contactNumber",
    label: "Customer Contact / Hotline Phone",
    category: "identity",
    description: "The primary phone number for customer inquiries or escalation.",
    type: "text",
    placeholder: "017XXXXXXXX",
    required: true,
    tips: "Shared when customer asks for a direct phone call or WhatsApp.",
  },
  {
    key: "businessInfo",
    label: "Store Description & Value Proposition",
    category: "identity",
    description: "Detailed description of your products, brand, quality, and store ethos.",
    type: "textarea",
    placeholder: "Trendy Wear BD একটি অনলাইন পোশাকের শপ। আমরা ছেলেদের জন্য Premium Shirt, T-Shirt, Polo Shirt এবং Casual Wear বিক্রি করি...",
    required: true,
    tips: "Write about fabric quality, origin, shop location, and opening hours.",
    presets: [
      {
        label: "Fashion Clothing Shop",
        text: "আমাদের শপে ছেলেদের ও মেয়েদের প্রিমিয়াম কোয়ালিটির রেডিমেড পোশাক সুলভ মূল্যে পাওয়া যায়। উন্নত ফেব্রিক এবং আধুনিক ডিজাইনের নিশ্চয়তা।",
      },
      {
        label: "Electronics & Gadgets",
        text: "আমরা ১০০% অরিজিনাল গ্যাজেট এবং লাইফস্টাইল ইলেকট্রনিক্স আইটেম সরবরাহ করি। সাথে অফিশিয়াল ওয়ারেন্টি ও দ্রুত আফটার-সেলস সাপোর্ট।",
      },
    ],
  },
  // Logistics
  {
    key: "orderInfo",
    label: "Order Requirements",
    category: "logistics",
    description: "Information the bot collects from customer before placing an order.",
    type: "textarea",
    placeholder: DEFAULT_ORDER_INFO,
    tips: "Specifies required customer details (name, phone, address, size/variant).",
  },
  {
    key: "deliveryInfo",
    label: "Delivery Charges & Timelines",
    category: "logistics",
    description: "Delivery fees inside/outside Dhaka and estimated transit days.",
    type: "textarea",
    placeholder: DEFAULT_DELIVERY_INFO,
    tips: "Clearly specify Inside Dhaka and Outside Dhaka rates and timeframes.",
    presets: [
      {
        label: "Standard (60 / 120 Tk)",
        text: "Inside Dhaka: 60 tk & delivery time 1–2 days\nOutside Dhaka: 120 tk & delivery time 3–4 days",
      },
      {
        label: "Free Delivery Offer",
        text: "সারাদেশে ফ্রি হোম ডেলিভারি! ঢাকা সিটিতে ১-২ দিন, ঢাকার বাইরে ২-৩ কার্যদিবস।",
      },
    ],
  },
  // Payment
  {
    key: "paymentInfo",
    label: "Accepted Payment Methods",
    category: "payment",
    description: "Methods supported: Cash on Delivery, bKash, Nagad, etc.",
    type: "text",
    placeholder: DEFAULT_PAYMENT_INFO,
    tips: "State if partial advance delivery charge is mandatory for COD.",
  },
  {
    key: "paymentNumber",
    label: "Merchant / Personal Payment Number",
    category: "payment",
    description: "bKash / Nagad number where customers send payment.",
    type: "text",
    placeholder: "017XXXXXXXX (bKash/Nagad Personal)",
    tips: "Provide the exact payment account number and account type (Personal/Merchant).",
  },
  {
    key: "codMessage",
    label: "Cash on Delivery (COD) Confirmation Message",
    category: "payment",
    description: "Automated Messenger confirmation sent upon COD order verification.",
    type: "textarea",
    placeholder: DEFAULT_COD_MESSAGE,
    hasVariableHelper: true,
    tips: "Use {{remaining_amount}} to dynamically insert customer's remaining payable amount.",
  },
  {
    key: "fullMessage",
    label: "Full Payment Confirmation Message",
    category: "payment",
    description: "Automated Messenger confirmation sent upon full payment verification.",
    type: "textarea",
    placeholder: DEFAULT_FULL_MESSAGE,
    tips: "Sent when customer pays 100% upfront via bKash/Nagad.",
  },
  // Policy
  {
    key: "returnPolicy",
    label: "Return Policy",
    category: "policy",
    description: "Terms and conditions for returning delivered items.",
    type: "textarea",
    placeholder: DEFAULT_RETURN_POLICY,
    tips: "Clarify timeline (e.g. within 7 days) and valid reasons (defect, wrong item).",
  },
  {
    key: "exchangePolicy",
    label: "Exchange Policy",
    category: "policy",
    description: "Size or product exchange criteria and time window.",
    type: "textarea",
    placeholder: DEFAULT_EXCHANGE_POLICY,
    tips: "State whether courier fee applies for size change requests.",
  },
  {
    key: "refundPolicy",
    label: "Refund Policy",
    category: "policy",
    description: "Conditions under which customer payments are refunded.",
    type: "textarea",
    placeholder: DEFAULT_REFUND_POLICY,
    tips: "Explain how money is returned (e.g. Bank/bKash) and processing time.",
  },
  {
    key: "warranty",
    label: "Warranty Information",
    category: "policy",
    description: "Warranty coverage on electronics, watches, or specific items.",
    type: "textarea",
    placeholder: DEFAULT_WARRANTY,
    tips: "State the duration and what is covered under warranty.",
  },
  {
    key: "additionalInfo",
    label: "Additional Rules & Custom Instructions",
    category: "policy",
    description: "Any extra edge-case rules or custom business instructions for AI.",
    type: "textarea",
    placeholder: "Return/exchange rules, communication rules, special discount policies…",
    tips: "Add any unique store behaviors or specific greetings/tones.",
  },
  {
    key: "priceNegotiation",
    label: "Price Objection & Negotiation",
    category: "policy",
    description: "Custom instructions for how the AI handles price objections, bargaining, and discount requests.",
    type: "textarea",
    placeholder: "যদি কাস্টমার দাম কমাতে বলে, বলবে — ভাই এটা আমাদের Best Price, ডিসকাউন্ট দেওয়ার সুযোগ নেই। তবে ২টা নিলে ফ্রি ডেলিভারি পাবেন!",
    tips: "AI will use your tone/technique, but system guardrails prevent it from inventing fake discounts.",
    presets: [
      {
        label: "Strict Best Price",
        text: "কাস্টমার দাম কমাতে চাইলে আন্তরিকতার সাথে বোঝাবেন যে এটি আমাদের ফিক্সড ও বেস্ট প্রাইস। কোয়ালিটির সাথে কোনো আপস করা হয় না।",
      },
      {
        label: "Bundle / Combo Offer",
        text: "একক পণ্যে কোনো ছাড় নেই। তবে কাস্টমার ২ বা ততোধিক প্রোডাক্ট একসাথে নিলে ডেলিভারি চার্জ ফ্রি দেওয়ার অফার দিন।",
      },
    ],
  },
];

interface CategoryMeta {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgLight: string;
  borderHover: string;
  badgeBg: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "identity",
    title: "Store Profile & Brand Identity",
    subtitle: "Core business details AI uses to introduce and represent your shop.",
    icon: IconStore,
    color: "text-[#087F5B]",
    bgLight: "bg-[#E8F5EF]",
    borderHover: "hover:border-[#087F5B]/50",
    badgeBg: "bg-[#E8F5EF] text-[#087F5B]",
  },
  {
    id: "logistics",
    title: "Ordering & Delivery Logistics",
    subtitle: "Rules and rates the AI applies when collecting customer orders.",
    icon: IconShoppingBag,
    color: "text-[#2563EB]",
    bgLight: "bg-[#EFF6FF]",
    borderHover: "hover:border-[#2563EB]/50",
    badgeBg: "bg-[#EFF6FF] text-[#2563EB]",
  },
  {
    id: "payment",
    title: "Payment & Confirmation Templates",
    subtitle: "Payment numbers, accepted gateways, and automated receipt messages.",
    icon: IconCreditCard,
    color: "text-[#D97706]",
    bgLight: "bg-[#FFF4E5]",
    borderHover: "hover:border-[#D97706]/50",
    badgeBg: "bg-[#FFF4E5] text-[#D97706]",
  },
  {
    id: "policy",
    title: "Store Policies & Price Negotiation",
    subtitle: "Customer protection policies, warranties, and price objection strategies.",
    icon: IconFileText,
    color: "text-[#8B5CF6]",
    bgLight: "bg-[#F3E8FF]",
    borderHover: "hover:border-[#8B5CF6]/50",
    badgeBg: "bg-[#F3E8FF] text-[#8B5CF6]",
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
    priceNegotiation: "",
  });

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState("");

  // Accordion state (all open by default)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<CategoryId, boolean>>({
    identity: false,
    logistics: false,
    payment: false,
    policy: false,
  });

  // Modal State
  const [activeModalField, setActiveModalField] = useState<FieldDefinition | null>(null);
  const [modalValue, setModalValue] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            priceNegotiation: c.priceNegotiation ?? "",
          });
        }
        setLoaded(true);
      })
      .catch((e) => setError(e.message || "Failed to load business settings"));
  }, [pageId]);

  // ESC key and Ctrl+Enter keyboard listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && activeModalField) {
        closeModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && activeModalField) {
        e.preventDefault();
        handleSaveModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalField, modalValue, form]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (activeModalField) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModalField]);

  function toggleCategory(catId: CategoryId) {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  }

  function openFieldModal(fieldDef: FieldDefinition) {
    setActiveModalField(fieldDef);
    setModalValue(form[fieldDef.key] || "");
    setError("");
  }

  function closeModal() {
    setActiveModalField(null);
    setModalValue("");
  }

  // Save changes for specific field
  async function handleSaveModal() {
    if (!activeModalField) return;

    if (activeModalField.required && !modalValue.trim()) {
      setError(`${activeModalField.label} is required and cannot be empty.`);
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
          priceNegotiation: updatedForm.priceNegotiation || null,
        }),
      });

      setForm(updatedForm);
      setSavedToast(true);
      closeModal();
      setTimeout(() => setSavedToast(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
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
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update switch");
    }
  }

  // Completeness stats
  const { completeness, configuredCount, totalCount, categoryCounts } = useMemo(() => {
    let filled = 0;
    const catCounts: Record<CategoryId, { filled: number; total: number }> = {
      identity: { filled: 0, total: 0 },
      logistics: { filled: 0, total: 0 },
      payment: { filled: 0, total: 0 },
      policy: { filled: 0, total: 0 },
    };

    FIELD_DEFINITIONS.forEach((field) => {
      catCounts[field.category].total += 1;
      const val = form[field.key];
      if (val && val.trim()) {
        filled += 1;
        catCounts[field.category].filled += 1;
      }
    });

    const percent = Math.round((filled / FIELD_DEFINITIONS.length) * 100);
    return {
      completeness: percent,
      configuredCount: filled,
      totalCount: FIELD_DEFINITIONS.length,
      categoryCounts: catCounts,
    };
  }, [form]);

  // Jump to first incomplete field
  function handleJumpToIncomplete() {
    const firstIncomplete = FIELD_DEFINITIONS.find((f) => !form[f.key]?.trim());
    if (firstIncomplete) {
      openFieldModal(firstIncomplete);
    }
  }

  if (!pageId) return <Spinner />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 font-sans">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-[#087F5B]/30 bg-gradient-to-br from-[#065F46] via-[#087F5B] to-[#0A966E] p-6 sm:p-8 text-white shadow-lg">
        {/* Subtle decorative glow circle */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-md">
              <IconSparkles size={14} className="text-[#A7F3D0]" />
              <span>AI Knowledge Base & Business Rules</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Business Information Context
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Teach your AI sales copilot how your store operates: brand story, delivery rates, payment methods, and negotiation strategies.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                {completeness}%
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Context Score</div>
                <div className="text-white/70">
                  {configuredCount} of {totalCount} configured
                </div>
              </div>
            </div>

            {completeness < 100 && (
              <button
                type="button"
                onClick={handleJumpToIncomplete}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#065F46] shadow-md transition-all hover:bg-[#E8F5EF] active:scale-95"
              >
                <IconZap size={15} />
                <span>Complete Next Field</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Notification Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-[#087F5B] bg-[#065F46] px-5 py-3 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <IconCheckCircle2 size={18} className="text-[#A7F3D0]" />
          <span>Settings saved & synced to AI Sales Agent</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs font-medium text-danger">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. MASTER AI KNOWLEDGE SWITCH */}
      <Card className="p-5 border-[#D0E7DC] bg-[#F6FBF8]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                form.useBusinessInfo
                  ? "bg-[#E8F5EF] text-[#087F5B]"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              <IconSparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#101828]">
                  AI Context Injection Switch
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    form.useBusinessInfo
                      ? "bg-[#E8F5EF] text-[#087F5B]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {form.useBusinessInfo ? "● Live & Active" : "○ Inactive"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#475569]">
                When active, all verified business facts, delivery rates, and store negotiation rules are injected into customer conversations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs font-bold text-[#172033]">
              {form.useBusinessInfo ? "Context Active" : "Context Paused"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.useBusinessInfo}
              onClick={toggleMasterSwitch}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.useBusinessInfo ? "bg-[#087F5B]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  form.useBusinessInfo ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {!loaded ? (
        <div className="flex h-72 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        /* 3. 2-COLUMN MAIN CONTENT GRID */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 8 COLS: Categorized Field Cards */}
          <div className="space-y-6 lg:col-span-8">
            {CATEGORIES.map((cat) => {
              const catFields = FIELD_DEFINITIONS.filter((f) => f.category === cat.id);
              const counts = categoryCounts[cat.id];
              const isCollapsed = collapsedCategories[cat.id];
              const CatIcon = cat.icon;

              return (
                <Card
                  key={cat.id}
                  className="overflow-hidden border border-[#E5E7EB] bg-white transition-all shadow-2xs"
                >
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(cat.id)}
                    className="flex cursor-pointer items-center justify-between border-b border-[#E5E7EB] bg-[#FAFCFB] px-6 py-4 transition-colors hover:bg-[#F2F7F4]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${cat.bgLight} ${cat.color}`}
                      >
                        <CatIcon size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#101828]">{cat.title}</h2>
                        <p className="text-[11px] text-[#64748B]">{cat.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          counts.filled === counts.total
                            ? "bg-[#E8F5EF] text-[#087F5B]"
                            : "bg-[#FFF4E5] text-[#D97706]"
                        }`}
                      >
                        {counts.filled}/{counts.total} Configured
                      </span>
                      <div
                        className={`text-neutral-400 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      >
                        <IconChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Category Content List */}
                  {!isCollapsed && (
                    <div className="divide-y divide-[#F1F5F9] p-2 sm:p-3">
                      {catFields.map((field) => {
                        const val = form[field.key];
                        const isSet = Boolean(val && val.trim());

                        return (
                          <div
                            key={field.key}
                            onClick={() => openFieldModal(field)}
                            className="group relative flex cursor-pointer flex-col gap-2 rounded-xl p-4 transition-all duration-150 hover:bg-[#FAFCFB] hover:border-[#087F5B]/30"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      isSet
                                        ? "bg-[#087F5B]"
                                        : field.required
                                        ? "bg-amber-500 animate-pulse"
                                        : "bg-neutral-300"
                                    }`}
                                  />
                                  <span className="text-xs font-bold text-[#101828]">
                                    {field.label}
                                  </span>
                                  {field.required && (
                                    <span className="rounded bg-danger-soft px-1.5 py-0.2 text-[10px] font-bold text-danger">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#64748B]">
                                  {field.description}
                                </p>
                              </div>

                              <button
                                type="button"
                                aria-label={`Edit ${field.label}`}
                                className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-[#D9E2E8] bg-white px-2.5 text-[11px] font-semibold text-[#172033] shadow-2xs group-hover:border-[#087F5B] group-hover:bg-[#E8F5EF] group-hover:text-[#087F5B] transition-all"
                              >
                                <IconEdit size={12} />
                                <span>Edit</span>
                              </button>
                            </div>

                            {/* View-Only Content Box */}
                            <div className="mt-1 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-3 text-xs">
                              {isSet ? (
                                <div className="space-y-1">
                                  <div className="whitespace-pre-wrap font-medium text-[#172033] line-clamp-3 leading-relaxed">
                                    {val}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#94A3B8]">
                                    <span>Verified AI Instruction</span>
                                    <span>{val?.length} chars</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[#94A3B8] italic">
                                  <IconPlus size={14} className="text-[#087F5B]" />
                                  <span>
                                    Not configured yet. Click to enter instructions...
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* RIGHT 4 COLS: Profile Strength & Live Simulation */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-6 space-y-6">
              {/* Card 1: Circular Profile Readiness */}
              <Card className="p-6 space-y-5 border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                    Knowledge Health
                  </h3>
                  <span className="rounded-full bg-[#E8F5EF] px-2.5 py-0.5 text-[11px] font-bold text-[#087F5B]">
                    {completeness >= 80 ? "High Fidelity" : completeness >= 50 ? "Moderate" : "Incomplete"}
                  </span>
                </div>

                {/* Circular Progress Display */}
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-neutral-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#087F5B] transition-all duration-700 ease-out"
                        strokeDasharray={`${completeness}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-base font-extrabold text-[#101828]">
                      {completeness}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#101828]">
                      {configuredCount} of {totalCount} sections ready
                    </p>
                    <p className="text-[11px] text-[#64748B] leading-tight">
                      More details ensure precise replies and zero hallucinations.
                    </p>
                  </div>
                </div>

                {/* Category Checklist */}
                <div className="space-y-2 border-t border-[#F1F5F9] pt-4 text-xs">
                  {CATEGORIES.map((cat) => {
                    const counts = categoryCounts[cat.id];
                    const isAll = counts.filled === counts.total;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between text-[#475569]"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAll ? "bg-[#087F5B]" : "bg-amber-400"
                            }`}
                          />
                          <span>{cat.title}</span>
                        </span>
                        <span className="font-bold text-[#101828]">
                          {counts.filled}/{counts.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Card 2: Live AI Assistant Simulator */}
              <Card className="overflow-hidden border-[#D0E7DC] bg-[#FAFCFB] shadow-sm">
                <div className="border-b border-[#E5E7EB] bg-[#F2F8F5] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#087F5B] text-white text-[10px] font-bold">
                      AI
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#101828]">
                        {form.businessName || "Store Sales Assistant"}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-[#087F5B] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#087F5B] animate-pulse" />
                        <span>Live Simulation</span>
                      </div>
                    </div>
                  </div>

                  <span className="rounded bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold text-[#087F5B]">
                    Messenger
                  </span>
                </div>

                {/* Simulated Chat Interface */}
                <div className="p-4 space-y-3 text-[11px]">
                  {/* Customer Message */}
                  <div className="flex flex-col items-end">
                    <div className="rounded-2xl rounded-tr-xs bg-[#0084FF] px-3.5 py-2 text-white max-w-[85%] shadow-xs leading-relaxed">
                      ভাইয়া, আপনাদের ডেলিভারি চার্জ কত? আর শপ কোথায়?
                    </div>
                    <span className="mt-0.5 text-[9px] text-[#94A3B8]">Customer</span>
                  </div>

                  {/* AI Response */}
                  <div className="flex flex-col items-start">
                    <div className="rounded-2xl rounded-tl-xs bg-white border border-[#E2E8F0] p-3 text-[#172033] max-w-[90%] shadow-xs space-y-1.5 leading-relaxed">
                      <p>
                        {form.businessName ? `আসসালামু আলাইকুম! ${form.businessName}-এ আপনাকে স্বাগতম 😊` : "আসসালামু আলাইকুম! আমাদের শপে স্বাগতম 😊"}
                      </p>
                      <p className="text-[#475569]">
                        {form.deliveryInfo
                          ? `আমাদের ডেলিভারি চার্জ: ${form.deliveryInfo.split("\n")[0]}`
                          : "আমাদের ডেলিভারি চার্জ: ঢাকার ভিতরে ৬০ টাকা ও ঢাকার বাইরে ১২০ টাকা।"}
                      </p>
                      {form.businessInfo && (
                        <p className="text-[#087F5B] font-medium text-[10px]">
                          {form.businessInfo.slice(0, 80)}...
                        </p>
                      )}
                    </div>
                    <span className="mt-0.5 text-[9px] text-[#087F5B] font-semibold">
                      Generated from your Business Info
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 4. SPLIT-PANEL MODAL EDITOR */}
      {activeModalField && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeModal}
          />

          {/* Modal Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <div
              className="relative flex h-[90vh] max-h-[860px] w-[96vw] max-w-6xl flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#FAFCFB] px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                    <IconEdit size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-bold text-[#101828]">
                        Edit {activeModalField.label}
                      </h2>
                      {activeModalField.required && (
                        <span className="rounded bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {activeModalField.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block rounded-md bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold text-[#64748B]">
                    ESC to cancel
                  </span>
                  <button
                    type="button"
                    aria-label="Close modal"
                    onClick={closeModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body: 2-Column Split Panel */}
              <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
                {/* Left Panel: The Interactive Editor (7 cols) */}
                <div className="flex flex-col space-y-4 p-6 lg:col-span-7">
                  {/* Preset Template Chips */}
                  {activeModalField.presets && activeModalField.presets.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-[#64748B]">
                        💡 Quick Preset Templates:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {activeModalField.presets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setModalValue(preset.text)}
                            className="rounded-lg border border-[#D0E7DC] bg-[#F2FBF7] px-3 py-1.5 text-xs font-semibold text-[#087F5B] hover:bg-[#E8F5EF] transition-colors"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variable Helper Tag */}
                  {activeModalField.hasVariableHelper && (
                    <div className="flex items-center justify-between rounded-xl border border-[#B7DEC9] bg-[#E8F5EF]/60 p-3 text-xs text-[#065F46]">
                      <span>Insert remaining order amount tag:</span>
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

                  {/* Textarea Input */}
                  <div className="flex flex-1 flex-col space-y-1.5">
                    <label className="text-xs font-bold text-[#172033]">
                      Instructions & Context:
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={modalValue}
                      onChange={(e) => setModalValue(e.target.value)}
                      placeholder={activeModalField.placeholder}
                      className="flex-1 min-h-[280px] sm:min-h-[360px] w-full rounded-xl border border-[#D9E2E8] p-4 text-xs sm:text-[13px] leading-relaxed text-[#172033] placeholder:text-[#94A3B8] focus:border-[#087F5B] focus:outline-none focus:ring-1 focus:ring-[#087F5B]"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Press Ctrl + Enter to save changes</span>
                      <span className="font-mono font-semibold text-[#101828]">
                        {modalValue.length} characters
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: AI Live Context Preview (5 cols) */}
                <div className="flex flex-col space-y-4 bg-[#FAFCFB] p-6 lg:col-span-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#101828]">
                    <IconSparkles size={16} className="text-[#087F5B]" />
                    <span>How AI interprets this field</span>
                  </div>

                  <div className="rounded-xl border border-[#D0E7DC] bg-white p-4 text-xs space-y-3 shadow-2xs">
                    <div className="text-[11px] font-bold uppercase text-[#087F5B]">
                      Prompt Section Mapping
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] p-3 font-mono text-[11px] text-[#334155] border border-[#E2E8F0] whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {activeModalField.key === "priceNegotiation" ? (
                        <>## PRICE OBJECTION & NEGOTIATION{"\n"}{modalValue || "(No custom negotiation instructions set)"}</>
                      ) : (
                        <>## BUSINESS CONTEXT{"\n"}{activeModalField.label}: {modalValue || "(empty)"}</>
                      )}
                    </div>
                  </div>

                  {activeModalField.tips && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-4 text-xs text-[#475569] space-y-1">
                      <div className="font-bold text-[#101828]">💡 Best Practice Tip</div>
                      <p>{activeModalField.tips}</p>
                    </div>
                  )}

                  {activeModalField.key === "priceNegotiation" && (
                    <div className="rounded-xl border border-amber-200 bg-[#FFFBEB] p-4 text-xs text-[#92400E] space-y-1">
                      <div className="font-bold">⚠️ System Pricing Guardrail</div>
                      <p>
                        Negotiation instructions guide AI tone and counter-offers, but the AI will NEVER fabricate unauthorized discounts not present in the catalog.
                      </p>
                    </div>
                  )}
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

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block text-[11px] text-[#64748B]">
                    Ctrl + Enter to save
                  </span>
                  <Button
                    onClick={handleSaveModal}
                    disabled={saving}
                    className="h-9 bg-[#087F5B] px-6 text-xs font-bold text-white hover:bg-[#066B4D] shadow-sm"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
