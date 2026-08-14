"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/lib/ui";

function CallbackInner() {
  const params = useSearchParams();
  const paymentID = params.get("paymentID") ?? "";
  const [state, setState] = useState<"verifying" | "paid" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!paymentID) {
      setState("failed");
      setMessage("No payment ID found in the URL.");
      return;
    }
    api("/api/credits/recharge/execute", {
      method: "POST",
      body: JSON.stringify({ paymentID }),
    })
      .then(() => setState("paid"))
      .catch((e) => {
        setState("failed");
        setMessage(e.message);
      });
  }, [paymentID]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 text-center">
        {state === "verifying" && (
          <>
            <Spinner />
            <p className="mt-4 text-sm text-mute">Verifying your bKash payment…</p>
          </>
        )}
        {state === "paid" && (
          <>
            <p className="font-display text-2xl font-semibold text-leaf">Payment confirmed</p>
            <p className="mt-2 text-sm text-mute">Your credits have been added. You can close this tab.</p>
            <Link href="/credits" className="mt-6 inline-block font-medium text-leaf hover:underline">
              View my credits
            </Link>
          </>
        )}
        {state === "failed" && (
          <>
            <p className="font-display text-2xl font-semibold text-danger">Verification failed</p>
            <p className="mt-2 text-sm text-mute">{message || "bKash could not verify this payment."}</p>
            <Link href="/credits" className="mt-6 inline-block font-medium text-leaf hover:underline">
              Back to credits
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackInner />
    </Suspense>
  );
}
