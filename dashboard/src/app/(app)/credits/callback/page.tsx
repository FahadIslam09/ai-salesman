"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";
import { IconCheck, IconX, IconSparkles, IconArrowRight } from "@/components/Icons";

function CallbackInner() {
  const params = useSearchParams();
  const paymentID = params.get("paymentID") ?? "";
  const status = params.get("status") ?? "";
  const [state, setState] = useState<"verifying" | "paid" | "failed">("verifying");
  const [message, setMessage] = useState("");
  const [trxID, setTrxID] = useState("");

  useEffect(() => {
    if (status === "cancel") {
      setState("failed");
      setMessage("Payment was cancelled by the user.");
      return;
    }
    if (status === "failure") {
      setState("failed");
      setMessage("bKash payment failed. Please try again.");
      return;
    }
    if (!paymentID) {
      setState("failed");
      setMessage("No payment ID found in the callback URL.");
      return;
    }

    api<{ ok: boolean; trxID?: string; alreadyPaid?: boolean }>("/api/credits/recharge/execute", {
      method: "POST",
      body: JSON.stringify({ paymentID }),
    })
      .then((res) => {
        if (res.trxID) setTrxID(res.trxID);
        setState("paid");
      })
      .catch((e) => {
        setState("failed");
        setMessage(e.message || "bKash verification failed.");
      });
  }, [paymentID, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 font-sans">
      <Card className="w-full max-w-md p-8 text-center rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {state === "verifying" && (
          <div className="py-6 space-y-4">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101828]">Verifying bKash Payment</h2>
              <p className="mt-1 text-xs text-[#64748B]">Please wait while we confirm your transaction…</p>
            </div>
          </div>
        )}

        {state === "paid" && (
          <div className="py-4 space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5EF] text-[#087F5B]">
              <IconCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828]">Payment Confirmed!</h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Your bKash recharge was successful and credits have been credited to your balance.
              </p>
            </div>

            {trxID && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                <span className="font-semibold text-[#101828]">Transaction ID: </span>
                <span className="font-mono">{trxID}</span>
              </div>
            )}

            <Link
              href="/credits"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#066B4D]"
            >
              <span>View Credit Balance</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        )}

        {state === "failed" && (
          <div className="py-4 space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
              <IconX size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#101828]">Payment Verification Incomplete</h2>
              <p className="mt-1 text-xs text-[#64748B]">{message || "bKash could not verify this payment."}</p>
            </div>

            <Link
              href="/credits"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#172033] px-5 text-xs font-semibold text-white shadow-xs hover:bg-black"
            >
              <span>Back to Credits</span>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <CallbackInner />
    </Suspense>
  );
}
