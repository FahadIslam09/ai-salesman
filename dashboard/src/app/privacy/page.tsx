import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Ai Salesman",
  description: "Privacy policy and data handling guidelines for Ai Salesman automation services.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-mute mb-8">
            Last Updated: August 15, 2026
          </p>

          <div className="space-y-8 text-ink leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                1. Introduction
              </h2>
              <p className="text-sm">
                Ai Salesman ("we," "our," or "us") provides AI-powered messaging automation tools for Facebook Pages. We are committed to protecting your privacy and the privacy of your customers. This Privacy Policy describes how we collect, use, store, and share information when you use our platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                2. Information We Collect
              </h2>
              <p className="text-sm">
                To provide our automation services, we collect and process the following information:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>
                  <strong className="text-ink">Account Registration:</strong> When you register on our platform, we collect your name, email address, and authentication credentials.
                </li>
                <li>
                  <strong className="text-ink">Facebook Integration Data:</strong> When you connect a Facebook Page, we obtain a Page Access Token, the Page ID, and the Page name.
                </li>
                <li>
                  <strong className="text-ink">Customer Interactions:</strong> We ingest messages, postbacks, and public comments sent by users to your connected Facebook Page. This includes the customer's App-Scoped User ID (PSID), name, profile picture, and message/comment text content.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                3. How We Use Your Information
              </h2>
              <p className="text-sm">
                The collected information is used solely to perform the following core tasks:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>Generate and deliver AI-powered responses to incoming customer messages and comments.</li>
                <li>Track messaging volume to manage and deduct package credits.</li>
                <li>Provide analytics and conversation history on your dashboard.</li>
                <li>Maintain the security, performance, and stability of our platform.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                4. Data Security and Encryption
              </h2>
              <p className="text-sm">
                We take security seriously. All Page Access Tokens granted to us are stored fully encrypted using industry-standard **AES-256-CBC encryption**. 
                We do not sell, rent, or trade your personal data or your customers' data to third-party advertisers. Data is shared with AI processing partners (e.g. OpenAI/OpenRouter) strictly for generating replies and is not used to train public LLM models.
              </p>
            </section>

            <section className="space-y-3 p-6 bg-leaf-soft rounded-lg border border-leaf/10">
              <h2 className="text-xl font-display font-semibold text-leaf" id="data-deletion-instructions">
                5. User Data Deletion Instructions (Meta Compliance)
              </h2>
              <p className="text-sm text-ink">
                We respect your rights over your data. If you wish to delete your account or remove Facebook Page data linked with our platform:
              </p>
              <ol className="list-decimal pl-5 text-sm space-y-2 mt-2 text-ink">
                <li>
                  Go to your Facebook Profile → **Settings & Privacy** → **Settings** → **Business Integrations**.
                </li>
                <li>
                  Find **Ai Salesman** and click **Remove**.
                </li>
                <li>
                  To permanently delete all stored data (conversation history, customer tags, and credentials) from our servers, please send an email request to **fahadislam.fi.99@gmail.com** with the subject "Data Deletion Request". We will process and purge your data within 48 hours.
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                6. Changes to this Policy
              </h2>
              <p className="text-sm">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the last updated date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-display font-semibold text-ink">
                7. Contact Us
              </h2>
              <p className="text-sm">
                If you have questions, feedback, or concerns about this policy, please contact us at:
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
