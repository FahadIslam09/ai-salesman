"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePage } from "@/components/PageProvider";
import { Button, Card, Field, Input, Spinner, TextArea } from "@/lib/ui";

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
}

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
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageId) return;
    setLoaded(false);
    api<BotConfig | null>(`/api/settings/${pageId}`)
      .then((c) => {
        if (c) {
          setForm({
            useBusinessInfo: c.useBusinessInfo,
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
          });
        }
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [pageId]);

  if (!pageId) return <Spinner />;

  async function save() {
    if (!form.businessName.trim() || !form.contactNumber.trim() || !form.businessInfo.trim()) {
      setError("Business name, contact number, and description are required.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await api(`/api/settings/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          useBusinessInfo: form.useBusinessInfo,
          businessName: form.businessName || null,
          businessType: form.businessType || null,
          contactNumber: form.contactNumber || null,
          businessInfo: form.businessInfo || null,
          orderInfo: form.orderInfo || null,
          paymentInfo: form.paymentInfo || null,
          deliveryInfo: form.deliveryInfo || null,
          additionalInfo: form.additionalInfo || null,
          returnPolicy: form.returnPolicy || null,
          exchangePolicy: form.exchangePolicy || null,
          refundPolicy: form.refundPolicy || null,
          warranty: form.warranty || null,
        }),
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base font-semibold text-ink">Use business information</p>
            <p className="text-xs text-mute">
              When on, the AI uses your saved business info as context when talking to customers.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-sm text-ink">{form.useBusinessInfo ? "On" : "Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.useBusinessInfo}
              onClick={() => setForm({ ...form, useBusinessInfo: !form.useBusinessInfo })}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.useBusinessInfo ? "bg-leaf" : "bg-neutral-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${form.useBusinessInfo ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </label>
        </div>
      </Card>

      {!loaded ? (
        <Spinner />
      ) : (
        <Card className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name (required)">
              <Input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Trendy Wear BD"
              />
            </Field>
            <Field label="Business type / category">
              <Input
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                placeholder="পোশাক ও ফ্যাশন"
              />
            </Field>
          </div>
          <Field label="Contact number (required)">
            <Input
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              placeholder="017XXXXXXXX"
            />
          </Field>
          <Field label="Business description (required)">
            <TextArea
              rows={4}
              value={form.businessInfo}
              onChange={(e) => setForm({ ...form, businessInfo: e.target.value })}
              placeholder="Trendy Wear BD একটি অনলাইন পোশাকের শপ। আমরা ছেলেদের জন্য Premium Shirt, T-Shirt, Polo Shirt এবং Casual Wear বিক্রি করি। ভালো মানের কাপড়, আধুনিক ডিজাইন এবং যুক্তিসঙ্গত দামের ওপর আমরা গুরুত্ব দিই। আমরা আরামদায়ক কাপড়, আধুনিক ডিজাইন, ভালো ফিনিশিং এবং যুক্তিসঙ্গত দামের পণ্য দেওয়ার চেষ্টা করি।"
            />
          </Field>
          <Field label="Order information">
            <TextArea
              rows={3}
              value={form.orderInfo}
              onChange={(e) => setForm({ ...form, orderInfo: e.target.value })}
              placeholder={DEFAULT_ORDER_INFO}
            />
          </Field>
          <Field label="Payment method">
            <TextArea
              rows={3}
              value={form.paymentInfo}
              onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })}
              placeholder={DEFAULT_PAYMENT_INFO}
            />
          </Field>
          <Field label="Delivery information">
            <TextArea
              rows={3}
              value={form.deliveryInfo}
              onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })}
              placeholder={DEFAULT_DELIVERY_INFO}
            />
          </Field>
          <p className="pt-1 font-display text-base font-semibold text-ink">Return & Exchange Policy</p>
          <Field label="Return policy">
            <TextArea
              rows={3}
              value={form.returnPolicy}
              onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
              placeholder={DEFAULT_RETURN_POLICY}
            />
          </Field>
          <Field label="Exchange policy">
            <TextArea
              rows={3}
              value={form.exchangePolicy}
              onChange={(e) => setForm({ ...form, exchangePolicy: e.target.value })}
              placeholder={DEFAULT_EXCHANGE_POLICY}
            />
          </Field>
          <Field label="Refund policy">
            <TextArea
              rows={3}
              value={form.refundPolicy}
              onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })}
              placeholder={DEFAULT_REFUND_POLICY}
            />
          </Field>
          <Field label="Warranty">
            <TextArea
              rows={3}
              value={form.warranty}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              placeholder={DEFAULT_WARRANTY}
            />
          </Field>
          <Field label="Additional business information (optional)">
            <TextArea
              rows={3}
              value={form.additionalInfo}
              onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
              placeholder="Return/exchange rules, communication rules, ordering instructions, other policies…"
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-leaf">Saved.</span>}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-xs text-mute">
            The AI uses this information when talking to customers. Delivery questions are answered
            from the delivery information above.
          </p>
        </Card>
      )}
    </div>
  );
}
