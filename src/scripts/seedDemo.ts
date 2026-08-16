import "dotenv/config";
import { db } from "../db/db";
import { botConfigs, faqs, pages, products } from "../db/schema";
import { eq } from "drizzle-orm";

// Seeds a connected page with a complete dummy store so the dashboard and AI
// have realistic data to work with. Run: npm run seed:demo
async function main() {
  const [page] = await db.select().from(pages).limit(1);
  if (!page) {
    console.error("No connected page found. Connect a page first (dashboard > Connected Pages).");
    process.exit(1);
  }

  await db
    .insert(botConfigs)
    .values({
      pageId: page.id,
      enabled: true,
      businessInfo:
        "Noksha Fashion একটি প্রিমিয়াম পোশাকের শপ। আমরা ছেলেদের জন্য Premium Panjabi, Sharee, T-Shirt, Formal Shirt এবং Denim Jacket বিক্রি করি। ভালো মানের কাপড়, আধুনিক ডিজাইন এবং যুক্তিসঙ্গত দামের ওপর আমরা গুরুত্ব দিই।",
      tone: "friendly",
      language: "auto",
      customInstructions:
        "Always mention delivery charge and time when a customer asks about a product. Offer the 10% discount for orders above ৳1,000 before closing the sale.",
    })
    .onConflictDoUpdate({ target: botConfigs.pageId, set: { businessInfo: "Noksha Fashion একটি প্রিমিয়াম পোশাকের শপ। আমরা ছেলেদের জন্য Premium Panjabi, Sharee, T-Shirt, Formal Shirt এবং Denim Jacket বিক্রি করি। ভালো মানের কাপড়, আধুনিক ডিজাইন এবং যুক্তিসঙ্গত দামের ওপর আমরা গুরুত্ব দিই।", customInstructions: "Always mention delivery charge and time when a customer asks about a product. Offer the 10% discount for orders above ৳1,000 before closing the sale." } });

  await db.delete(products).where(eq(products.pageId, page.id));
  await db.delete(faqs).where(eq(faqs.pageId, page.id));

  await db.insert(products).values([
    {
      pageId: page.id,
      name: "Premium Cotton Panjabi",
      keywords: "panjabi, punjabi, পাঞ্জাবি",
      imageUrl: "https://picsum.photos/seed/panjabi/400/400",
      price: 1250,
      description: "Soft premium cotton, hand-stitched collar, perfect for Eid or weddings.",
      discount: 10,
      stockStatus: "available",
      category: "Panjabi",
      variants: ["S", "M", "L", "XL"],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
    {
      pageId: page.id,
      name: "Casual Cotton T-Shirt",
      keywords: "t-shirt, tshirt, tee, টি-শার্ট",
      imageUrl: "https://picsum.photos/seed/tshirt/400/400",
      price: 350,
      description: "Breathable 100% cotton, round neck, everyday comfort.",
      stockStatus: "low_stock",
      category: "T-Shirt",
      variants: ["S", "M", "L"],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
    {
      pageId: page.id,
      name: "Slim Fit Formal Shirt",
      keywords: "shirt, formal, শার্ট, ফরমাল",
      imageUrl: "https://picsum.photos/seed/formalshirt/400/400",
      price: 550,
      description: "Slim fit, wrinkle-resistant fabric, office-ready.",
      stockStatus: "available",
      category: "Shirt",
      variants: ["S", "M", "L", "XL"],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
    {
      pageId: page.id,
      name: "Three-Piece Sharee Set",
      keywords: "sharee, saree, শাড়ি, থ্রি পিস",
      imageUrl: "https://picsum.photos/seed/shareeset/400/400",
      price: 2450,
      description: "Sharee with matching blouse piece and underskirt. Jamdani-inspired design.",
      discount: 10,
      stockStatus: "available",
      category: "Sharee",
      variants: [],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
    {
      pageId: page.id,
      name: "Denim Jacket",
      keywords: "jacket, denim, জ্যাকেট",
      imageUrl: "https://picsum.photos/seed/denim/400/400",
      price: 1100,
      description: "Classic blue denim jacket, durable and stylish.",
      stockStatus: "out_of_stock",
      category: "Jacket",
      variants: ["M", "L"],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
    {
      pageId: page.id,
      name: "Katan Silk Sharee",
      keywords: "sharee, saree, katan, কাতান, শাড়ি",
      imageUrl: "https://picsum.photos/seed/katan/400/400",
      price: 3200,
      description: "Traditional Katan silk sharee with zari border.",
      stockStatus: "available",
      category: "Sharee",
      variants: [],
      deliveryInfo: "2-3 days inside Rajshahi, 3-5 days nationwide",
    },
  ]);

  await db.insert(faqs).values([
    { pageId: page.id, question: "Delivery charge কত?", answer: "ঢাকা-রাজশাহী ভিতরে ৳80, সারা দেশে ৳120।" },
    { pageId: page.id, question: "Delivery time কতদিন?", answer: "রাজশাহীর ভিতরে 2-3 দিন, ঢাকায় 3-5 দিন লাগে।" },
    { pageId: page.id, question: "কোন কোন পেমেন্ট মেথড আছে?", answer: "bKash, Nagad এবং Cash on Delivery (COD) পেমেন্ট করা যায়।" },
    { pageId: page.id, question: "রিটার্ন পলিসি কী?", answer: "সাইজ সমস্যা বা ভুল প্রোডাক্ট পেলে 7 দিনের মধ্যে ফেরত নেওয়া হয়। প্রোডাক্ট অপরিহার্যভাবে অব্যবহৃত থাকতে হবে।" },
    { pageId: page.id, question: "কীভাবে অর্ডার করবো?", answer: "ইনবক্সে প্রোডাক্ট, সাইজ এবং ডেলিভারি ঠিকানা জানান। আমরা কনফার্ম করে দিবো। ঢাকার বাইরে COD হলে ৳100 অগ্রিম লাগে।" },
    { pageId: page.id, question: "কোনো ডিসকাউন্ট আছে?", answer: "৳1,000-এর বেশি অর্ডারে 10% ডিসকাউন্ট চলছে।" },
    { pageId: page.id, question: "কোন কোন সাইজ পাওয়া যায়?", answer: "বেশিরভাগ প্রোডাক্টে S, M, L, XL সাইজ পাওয়া যায়। প্রোডাক্টের বিবরণে সাইজ লিস্ট দেখুন।" },
  ]);

  console.log(`Seeded demo store data for page: ${page.name} (${page.id})`);
  console.log("- 6 products (one out of stock to demo stock handling)");
  console.log("- 7 FAQs (delivery, payment, return, order process)");
  console.log("- Business info + custom instructions in bot config");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
