import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | Ai Salesman",
  description: "Terms and conditions of service for using the Ai Salesman automation platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center pb-8 border-b border-line mb-8">
          <Link href="/" className="font-display text-2xl font-bold text-ink hover:opacity-80 transition-opacity">
            Ai Salesman
          </Link>
          <Link
            href="/login"
            id="nav-login-btn"
            className="text-sm font-semibold text-leaf hover:underline decoration-leaf decoration-2"
          >
            Back to Dashboard
          </Link>
        </header>

        {/* Content Card */}
        <main className="bg-surface rounded-xl border border-line p-8 sm:p-12 shadow-sm">
          <h1 className="font-display text-3xl sm:text-4xl text-ink font-bold mb-6">
            Terms and Conditions
          </h1>
          <p className="text-sm text-mute mb-8">
            Last Updated: August 15, 2026
          </p>

          <div className="space-y-8 text-ink leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm">
                By registering an account and using the Ai Salesman platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                2. Description of Service
              </h2>
              <p className="text-sm">
                Ai Salesman provides software tools that connect to Facebook Pages via the Meta Graph API. The Service automatically analyzes incoming comments and messages, generates AI replies, and delivers them on behalf of the page owner. The Service also includes credit packages, follow-ups, and customer analytics.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                3. User Account Responsibilities
              </h2>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>You must provide accurate registration details and maintain the security of your login credentials.</li>
                <li>You are solely responsible for all activities, messages, and comment replies initiated by the AI bot under your connected Page.</li>
                <li>You must not use the Service to spam, send malicious content, or violate Meta's Platform Terms and Developer Policies.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                4. Billing, Packages, and Credits
              </h2>
              <p className="text-sm">
                Our Service operates on a credit consumption model (e.g. 1 credit per automated response).
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>All package purchases are final. We use secure third-party payment gateways (such as bKash).</li>
                <li>Credits have no cash value and are non-transferable.</li>
                <li>Refunds are not provided for unused credits, account deletions, or Page bans resulting from terms violation.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                5. Compliance with Facebook/Meta Policies
              </h2>
              <p className="text-sm">
                You agree to comply with Facebook's Community Standards, Meta's Developer Policies, and general messaging limits (e.g., the 24-hour messaging window). We are not liable for any actions taken by Meta against your Facebook Page, Business Manager, or Ad accounts.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                6. Limitation of Liability
              </h2>
              <p className="text-sm">
                To the maximum extent permitted by law, Ai Salesman shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>Your use of or inability to use the Service.</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein.</li>
                <li>Any bugs, inaccuracies, or delays in AI-generated replies.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                7. Termination of Service
              </h2>
              <p className="text-sm">
                We reserve the right to suspend or terminate your account and Page connection at our sole discretion, without prior notice, if we believe you have violated these Terms or Meta's Platform Policies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                8. Contact Us
              </h2>
              <p className="text-sm">
                For questions regarding these Terms and Conditions, please contact:
              </p>
              <p className="text-sm font-semibold text-ink">
                Email: fahadislam.fi.99@gmail.com
              </p>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center pt-8 text-xs text-mute border-t border-line mt-8">
          &copy; {new Date().getFullYear()} Ai Salesman. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
