export type NicheId = "tees" | "supplements" | "health";
export type Shape = "tee" | "tub" | "pouch" | "bottle" | "dropper" | "box";

export interface StoreProduct {
  id: string;
  name: string;
  collection: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  badge?: string;
  shape: Shape;
  color: string;
  bg: string;
  blurb: string;
  option: { label: string; values: string[] };
}

export interface Collection {
  id: string;
  name: string;
  blurb: string;
  shape: Shape;
  color: string;
  bg: string;
}

export interface Niche {
  id: NicheId;
  label: string;
  brand: string;
  announcement: string;
  theme: {
    bg: string; surface: string; text: string; muted: string; line: string;
    accent: string; accentText: string; radius: string;
    display: string; body: string; displayCase: "uppercase" | "none"; displayWeight: number;
  };
  hero: { kicker: string; title: string; text: string; cta: string; secondary: string; shape: Shape; color: string; bg: string };
  usps: { title: string; text: string }[];
  collections: Collection[];
  products: StoreProduct[];
  story: { kicker: string; title: string; text: string; cta: string; shape: Shape; color: string; bg: string };
  steps: { title: string; text: string }[];
  stepsTitle: string;
  testimonials: { quote: string; name: string; detail: string }[];
  press: string[];
  newsletter: { title: string; text: string };
  product: {
    benefitsTitle: string;
    benefits: { title: string; text: string }[];
    details: [string, string][];
  };
  faq: { q: string; a: string }[];
  about: {
    title: string; text: string; paragraphs: string[];
    values: { title: string; text: string }[];
    stats: { value: string; label: string }[];
  };
  freeShippingOver: number;
  footerBlurb: string;
}

const tees: Niche = {
  id: "tees", label: "T-shirt shop", brand: "LOOSE THREAD",
  announcement: "Free shipping over $75 · New drop every Friday",
  theme: {
    bg: "#F4F1EA", surface: "#FFFFFF", text: "#121212", muted: "#5E5A52", line: "rgba(18,18,18,.14)",
    accent: "#FF5A36", accentText: "#FFFFFF", radius: "4px",
    display: '"Archivo Black", "Space Grotesk", system-ui, sans-serif', body: '"Space Grotesk", system-ui, sans-serif',
    displayCase: "uppercase", displayWeight: 400,
  },
  hero: {
    kicker: "Drop 014 · Heavyweight", title: "Wear it loud. Wash it forever.",
    text: "240gsm organic cotton tees, cut boxy, printed in small runs in Portugal.",
    cta: "Shop the drop", secondary: "Our cotton", shape: "tee", color: "#FF5A36", bg: "#FFD9CF",
  },
  usps: [
    { title: "Heavyweight cotton", text: "240gsm organic jersey that keeps its shape." },
    { title: "Small batches", text: "Every print runs once. When it's gone, it's gone." },
    { title: "Free returns", text: "30 days, any reason, label included." },
    { title: "Carbon-neutral shipping", text: "Offset on every parcel, every time." },
  ],
  collections: [
    { id: "graphic", name: "Graphic tees", blurb: "Bold prints from independent artists.", shape: "tee", color: "#FF5A36", bg: "#FFD9CF" },
    { id: "essentials", name: "Essentials", blurb: "Blank, boxy, built for daily wear.", shape: "tee", color: "#2B2B2B", bg: "#E4E0D8" },
    { id: "pastel", name: "Washed pastels", blurb: "Garment-dyed colors that soften every wash.", shape: "tee", color: "#9EC5E8", bg: "#E3EEF8" },
  ],
  products: [
    { id: "t1", name: "Sunburst Graphic Tee", collection: "graphic", price: 42, rating: 4.8, reviews: 312, badge: "New", shape: "tee", color: "#FF5A36", bg: "#FFE4DC", blurb: "Hand-drawn sunburst, water-based ink, boxy fit.", option: { label: "Size", values: ["S", "M", "L", "XL", "XXL"] } },
    { id: "t2", name: "Heavy Blank Tee", collection: "essentials", price: 32, rating: 4.9, reviews: 1204, badge: "Bestseller", shape: "tee", color: "#1E1E1E", bg: "#E8E4DC", blurb: "The one we're known for. 240gsm, dropped shoulder.", option: { label: "Size", values: ["S", "M", "L", "XL", "XXL"] } },
    { id: "t3", name: "Washed Sky Tee", collection: "pastel", price: 38, compareAt: 48, rating: 4.7, reviews: 188, badge: "Sale", shape: "tee", color: "#9EC5E8", bg: "#E6F0F9", blurb: "Garment-dyed blue that fades beautifully.", option: { label: "Size", values: ["S", "M", "L", "XL"] } },
    { id: "t4", name: "Wave Club Tee", collection: "graphic", price: 44, rating: 4.6, reviews: 96, shape: "tee", color: "#2F5BEA", bg: "#DDE5FF", blurb: "Back print, small chest logo, surf club energy.", option: { label: "Size", values: ["S", "M", "L", "XL"] } },
    { id: "t5", name: "Bone Blank Tee", collection: "essentials", price: 32, rating: 4.8, reviews: 640, shape: "tee", color: "#E9E2D2", bg: "#F3EFE7", blurb: "Undyed natural cotton. Goes with everything.", option: { label: "Size", values: ["S", "M", "L", "XL", "XXL"] } },
    { id: "t6", name: "Washed Sage Tee", collection: "pastel", price: 38, rating: 4.7, reviews: 142, shape: "tee", color: "#A9C7A4", bg: "#E5F0E3", blurb: "Soft green, softer hand feel.", option: { label: "Size", values: ["S", "M", "L", "XL"] } },
    { id: "t7", name: "Night Shift Tee", collection: "graphic", price: 44, rating: 4.9, reviews: 77, badge: "Limited", shape: "tee", color: "#6B4BD8", bg: "#E6E0FA", blurb: "Glow-in-the-dark print. 150 made.", option: { label: "Size", values: ["M", "L", "XL"] } },
    { id: "t8", name: "Washed Peach Tee", collection: "pastel", price: 38, rating: 4.5, reviews: 63, shape: "tee", color: "#F6B48F", bg: "#FCEADF", blurb: "Warm peach, vintage wash.", option: { label: "Size", values: ["S", "M", "L"] } },
  ],
  story: {
    kicker: "Made right", title: "From seed to stitch in one country.",
    text: "Our cotton is grown, spun, knitted, cut and printed within 200km in northern Portugal. Fewer miles, better pay, a tee that lasts a decade.",
    cta: "Read our story", shape: "tee", color: "#121212", bg: "#E4E0D8",
  },
  stepsTitle: "How it fits",
  steps: [
    { title: "Boxy cut", text: "Dropped shoulders, wide body, cropped just above the hip." },
    { title: "Size true", text: "Take your usual size for the intended fit; size down for classic." },
    { title: "Wash cold", text: "Inside out, cold wash, hang dry. Prints last for years." },
  ],
  testimonials: [
    { quote: "Thickest tee I own and it hasn't shrunk an inch in a year.", name: "Dani R.", detail: "Heavy Blank Tee, L" },
    { quote: "The print quality is unreal. Got stopped twice on the street.", name: "Marcus T.", detail: "Sunburst Graphic Tee, M" },
    { quote: "Ordered one blank, came back for five more.", name: "Lee W.", detail: "Bone Blank Tee, XL" },
  ],
  press: ["HYPEFEED", "Thread Weekly", "THE CUT LIST", "Mode Daily"],
  newsletter: { title: "Get the Friday drop first", text: "One email a week. Early access, no spam." },
  product: {
    benefitsTitle: "Built to outlast trends",
    benefits: [
      { title: "240gsm jersey", text: "Dense, opaque, structured without being stiff." },
      { title: "Water-based inks", text: "Soft prints that breathe and won't crack." },
      { title: "Pre-shrunk", text: "Washed before it ships so the fit stays put." },
    ],
    details: [
      ["Materials", "100% organic cotton, 240gsm. Ribbed crew neck with twin-needle stitching."],
      ["Fit", "Boxy oversized. Model is 6'0\" and wears size L."],
      ["Care", "Machine wash cold inside out. Hang dry. Do not bleach."],
      ["Shipping & returns", "Ships in 1–2 days. Free returns within 30 days."],
    ],
  },
  faq: [
    { q: "How does sizing run?", a: "Our tees are cut boxy and slightly cropped. Take your usual size for an oversized look or size down for a classic fit." },
    { q: "Will my tee shrink?", a: "Every tee is pre-shrunk. Wash cold and hang dry and it will keep its shape." },
    { q: "When do new drops release?", a: "Every Friday at 10am. Newsletter subscribers get access an hour early." },
    { q: "Do you ship internationally?", a: "Yes, to 40 countries. Duties are included at checkout for the EU, UK and US." },
    { q: "Can I return a sale item?", a: "Yes. Sale items follow the same 30-day free returns policy." },
  ],
  about: {
    title: "We make one thing, properly.",
    text: "Loose Thread started in a garage with a heat press and a single blank tee we couldn't find anywhere else.",
    paragraphs: [
      "We wanted a tee with the weight of vintage workwear, the cut of streetwear and none of the waste of fast fashion. Nobody made it, so we did.",
      "Today we work with three family-run mills in Portugal and a rotating roster of independent artists who share in every sale of their print.",
    ],
    values: [
      { title: "Make less, better", text: "Small runs mean no warehouses of unsold stock." },
      { title: "Pay artists properly", text: "15% of every graphic tee goes to the artist." },
      { title: "Built to last", text: "If a seam fails in two years, we replace it." },
    ],
    stats: [{ value: "240g", label: "fabric weight" }, { value: "60k", label: "tees shipped" }, { value: "38", label: "artists paid" }],
  },
  freeShippingOver: 75,
  footerBlurb: "Heavyweight tees in small batches. Made in Portugal.",
};

const supplements: Niche = {
  id: "supplements", label: "Supplement store", brand: "PEAKFORM",
  announcement: "Subscribe & save 20% · Free shaker on first order",
  theme: {
    bg: "#0E1116", surface: "#171B22", text: "#F2F4F7", muted: "#9AA3B2", line: "rgba(242,244,247,.12)",
    accent: "#C6F432", accentText: "#0E1116", radius: "14px",
    display: '"Unbounded", "Figtree", system-ui, sans-serif', body: '"Figtree", system-ui, sans-serif',
    displayCase: "none", displayWeight: 600,
  },
  hero: {
    kicker: "Clean performance nutrition", title: "Fuel that keeps up with you.",
    text: "Third-party tested protein, pre-workout and recovery with nothing you can't pronounce.",
    cta: "Shop bestsellers", secondary: "Take the quiz", shape: "tub", color: "#C6F432", bg: "#26301A",
  },
  usps: [
    { title: "Third-party tested", text: "Every batch screened for 280+ banned substances." },
    { title: "No fillers", text: "Clean labels, transparent doses, zero proprietary blends." },
    { title: "Subscribe & save", text: "20% off and free delivery. Skip or cancel anytime." },
    { title: "Taste guarantee", text: "Don't love the flavor? We'll swap it free." },
  ],
  collections: [
    { id: "protein", name: "Protein", blurb: "Whey isolate and plant blends, 25g per scoop.", shape: "tub", color: "#C6F432", bg: "#26301A" },
    { id: "preworkout", name: "Pre-workout", blurb: "Clean energy, focus and pump without the crash.", shape: "pouch", color: "#FF6B4A", bg: "#3A1E19" },
    { id: "recovery", name: "Recovery", blurb: "Creatine, electrolytes and sleep support.", shape: "bottle", color: "#4AC6FF", bg: "#15303D" },
  ],
  products: [
    { id: "s1", name: "Whey Isolate", collection: "protein", price: 54, rating: 4.9, reviews: 2810, badge: "Bestseller", shape: "tub", color: "#C6F432", bg: "#26301A", blurb: "25g protein, 110 calories, mixes with a spoon.", option: { label: "Flavor", values: ["Chocolate", "Vanilla", "Cookies & Cream", "Unflavored"] } },
    { id: "s2", name: "Plant Protein", collection: "protein", price: 49, rating: 4.7, reviews: 940, shape: "tub", color: "#8BD17C", bg: "#1C3020", blurb: "Pea and rice blend with a complete amino profile.", option: { label: "Flavor", values: ["Chocolate", "Vanilla", "Salted Caramel"] } },
    { id: "s3", name: "Ignite Pre-Workout", collection: "preworkout", price: 39, compareAt: 45, rating: 4.8, reviews: 1532, badge: "Sale", shape: "pouch", color: "#FF6B4A", bg: "#3A1E19", blurb: "200mg natural caffeine, citrulline and beta-alanine.", option: { label: "Flavor", values: ["Blue Raspberry", "Watermelon", "Sour Apple"] } },
    { id: "s4", name: "Focus Stim-Free", collection: "preworkout", price: 36, rating: 4.6, reviews: 412, shape: "pouch", color: "#B784FF", bg: "#2A1F3D", blurb: "Pump and focus with zero caffeine. Train late.", option: { label: "Flavor", values: ["Grape", "Lemonade"] } },
    { id: "s5", name: "Creatine Monohydrate", collection: "recovery", price: 29, rating: 4.9, reviews: 3120, badge: "Bestseller", shape: "tub", color: "#F2F4F7", bg: "#272C35", blurb: "Micronized, unflavored, 5g per serving. Just works.", option: { label: "Size", values: ["60 servings", "120 servings"] } },
    { id: "s6", name: "Hydrate Electrolytes", collection: "recovery", price: 32, rating: 4.7, reviews: 688, badge: "New", shape: "pouch", color: "#4AC6FF", bg: "#15303D", blurb: "1000mg sodium, no sugar, real fruit flavor.", option: { label: "Flavor", values: ["Citrus", "Berry", "Coconut"] } },
    { id: "s7", name: "Deep Sleep Magnesium", collection: "recovery", price: 27, rating: 4.8, reviews: 1021, shape: "bottle", color: "#7C8CFF", bg: "#1D2140", blurb: "Glycinate and L-theanine to wind down after late sessions.", option: { label: "Size", values: ["60 caps", "120 caps"] } },
    { id: "s8", name: "Omega-3 Ultra", collection: "recovery", price: 31, rating: 4.6, reviews: 503, shape: "bottle", color: "#FFC24A", bg: "#3A2E14", blurb: "High-EPA fish oil for joints and recovery.", option: { label: "Size", values: ["90 softgels"] } },
  ],
  story: {
    kicker: "Tested, not trusted", title: "We publish every lab result.",
    text: "Scan the code on any tub to see its batch report: heavy metals, banned substances and exact dosages, verified by an independent lab.",
    cta: "See lab reports", shape: "bottle", color: "#4AC6FF", bg: "#15303D",
  },
  stepsTitle: "How to stack",
  steps: [
    { title: "Before", text: "Ignite 20 minutes pre-session for energy, pump and focus." },
    { title: "After", text: "Whey Isolate within an hour to kickstart muscle repair." },
    { title: "Daily", text: "5g creatine and electrolytes, every day, training or not." },
  ],
  testimonials: [
    { quote: "Only pre-workout that doesn't leave me jittery. Clean energy for 90 minutes.", name: "Jordan K.", detail: "Ignite Pre-Workout" },
    { quote: "Mixes with a spoon, actually tastes like chocolate. Finally.", name: "Aisha M.", detail: "Whey Isolate" },
    { quote: "Love that I can check the lab results for my exact batch.", name: "Chris P.", detail: "Creatine Monohydrate" },
  ],
  press: ["IRON MONTHLY", "Lift Lab", "PERFORMANCE+", "Run Daily"],
  newsletter: { title: "Train smarter", text: "Weekly programming tips and member-only deals." },
  product: {
    benefitsTitle: "What's inside",
    benefits: [
      { title: "Clinically dosed", text: "Every ingredient at the dose used in research." },
      { title: "Informed Sport", text: "Certified safe for tested athletes." },
      { title: "Zero sugar", text: "Sweetened with stevia and monk fruit." },
    ],
    details: [
      ["Ingredients", "Whey protein isolate, cocoa, natural flavors, sunflower lecithin, stevia leaf extract."],
      ["How to use", "Mix one scoop with 250ml water or milk. Take after training or as a high-protein snack."],
      ["Nutrition", "Per scoop: 110 kcal, 25g protein, 1g carbs, 0.5g fat."],
      ["Shipping", "Ships same day before 2pm. Subscriptions ship free."],
    ],
  },
  faq: [
    { q: "Are your products third-party tested?", a: "Yes. Every batch is tested by an independent lab and the report is linked from the QR code on the label." },
    { q: "How does subscribe & save work?", a: "Get 20% off and free shipping. Change flavor, skip a month or cancel anytime from your account." },
    { q: "Is your pre-workout safe to take daily?", a: "Ignite contains 200mg caffeine. Most people take it on training days only; avoid within 6 hours of sleep." },
    { q: "Do you have vegan options?", a: "Plant Protein, Creatine, Hydrate and Focus Stim-Free are all vegan." },
    { q: "What if I don't like the flavor?", a: "Tell us within 30 days and we'll send a different flavor free." },
  ],
  about: {
    title: "Built by athletes who read labels.",
    text: "Peakform started when two coaches got tired of recommending supplements they couldn't verify.",
    paragraphs: [
      "Too many products hid weak doses behind proprietary blends. We set one rule: every ingredient, every dose, every lab result, public.",
      "Today we formulate with sports dietitians and test every batch with independent labs before it ships.",
    ],
    values: [
      { title: "Transparent", text: "Full labels and public lab reports, always." },
      { title: "Evidence-led", text: "No ingredient without research behind its dose." },
      { title: "Athlete-safe", text: "Certified for tested competition." },
    ],
    stats: [{ value: "280+", label: "substances screened" }, { value: "1.2M", label: "servings shipped" }, { value: "4.8★", label: "average rating" }],
  },
  freeShippingOver: 60,
  footerBlurb: "Clean, tested performance nutrition.",
};

const health: Niche = {
  id: "health", label: "Health & wellness", brand: "Kindred Health",
  announcement: "Free consultation with a nutritionist on orders over $50",
  theme: {
    bg: "#F3F6F2", surface: "#FFFFFF", text: "#1E2B26", muted: "#5D6B65", line: "rgba(30,43,38,.12)",
    accent: "#2F6B57", accentText: "#FFFFFF", radius: "20px",
    display: '"Fraunces", Georgia, serif', body: '"Figtree", system-ui, sans-serif',
    displayCase: "none", displayWeight: 500,
  },
  hero: {
    kicker: "Doctor-formulated daily care", title: "Feel like yourself again.",
    text: "Gentle, evidence-based vitamins and botanicals for sleep, stress and gut health, personalized in a 3-minute quiz.",
    cta: "Take the quiz", secondary: "Shop all", shape: "dropper", color: "#2F6B57", bg: "#DCEAE2",
  },
  usps: [
    { title: "Doctor-formulated", text: "Created with GPs and registered dietitians." },
    { title: "Personalized", text: "A plan built from your goals and lifestyle." },
    { title: "Plastic-free", text: "Glass jars and compostable refill pouches." },
    { title: "Expert support", text: "Message a nutritionist anytime, free." },
  ],
  collections: [
    { id: "sleep", name: "Sleep & stress", blurb: "Calm evenings and deeper rest, naturally.", shape: "dropper", color: "#6D7FC9", bg: "#E4E8F7" },
    { id: "gut", name: "Gut health", blurb: "Probiotics and fiber for everyday digestion.", shape: "bottle", color: "#E3A06B", bg: "#F8EADF" },
    { id: "daily", name: "Daily essentials", blurb: "The foundations: D3, omega-3, iron, B12.", shape: "box", color: "#2F6B57", bg: "#DCEAE2" },
  ],
  products: [
    { id: "h1", name: "Calm Drops", collection: "sleep", price: 36, rating: 4.8, reviews: 860, badge: "Bestseller", shape: "dropper", color: "#6D7FC9", bg: "#E4E8F7", blurb: "Ashwagandha and lemon balm for an even, steady mood.", option: { label: "Size", values: ["30ml", "60ml"] } },
    { id: "h2", name: "Deep Rest", collection: "sleep", price: 32, rating: 4.7, reviews: 1104, shape: "bottle", color: "#4E5BA6", bg: "#E1E4F4", blurb: "Magnesium, glycine and saffron to fall and stay asleep.", option: { label: "Supply", values: ["30 days", "90 days"] } },
    { id: "h3", name: "Gut Balance Probiotic", collection: "gut", price: 42, compareAt: 49, rating: 4.8, reviews: 732, badge: "Save 15%", shape: "bottle", color: "#E3A06B", bg: "#F8EADF", blurb: "12 clinically studied strains, 30 billion CFU.", option: { label: "Supply", values: ["30 days", "90 days"] } },
    { id: "h4", name: "Daily Fiber", collection: "gut", price: 28, rating: 4.6, reviews: 315, shape: "box", color: "#C98B4E", bg: "#F4E6D7", blurb: "Gentle prebiotic fiber that dissolves in anything.", option: { label: "Supply", values: ["30 days", "60 days"] } },
    { id: "h5", name: "Vitamin D3 + K2", collection: "daily", price: 22, rating: 4.9, reviews: 1890, badge: "Bestseller", shape: "dropper", color: "#E8B83C", bg: "#FBF1D6", blurb: "Plant-based D3 with K2 for bones and immunity.", option: { label: "Size", values: ["30ml"] } },
    { id: "h6", name: "Omega-3 Algae", collection: "daily", price: 34, rating: 4.7, reviews: 540, badge: "Vegan", shape: "bottle", color: "#2F6B57", bg: "#DCEAE2", blurb: "Sustainable EPA and DHA straight from algae.", option: { label: "Supply", values: ["30 days", "90 days"] } },
    { id: "h7", name: "Iron Gentle", collection: "daily", price: 19, rating: 4.6, reviews: 288, shape: "box", color: "#B5524A", bg: "#F5E1DE", blurb: "Bisglycinate iron with vitamin C. Easy on the stomach.", option: { label: "Supply", values: ["60 days"] } },
    { id: "h8", name: "B12 Spray", collection: "daily", price: 18, rating: 4.5, reviews: 197, badge: "New", shape: "dropper", color: "#D9668A", bg: "#F8E1E9", blurb: "Methylcobalamin under the tongue for daily energy.", option: { label: "Size", values: ["25ml"] } },
  ],
  story: {
    kicker: "Backed by science", title: "Every formula starts with the research.",
    text: "Our medical board reviews the clinical evidence for every ingredient and dose. If the research isn't there, it doesn't go in the bottle.",
    cta: "Meet our experts", shape: "bottle", color: "#2F6B57", bg: "#DCEAE2",
  },
  stepsTitle: "How it works",
  steps: [
    { title: "Take the quiz", text: "Three minutes on your goals, diet and lifestyle." },
    { title: "Get your plan", text: "A personalized routine reviewed by a nutritionist." },
    { title: "Feel the change", text: "Delivered monthly. Adjust anytime with expert support." },
  ],
  testimonials: [
    { quote: "Sleeping through the night for the first time in years. Gentle and it works.", name: "Helen S.", detail: "Deep Rest, 3 months" },
    { quote: "The nutritionist chat sold me. Real advice, not a sales pitch.", name: "Omar F.", detail: "Personalized plan" },
    { quote: "No more bloating after lunch. I didn't expect it to work this well.", name: "Priya N.", detail: "Gut Balance Probiotic" },
  ],
  press: ["Wellness Today", "THE HEALTH EDIT", "Modern GP", "Calm Quarterly"],
  newsletter: { title: "Small habits, big difference", text: "A monthly note from our nutritionists. Recipes and research, no hype." },
  product: {
    benefitsTitle: "Why it works",
    benefits: [
      { title: "Clinically studied", text: "Ingredients and doses from published human trials." },
      { title: "Gentle formula", text: "No synthetic fillers, gluten, dairy or soy." },
      { title: "Tested for purity", text: "Heavy metals and microbes checked every batch." },
    ],
    details: [
      ["Ingredients", "Ashwagandha root extract (KSM-66) 300mg, lemon balm 150mg, organic glycerin, purified water."],
      ["How to take", "1ml under the tongue once daily, or in water. Best in the evening."],
      ["Safety", "Not suitable during pregnancy. Speak to your doctor if you take medication."],
      ["Delivery", "Free carbon-neutral delivery. Pause or cancel your plan anytime."],
    ],
  },
  faq: [
    { q: "How long until I notice a difference?", a: "Most customers notice changes within 2–4 weeks. Some formulas, like probiotics, take up to 8 weeks of daily use." },
    { q: "Are your products safe with medication?", a: "Most are, but some botanicals interact with medication. Our nutritionists can advise, and we always recommend checking with your doctor." },
    { q: "Are your products vegan?", a: "All of our formulas are vegetarian and most are vegan. Look for the vegan badge on each product." },
    { q: "Can I pause my subscription?", a: "Yes. Pause, skip, change products or cancel anytime from your account." },
    { q: "Who formulates your products?", a: "Our formulas are developed by our medical board of GPs, pharmacists and registered dietitians." },
  ],
  about: {
    title: "Care that starts with listening.",
    text: "Kindred Health was founded by a GP and a dietitian who wanted wellness to feel less like guesswork.",
    paragraphs: [
      "Patients kept asking which supplements were worth it. The honest answer was usually: few of them, at the right dose, for the right person.",
      "So we built a small range of evidence-backed formulas and a team of nutritionists who help you take only what you need.",
    ],
    values: [
      { title: "Evidence first", text: "We only use ingredients with published human research." },
      { title: "Less, not more", text: "We'll tell you when you don't need something." },
      { title: "Kind to the planet", text: "Glass, refills and carbon-neutral delivery." },
    ],
    stats: [{ value: "12", label: "experts on our board" }, { value: "90k", label: "members supported" }, { value: "4.8★", label: "member rating" }],
  },
  freeShippingOver: 50,
  footerBlurb: "Doctor-formulated daily wellness.",
};

/* ───────── Extended catalogue ─────────
   Each collection gets a deeper range so grids, filters and sorting have something to chew on.
   Rows: [name, color, backdrop, shape?]. Price, rating, badges and options are derived. */

type Extra = [string, string, string, Shape?];
const EXTRA: Record<NicheId, Record<string, Extra[]>> = {
  tees: {
    graphic: [
      ["Desert Bloom Tee", "#E8743B", "#FBE3D6"], ["Moth Club Tee", "#3B3B58", "#E2E1EC"], ["Lemon Stand Tee", "#F2C230", "#FCF2D2"],
      ["Static Fuzz Tee", "#7A7A7A", "#ECECEC"], ["Koi Pond Tee", "#E2493B", "#FADDD8"], ["Orbit Tee", "#2E8B7A", "#DCF0EB"],
      ["Matchbook Tee", "#B9312B", "#F5DCDA"], ["Palm Static Tee", "#4B8F3A", "#E2F0DD"], ["Cassette Tee", "#E85FA0", "#FBE1EE"],
    ],
    essentials: [
      ["Heavy Navy Tee", "#1F2A44", "#E1E4EC"], ["Heavy Olive Tee", "#5B6236", "#E9EBDD"], ["Heavy Grey Marl Tee", "#9A9A9A", "#EEEEEE"],
      ["Heavy White Tee", "#FAFAF7", "#ECE8DF"], ["Long Sleeve Black", "#151515", "#E3E0D9"], ["Pocket Tee Sand", "#CDB892", "#F4EEE2"],
      ["Pocket Tee Forest", "#2C4A36", "#DCE6DF"], ["Crop Tee Black", "#222222", "#E6E2DA"], ["Rib Tank Bone", "#E6DECD", "#F5F1E8"],
    ],
    pastel: [
      ["Washed Lilac Tee", "#C3B1E1", "#EFE9F8"], ["Washed Butter Tee", "#F3DD8E", "#FCF6DF"], ["Washed Mint Tee", "#A8DCC8", "#E6F6EF"],
      ["Washed Rose Tee", "#EBAFB9", "#FBE8EB"], ["Washed Clay Tee", "#D39A7A", "#F6E6DD"], ["Washed Denim Tee", "#7D9BC1", "#E3EAF4"],
      ["Washed Pistachio Tee", "#C5D69A", "#F1F5E3"], ["Washed Coral Tee", "#F29C85", "#FDE7E0"], ["Washed Fog Tee", "#BFC6CC", "#EEF0F2"],
    ],
  },
  supplements: {
    protein: [
      ["Whey Isolate Cookies", "#E8D9B5", "#2E2A20"], ["Casein Night", "#9CA8FF", "#1E2140"], ["Collagen Peptides", "#F2B8C6", "#3A2329"],
      ["Mass Gainer", "#FF9F43", "#3A2915"], ["Protein Bar Box", "#C6F432", "#26301A", "box"], ["Whey Salted Caramel", "#D9A066", "#35281B"],
      ["Clear Whey Berry", "#FF5C8A", "#3A1A25"], ["Egg White Protein", "#F7F3E3", "#2D2C26"], ["Plant Protein Matcha", "#8BD17C", "#1C3020"],
    ],
    preworkout: [
      ["Ignite Max", "#FF3D3D", "#3A1616"], ["Pump Formula", "#FF8FD8", "#3A1A33"], ["Focus Nootropic", "#4AFFD1", "#123A31", "bottle"],
      ["Endurance Carb Mix", "#FFD84A", "#3A3214"], ["Caffeine Gum", "#C6F432", "#26301A", "box"], ["Ignite Blue Razz", "#4A8BFF", "#16233A"],
      ["Beta-Alanine", "#E2E2E2", "#2B2D31", "tub"], ["Citrulline Malate", "#FFB84A", "#3A2A14", "tub"], ["Stim-Free Lemon", "#F2F55A", "#33351A"],
    ],
    recovery: [
      ["Creatine Gummies", "#FF6B9A", "#3A1A26", "pouch"], ["Hydrate Lemon Lime", "#B6FF4A", "#22351A", "pouch"], ["ZMA Night", "#7C8CFF", "#1D2140"],
      ["Joint Support", "#4AC6FF", "#15303D"], ["Tart Cherry", "#D9304B", "#3A1419"], ["Glutamine", "#F2F4F7", "#272C35", "tub"],
      ["Ashwagandha KSM-66", "#C9A36B", "#33291A"], ["Vitamin D3 5000", "#FFD84A", "#3A3214"], ["Electrolyte Sticks", "#FF8A4A", "#3A2216", "box"],
    ],
  },
  health: {
    sleep: [
      ["Night Tea Blend", "#8E7CC3", "#ECE8F6", "box"], ["Melatonin-Free Gummies", "#5E6CB8", "#E3E6F5", "bottle"], ["Lavender Spray", "#A08BD6", "#EFEBF9"],
      ["Stress Support", "#6C8FB8", "#E3EBF4", "bottle"], ["Magnesium Cream", "#7DA0C9", "#E5EDF6", "box"], ["L-Theanine", "#5767B0", "#E1E4F3", "bottle"],
      ["Sleep Reset Kit", "#4E5BA6", "#E1E4F4", "box"], ["Saffron Mood", "#E07B39", "#FAE8DC"], ["Valerian Calm", "#6F8F5E", "#E6EFE1", "bottle"],
    ],
    gut: [
      ["Digestive Enzymes", "#D98E54", "#F7E8DB", "bottle"], ["Prebiotic Fiber Sticks", "#C98B4E", "#F4E6D7", "box"], ["Ginger Settle", "#E0B84A", "#FAF1D8", "dropper"],
      ["Kids Probiotic", "#F09A9A", "#FCE6E6"], ["Women's Flora", "#D97A9A", "#F9E3EB"], ["Apple Cider Vinegar", "#C76B3B", "#F5E2D8"],
      ["Gut Reset Kit", "#E3A06B", "#F8EADF", "box"], ["Bone Broth Powder", "#B8875A", "#F2E7DC", "box"], ["L-Glutamine Gut", "#D6B38A", "#F6EEE3"],
    ],
    daily: [
      ["Multivitamin", "#2F6B57", "#DCEAE2"], ["Magnesium Glycinate", "#4F7DA8", "#E0E9F2"], ["Zinc + C", "#E8A33C", "#FBEDD6", "box"],
      ["Folate Methyl", "#7AA65A", "#E7F1E0", "dropper"], ["Vitamin C Powder", "#F2A93B", "#FCEFD9", "box"], ["Prenatal Essentials", "#D98A9C", "#F9E6EB"],
      ["Calcium + D", "#9AA8B5", "#ECF0F3", "box"], ["CoQ10", "#D1603D", "#F7E1DA"], ["Biotin Hair & Skin", "#B98ED6", "#F2EAF8", "dropper"],
    ],
  },
};

const BLURBS: Record<NicheId, string[]> = {
  tees: ["240gsm organic cotton, boxy fit.", "Garment-dyed and pre-shrunk.", "Printed in a run of 200.", "Our heaviest jersey yet."],
  supplements: ["Third-party tested, banned-substance free.", "No fillers, no proprietary blends.", "Mixes clean in a shaker.", "Clinically dosed actives."],
  health: ["Doctor-formulated, third-party tested.", "Vegan, gluten free, no fillers.", "Gentle enough for every day.", "Backed by peer-reviewed research."],
};

function expand(n: Niche): Niche {
  const extras = n.collections.flatMap(c => {
    const base = n.products.filter(p => p.collection === c.id);
    const avg = base.reduce((s, p) => s + p.price, 0) / base.length;
    return (EXTRA[n.id][c.id] ?? []).map(([name, color, bg, shape], i): StoreProduct => {
      const seed = (name.length * 7 + i * 13) % 17;
      const price = Math.round(avg + (seed - 8) * 0.9);
      const onSale = i % 4 === 2;
      return {
        id: `${n.id[0]}x-${c.id}-${i}`, name, collection: c.id, color, bg,
        price: onSale ? Math.round(price * 0.8) : price, compareAt: onSale ? price : undefined,
        rating: Math.round((4.3 + (seed % 7) / 10) * 10) / 10, reviews: 20 + seed * 61 + i * 17,
        badge: onSale ? "Sale" : i % 5 === 0 ? "New" : i === 3 ? "Bestseller" : undefined,
        shape: shape ?? base[i % base.length].shape,
        blurb: BLURBS[n.id][i % 4],
        option: base[i % base.length].option,
      };
    });
  });
  return { ...n, products: [...n.products, ...extras] };
}

export const NICHES: Record<NicheId, Niche> = { tees: expand(tees), supplements: expand(supplements), health: expand(health) };
