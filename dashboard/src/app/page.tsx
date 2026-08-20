"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconSparkles,
  IconStore,
  IconUsers,
  IconCheck,
  IconChevronRight,
  IconArrowRight,
  IconZap,
  IconLayers,
  IconShield,
  IconCoins,
  IconMessageSquare,
  IconShoppingBag,
  IconTrendingUp,
  IconActivity,
  IconClock,
  IconLock,
  IconGlobe,
  IconMenu,
  IconX,
} from "@/components/Icons";

const DEMO_CONVERSATIONS = [
  {
    title: "Product Inquiry & Sales Close",
    badge: "Fashion / Apparel",
    messages: [
      { sender: "customer", text: "Assalamu Alaikum, Black hoodie ta ki available ache? M size hobe?", time: "11:42 PM" },
      { sender: "ai", text: "ওয়ালাইকুম আসসালাম! 😊 হ্যাঁ, Mens Premium Hoodie Urban - Black কালারে M সাইজ এভেইলেবল আছে। প্রাইস ৳১,৪৫০। ডেলিভারি চার্জ ঢাকার ভেতর ৬০ টাকা, ঢাকার বাইরে ১২০ টাকা। আপনি কি অর্ডারটি কনফার্ম করতে চান?", time: "11:42 PM" },
      { sender: "customer", text: "Haa confirm korbo, kivabe order korbo?", time: "11:43 PM" },
      { sender: "ai", text: "অর্ডারটি নিশ্চিত করতে অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং পূর্ণ ডেলিভারি ঠিকানা দিন।", time: "11:43 PM" },
      { sender: "customer", text: "Fahad Islam, 01711223344, House 12, Road 5, Dhanmondi, Dhaka", time: "11:44 PM" },
      { sender: "ai", text: "ধন্যবাদ Fahad Islam! 🛍️ আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।\n\n📦 প্রোডাক্ট: Mens Premium Hoodie Urban (Black, M)\n💰 মোট মূল্য: ৳১,৫১০ (Cash on Delivery)\n🚚 ডেলিভারি: ২-৩ কার্যদিবস।", time: "11:44 PM", isOrder: true },
    ],
  },
  {
    title: "Handling Objections & Discount",
    badge: "Electronics / Gadgets",
    messages: [
      { sender: "customer", text: "Price ki kom hobe? Kono discount ache?", time: "02:15 AM" },
      { sender: "ai", text: "আমাদের প্রোডাক্টগুলো প্রিমিয়াম ১০০% অথেনটিক এবং ৬ মাসের অফিশিয়াল ওয়ারেন্টি সহ আসে। আপনি যদি আজই ২ বা ততোধিক আইটেম একসাথে নেন, তবে ফ্রি হোম ডেলিভারি সুবিধা পাবেন! 😊", time: "02:15 AM" },
      { sender: "customer", text: "Accha taile 2 ta pathay den. Address dicchi...", time: "02:16 AM" },
    ],
  },
  {
    title: "Instant Size & Stock Check",
    badge: "Footwear / Retail",
    messages: [
      { sender: "customer", text: "Leather formal shoes 42 size hobe?", time: "04:30 PM" },
      { sender: "ai", text: "হ্যাঁ, সাইজ ৪২ একদম রেডি স্টক আছে! প্রিমিয়াম জেনুইন লেদার এবং মেমোরি ফোম কুশন সহ। আপনি ক্যাশ অন ডেলিভারিতে ট্রায়াল দেখে নিতে পারবেন।", time: "04:30 PM" },
    ],
  },
];

const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    priceBdt: 199,
    credits: "13,000",
    conversations: "~600 Chats",
    popular: false,
    description: "Perfect for testing and small boutique pages.",
    features: [
      "13,000 AI Credits (with bonus)",
      "24/7 AI Sales Closer Agent",
      "Natural Bengali & Banglish Support",
      "Dynamic Product Catalog Training",
      "Automated Order & Address Capture",
      "No Credit Expiration Period",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceBdt: 499,
    credits: "32,500",
    conversations: "~1,600 Chats",
    popular: true,
    description: "Most popular for growing Facebook & Instagram stores.",
    features: [
      "32,500 AI Credits (with bonus)",
      "24/7 AI Sales Closer Agent",
      "Natural Bengali & Banglish Support",
      "Smart Cart Recovery & Follow-ups",
      "Automated Order & Address Capture",
      "Priority AI Response Speed",
      "No Credit Expiration Period",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceBdt: 999,
    credits: "65,000",
    conversations: "~3,500 Chats",
    popular: false,
    description: "High-volume sales machines with active ad campaigns.",
    features: [
      "65,000 AI Credits (with bonus)",
      "Multi-page Store Management",
      "Advanced Sales Objection Handling",
      "Automated Order & Address Capture",
      "Smart Cart Recovery & Follow-ups",
      "VIP Dedicated Support",
      "No Credit Expiration Period",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceBdt: 1999,
    credits: "135,000",
    conversations: "~7,500 Chats",
    popular: false,
    description: "For established retail brands and agencies.",
    features: [
      "135,000 AI Credits (with bonus)",
      "Everything in Pro",
      "Instant Catalog Bulk Importer",
      "Custom Persona & Tone Tuning",
      "Highest Dedicated AI Compute",
      "No Credit Expiration Period",
    ],
  },
];

const FAQS = [
  {
    q: "How does the AI Sales Agent connect to my Facebook Page?",
    a: "In under 60 seconds! Simply log in to your dashboard, click 'Connect Facebook Page', select your store page, and authorize the connection. Our platform connects securely using official Meta Webhooks — no coding required.",
  },
  {
    q: "Does the AI truly understand natural Bengali and Banglish?",
    a: "Yes! Powered by high-speed neural models fine-tuned for local commerce, the AI natively understands phonetic Banglish (e.g. 'eitar color ki ki ache?', 'delivery kobe pabo?'), standard Bengali script, and English interchangeably.",
  },
  {
    q: "How does the AI capture orders and customer addresses?",
    a: "Once a customer decides to buy, the AI guides them through a polite step-by-step checkout. It asks for their Full Name, Phone Number, and Delivery Address, and automatically logs the completed order into your dashboard with status tracking.",
  },
  {
    q: "Can I take over the conversation as a human anytime?",
    a: "Absolutely! You can monitor live chats in real-time from your unified inbox. If you reply manually, the AI automatically pauses on that customer so you have 100% full control.",
  },
  {
    q: "Do purchased AI credits ever expire?",
    a: "Never! Your credits remain in your account forever until consumed by actual customer sales conversations. There are zero hidden monthly validity deadlines.",
  },
];

export default function LandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#0F172A] selection:bg-[#087F5B] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Background Ambient Glows & Pattern Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#087F5B]/12 via-[#10B981]/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[#087F5B]/6 blur-3xl rounded-full" />
        <div className="absolute top-[75%] left-[-10%] w-[600px] h-[600px] bg-[#087F5B]/6 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-pattern-grid radial-mask-bottom opacity-70" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0]/80 bg-white/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087F5B] text-white shadow-sm transition-transform group-hover:scale-105">
              <IconSparkles size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-[#0F172A]">AI Sales Bot</span>
                <span className="rounded-full bg-[#E8F5EF] px-2 py-0.5 text-[10px] font-bold text-[#087F5B] border border-[#087F5B]/20">
                  F-Commerce
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">Autonomous Sales Agent</span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#475569]">
            <a href="#features" className="hover:text-[#087F5B] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#087F5B] transition-colors">
              How It Works
            </a>
            <a href="#demo" className="hover:text-[#087F5B] transition-colors">
              Live Demo
            </a>
            <a href="#pricing" className="hover:text-[#087F5B] transition-colors">
              Pricing
            </a>
            <a href="#faqs" className="hover:text-[#087F5B] transition-colors">
              FAQs
            </a>
          </nav>

          {/* Right Action Tools */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-xs font-bold text-[#334155] hover:text-[#087F5B] hover:bg-[#E8F5EF]/60 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="relative group flex items-center gap-2 rounded-xl bg-[#087F5B] px-4.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#066B4D] transition-all hover:shadow-md"
            >
              <span>Get Started Free</span>
              <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#475569]"
          >
            {mobileMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E2E8F0] bg-white px-4 py-4 space-y-3 animate-dropdown">
            <div className="flex flex-col gap-2.5 text-xs font-semibold text-[#334155]">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1">How It Works</a>
              <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="py-1">Live Demo</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-1">Pricing</a>
              <a href="#faqs" onClick={() => setMobileMenuOpen(false)} className="py-1">FAQs</a>
            </div>
            <div className="pt-3 border-t border-[#E2E8F0] flex gap-2">
              <Link href="/login" className="flex-1 text-center py-2 text-xs font-bold border border-[#D9E2E8] rounded-xl">
                Sign In
              </Link>
              <Link href="/login" className="flex-1 text-center py-2 text-xs font-bold bg-[#087F5B] text-white rounded-xl">
                Start Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* =========================================================================
            Hero Section
            ========================================================================= */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Headlines & CTA */}
              <div className="lg:col-span-6 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#087F5B]/25 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B] shadow-2xs">
                  <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>The #1 AI Sales Closer for F-Commerce Stores</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0F172A] leading-[1.15]">
                  Turn Facebook Messages into{" "}
                  <span className="bg-gradient-to-r from-[#087F5B] via-[#10B981] to-[#087F5B] bg-clip-text text-transparent">
                    Automated Orders
                  </span>{" "}
                  24/7
                </h1>

                <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Never lose a customer at 2 AM again. Deploy an autonomous AI sales agent that speaks natural Bengali & Banglish, answers product questions instantly, checks stock, and collects customer delivery details on autopilot.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#087F5B] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#066B4D] hover:shadow-lg transition-all"
                  >
                    <span>Start Free Trial (50 Free Credits)</span>
                    <IconArrowRight size={16} />
                  </Link>

                  <a
                    href="#demo"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#D9E2E8] bg-white px-5 py-3.5 text-sm font-bold text-[#334155] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
                  >
                    <span>Try Live Sandbox Demo</span>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-[#64748B]">
                  <div className="flex items-center gap-1.5">
                    <IconCheck size={16} className="text-[#087F5B]" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconCheck size={16} className="text-[#087F5B]" />
                    <span>Connect in under 60 seconds</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconCheck size={16} className="text-[#087F5B]" />
                    <span>100% Meta Verified Webhook</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic Live Messenger AI Preview */}
              <div className="lg:col-span-6 relative">
                <div className="relative mx-auto max-w-md rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden glow-card">
                  {/* Mock Window Top Bar */}
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#FAFBFB] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#087F5B] text-white font-bold text-xs">
                          AI
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                          <span>Urban Men's Store</span>
                          <span className="rounded bg-[#E8F5EF] px-1.5 py-0.2 text-[9px] font-bold text-[#087F5B]">
                            AI Sales Bot
                          </span>
                        </div>
                        <p className="text-[10px] text-[#10B981] font-semibold">● Active Now • Replying in 1.2s</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#94A3B8]">
                      <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                      <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="p-4 space-y-3 bg-[#FAFBFB]/50 min-h-[380px] max-h-[420px] overflow-y-auto text-xs">
                    {DEMO_CONVERSATIONS[0].messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${m.sender === "customer" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                            m.sender === "customer"
                              ? "bg-[#087F5B] text-white rounded-br-xs shadow-2xs font-medium"
                              : "bg-white border border-[#E2E8F0] text-[#0F172A] rounded-bl-xs shadow-xs"
                          }`}
                        >
                          <div className="whitespace-pre-line">{m.text}</div>
                        </div>
                        <span className="text-[9px] text-[#94A3B8] mt-1 px-1">{m.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mock Input Bar */}
                  <div className="border-t border-[#E2E8F0] bg-white p-3 flex items-center gap-2">
                    <div className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#FAFBFB] px-3 py-2 text-xs text-[#94A3B8]">
                      Write a message in Bengali or Banglish…
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087F5B] text-white shadow-xs">
                      <IconSparkles size={14} />
                    </div>
                  </div>
                </div>

                {/* Floating Metrics Overlays */}
                <div className="hidden sm:flex absolute -bottom-6 -left-6 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xl animate-float">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                    <IconTrendingUp size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">+380% More Orders Closed</div>
                    <p className="text-[10px] text-[#64748B]">Zero missed late-night customers</p>
                  </div>
                </div>

                <div className="hidden sm:flex absolute -top-6 -right-6 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xl animate-float-delayed">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <IconShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">Instant Order Sync</div>
                    <p className="text-[10px] text-[#10B981] font-semibold">COD & Delivery Auto-Captured</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Platform Integrations & Social Proof Bar
            ========================================================================= */}
        <section className="py-10 border-y border-[#E2E8F0] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-6">
              Seamlessly Integrates With Your Favorite Tools & Couriers
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-white">f</span>
                <span>Facebook Pages</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#F58529] to-[#DD2A7B] text-white">IG</span>
                <span>Instagram Direct</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0084FF] text-white">M</span>
                <span>Messenger API</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E2136E] text-white font-bold text-xs">bK</span>
                <span>bKash Payment</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#087F5B] text-white font-bold text-xs">SF</span>
                <span>Steadfast / RedX</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Core Features / Solutions Grid
            ========================================================================= */}
        <section id="features" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B]">
                Intelligent Sales Capabilities
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Everything You Need to Automate F-Commerce Sales
              </h2>
              <p className="text-sm text-[#64748B]">
                Unlike generic rule-based chatbots, our AI understands context, handles complex product inquiries, and closes sales with high empathy.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F5EF] text-[#087F5B]">
                  <IconMessageSquare size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Autonomous Sales Closer</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Trained on thousands of real eCommerce closing dialogues. Understands Banglish, handles objections politely, and guides customers to checkout.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <IconShoppingBag size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Smart Product Catalog Training</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Add products with variants, sizes, colors, stock status, and prices in seconds. The AI always shares accurate, up-to-date inventory info.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF5FF] text-[#7E22CE]">
                  <IconZap size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Automated Order Capture</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  No more messy notes! The bot collects customer name, phone number, and delivery address, creating a structured order directly in your dashboard.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#D97706]">
                  <IconClock size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Smart Cart Recovery & Follow-up</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Automatically re-engages customers who asked about a product but stopped replying, recovering up to 28% of abandoned inquiries.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#16A34A]">
                  <IconShield size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">1-Click Meta Integration</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Connect your Facebook page in less than a minute. Operates seamlessly via official Meta Graph API webhooks with zero downtime.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 glow-card space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#334155]">
                  <IconUsers size={22} />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Instant Human Takeover</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Seamlessly monitor all ongoing chats in your unified dashboard. If you reply manually, the AI automatically pauses on that customer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            How It Works (4 Simple Steps)
            ========================================================================= */}
        <section id="how-it-works" className="py-20 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B]">
                Simple Onboarding
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                4 Simple Steps to Launch Your AI Sales Agent
              </h2>
              <p className="text-sm text-[#64748B]">
                You can be fully set up and taking automated orders in under 5 minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative rounded-2xl border border-[#E2E8F0] bg-[#FAFBFB] p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white font-bold text-sm">
                  1
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">Connect Facebook Page</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Log in with Facebook and select the page you want your AI bot to manage.
                </p>
              </div>

              <div className="relative rounded-2xl border border-[#E2E8F0] bg-[#FAFBFB] p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white font-bold text-sm">
                  2
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">Add Your Products</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Add product titles, sizes, prices, images, and delivery charges to your catalog.
                </p>
              </div>

              <div className="relative rounded-2xl border border-[#E2E8F0] bg-[#FAFBFB] p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white font-bold text-sm">
                  3
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">Set Bot Tone & Rules</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Choose friendly or professional tone and set your payment and courier rules.
                </p>
              </div>

              <div className="relative rounded-2xl border border-[#E2E8F0] bg-[#FAFBFB] p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F5B] text-white font-bold text-sm">
                  4
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">Watch AI Close Sales</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Sit back as the AI responds to chats in 1 second and collects confirmed orders 24/7.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Interactive Sandbox Demo
            ========================================================================= */}
        <section id="demo" className="py-20 lg:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
              <span className="inline-flex rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B]">
                Interactive Demo
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                See How the AI Closes Real Customer Inquiries
              </h2>
              <p className="text-sm text-[#64748B]">
                Select a scenario below to see how our sales agent handles questions and secures orders.
              </p>
            </div>

            {/* Scenario Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {DEMO_CONVERSATIONS.map((conv, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveDemoTab(idx)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeDemoTab === idx
                      ? "bg-[#087F5B] text-white shadow-xs"
                      : "border border-[#D9E2E8] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span>{conv.title}</span>
                  <span className="ml-2 text-[10px] opacity-80">({conv.badge})</span>
                </button>
              ))}
            </div>

            {/* Conversation Window */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden">
              <div className="border-b border-[#E2E8F0] bg-[#FAFBFB] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                  <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                  <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                  <span className="ml-2 text-xs font-bold text-[#475569]">
                    {DEMO_CONVERSATIONS[activeDemoTab].title}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#087F5B]">
                  Response Latency: ~1.1s
                </span>
              </div>

              <div className="p-6 space-y-4 bg-[#FAFBFB]/60 min-h-[300px]">
                {DEMO_CONVERSATIONS[activeDemoTab].messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === "customer" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        m.sender === "customer"
                          ? "bg-[#087F5B] text-white rounded-br-xs font-medium shadow-2xs"
                          : "bg-white border border-[#E2E8F0] text-[#0F172A] rounded-bl-xs shadow-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line">{m.text}</div>
                    </div>
                    <span className="text-[9px] text-[#94A3B8] mt-1 px-1">
                      {m.sender === "customer" ? "Customer" : "AI Sales Closer"} • {m.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            Pricing Section
            ========================================================================= */}
        <section id="pricing" className="py-20 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B]">
                Transparent Pay-As-You-Go Pricing
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Affordable Packages with Zero Expiration
              </h2>
              <p className="text-sm text-[#64748B]">
                Start with 50 free credits. Recharge easily via bKash whenever you need more.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 bg-white transition-all glow-card ${
                    pkg.popular
                      ? "border-2 border-[#087F5B] shadow-xl"
                      : "border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1]"
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#087F5B] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#0F172A]">{pkg.name}</h3>
                      <p className="text-xs text-[#64748B] mt-1">{pkg.description}</p>
                    </div>

                    <div className="border-y border-[#E2E8F0] py-3.5 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#0F172A] font-mono">৳{pkg.priceBdt}</span>
                        <span className="text-xs text-[#64748B] font-medium">/ package</span>
                      </div>
                      <div className="text-xs font-bold text-[#087F5B]">
                        {pkg.credits} AI Credits <span className="text-[#64748B] font-normal">({pkg.conversations})</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#334155]">
                      {pkg.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-center gap-2">
                          <IconCheck size={15} className="text-[#087F5B] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <Link
                      href="/login"
                      className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                        pkg.popular
                          ? "bg-[#087F5B] text-white shadow-xs hover:bg-[#066B4D]"
                          : "border border-[#D9E2E8] bg-white text-[#334155] hover:bg-[#FAFBFB]"
                      }`}
                    >
                      <span>Choose {pkg.name}</span>
                      <IconChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            FAQ Section
            ========================================================================= */}
        <section id="faqs" className="py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
              <span className="inline-flex rounded-full border border-[#087F5B]/20 bg-[#E8F5EF] px-3.5 py-1 text-xs font-bold text-[#087F5B]">
                Frequently Asked Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Everything You Need to Know
              </h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left text-sm font-bold text-[#0F172A]"
                    >
                      <span>{faq.q}</span>
                      <span
                        className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAFBFB] text-[#64748B] transition-transform ${
                          isOpen ? "rotate-90 text-[#087F5B]" : ""
                        }`}
                      >
                        <IconChevronRight size={14} />
                      </span>
                    </button>

                    {isOpen && (
                      <p className="mt-3 text-xs text-[#64748B] leading-relaxed border-t border-[#E2E8F0] pt-3 animate-fadeIn">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            Bottom CTA Banner
            ========================================================================= */}
        <section className="py-16 bg-[#087F5B] text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-grid opacity-10 pointer-events-none" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Ready to Turn Your Facebook Page into a 24/7 Automated Sales Machine?
            </h2>
            <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
              Join hundreds of smart Bangladeshi merchants saving 30+ hours a week while closing 3.8x more orders.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#087F5B] shadow-lg hover:bg-[#F8FAF9] transition-all"
              >
                Create My Free Agent (50 Free Credits)
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          Footer
          ========================================================================= */}
      <footer className="border-t border-[#E2E8F0] bg-white py-12 text-xs text-[#64748B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087F5B] text-white">
                <IconSparkles size={16} />
              </div>
              <span className="font-bold text-[#0F172A] text-sm">AI Sales Bot</span>
              <span className="text-[11px] text-[#94A3B8]">© 2026. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6 font-semibold">
              <a href="#features" className="hover:text-[#087F5B]">Features</a>
              <a href="#pricing" className="hover:text-[#087F5B]">Pricing</a>
              <a href="#faqs" className="hover:text-[#087F5B]">FAQs</a>
              <Link href="/login" className="hover:text-[#087F5B]">Merchant Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
