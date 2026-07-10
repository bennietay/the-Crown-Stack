/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncToSupabase, deleteFromSupabase } from "./supabaseSync";
import {
  Lead,
  LeadStage,
  InterestType,
  PermissionStatus,
  Interaction,
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  Script,
  Resource,
  Webinar,
  WebinarType,
  WebinarPage,
  PageType,
  CtaType,
  WebinarRegistration,
  WebinarRegistrationStage,
  Payment,
  PaymentType,
  PaymentStatus,
  ContentPost,
  Referral,
  Event,
  UtmLink,
  QrCode,
  Settings,
  Product,
  ProductImport,
  Order,
  OrderItem,
  Bundle,
  BundleItem
} from "../types";

const STORAGE_KEYS = {
  SETTINGS: "pf_settings",
  LEADS: "pf_leads",
  INTERACTIONS: "pf_interactions",
  TASKS: "pf_tasks",
  SCRIPTS: "pf_scripts",
  RESOURCES: "pf_resources",
  WEBINARS: "pf_webinars",
  WEBINAR_PAGES: "pf_webinar_pages",
  WEBINAR_REGISTRATIONS: "pf_webinar_registrations",
  PAYMENTS: "pf_payments",
  CONTENT_POSTS: "pf_content_posts",
  REFERRALS: "pf_referrals",
  EVENTS: "pf_events",
  UTM_LINKS: "pf_utm_links",
  QR_CODES: "pf_qr_codes",
  USER: "pf_user",
  PRODUCTS: "pf_products",
  PRODUCT_IMPORTS: "pf_product_imports",
  ORDERS: "pf_orders",
  ORDER_ITEMS: "pf_order_items",
  BUNDLES: "pf_bundles",
  BUNDLE_ITEMS: "pf_bundle_items"
};

// Default seed data
const DEFAULT_SETTINGS: Settings = {
  name: "Your Name",
  whatsapp_phone: "60",
  email: "",
  brand_name: "ProspectFlow MY",
  brand_color: "#10b981", // Emerald green
  default_cta_text: "Join Our Webinar Today",
  daily_lead_target: 3,
  daily_message_target: 5,
  daily_follow_up_target: 5,
  stripe_payment_link: "",
  grow_mode: false,
  scale_mode: false,
  compliance_accepted: false
};

const DEFAULT_SCRIPTS: Script[] = [
  {
    id: "s1",
    title: "Amway Malaysia Disclosure (Required)",
    category: "Amway Disclosure",
    content: "It’s related to Amway products and the Amway business model. I prefer to be clear upfront. No pressure and no income promise. I’m just checking whether the product side or business side may be relevant for you.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s2",
    title: "First Connection Icebreaker",
    category: "First Message",
    content: "Hi {{name}}! Saw your comment on my post about side hustle options in Malaysia. Just wanted to drop a quick hello. Are you currently running any side-business or just exploring ideas? - {{first_name}}",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s3",
    title: "Nutrilite Wellness Conversation",
    category: "Wellness",
    content: "Hi {{name}}, hope you are well! I noticed you are interested in wellness routines. I've been researching some high-quality daily supplement plans. Have you heard of Nutrilite's organic farming practices? No hard sells, just sharing some research if you're open. Let me know!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s4",
    title: "Artistry Beauty Routine Ask",
    category: "Beauty",
    content: "Hey {{name}}, quick question. What is your go-to skincare routine for humid Malaysian weather? I recently started using Artistry, which is super light and botanical. If you're open to checking a quick guide, let me know!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s5",
    title: "Amway Home Eco-Friendly",
    category: "Home Care",
    content: "Hi {{name}}! I'm sharing some tips on concentrated, biodegradable home care options that help save cost and are safe for kids. Have you ever tried Amway Home L.O.C. or SA8? Happy to send a 2-min demo video if you'd like.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s6",
    title: "Side Income & Flexible Hours",
    category: "Side Income",
    content: "Hi {{name}}, I am running a digital side project focused on flexible eCommerce distribution in KL. We are helping people setup a second stream without quitting their day job. Are you open to looking at a 15-minute briefing slide?",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s7",
    title: "Webinar Invitation Link",
    category: "Webinar Invite",
    content: "Hey {{name}}! We are hosting a live session: '{{webinar_title}}' on {{webinar_date}} at {{webinar_time}}. It details a structured, low-risk way to start side-income with Amway Malaysia. Would love to reserve you a spot. Sign up here: {{whatsapp_link}}",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s8",
    title: "Webinar Starting Reminder",
    category: "Webinar Reminder",
    content: "Hi {{name}}, quick reminder that '{{webinar_title}}' is starting in 15 minutes! Get your notebook ready. Here is the link to enter: {{replay_link}}",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s9",
    title: "Replay Follow-Up check-in",
    category: "Replay Follow-Up",
    content: "Hey {{name}}, saw you registered for the webinar. Life gets busy, so I wanted to share the custom replay link with you: {{replay_link}}. It'll be up for 48 hours. Let me know which part stood out to you!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s10",
    title: "Virtual Coffee Appointment",
    category: "Appointment Invite",
    content: "Hi {{name}}! Thanks for the replies. Would you be open to a quick 10-minute Zoom or WhatsApp voice call tomorrow? Just a casual chat to see if our growth structure aligns with your goals. No obligations. Does 8 PM work?",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s11",
    title: "Asking for Referrals casually",
    category: "Referral Ask",
    content: "Hi {{name}}, even if this is not the right fit now, do you know anyone in Malaysia who may be open to learning about premium wellness, beauty, home-care products, or a compliant product-sharing business? I will be respectful, clear, and no-pressure. Appreciate you!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s12",
    title: "Graceful Not Interested Reply",
    category: "Not Interested Reply",
    content: "No worries at all, {{name}}! Totally understand. Timing is everything. Let's stay in touch as friends. If you ever need Nutrilite supplements or home solutions, feel free to ping me. Have a great week!",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "s13",
    title: "Payment and Guide Link",
    category: "Payment Follow-Up",
    content: "Hi {{name}}, thanks for your consultation booking. You can complete the payment using this secure checkout link: {{replay_link}}. Once done, let me know and I will send over the guide pack.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "Amway Malaysia Official Homepage",
    category: "Amway Malaysia Home",
    description: "The primary official portal for product ordering, registrations, and official announcements in Malaysia.",
    url: "https://www.amway.my",
    status: "Active",
    notes: "Bookmark for quick access to verify product pricing and active promos.",
    last_reviewed_at: "2026-06-25"
  },
  {
    id: "r2",
    title: "Amway Business Owner (ABO) Registration Page",
    category: "Registration",
    description: "Official direct registration URL for new business prospects to sign up under your sponsorship.",
    url: "https://www.amway.my/register-abo",
    status: "Active",
    notes: "Make sure prospects have your ABO number ready during registration.",
    last_reviewed_at: "2026-06-25"
  },
  {
    id: "r3",
    title: "Amway Rules of Conduct & Compliance",
    category: "Rules of Conduct",
    description: "The official Code of Conduct guiding ethical building, sponsorships, and prohibited advertising methods.",
    url: "https://www.amway.my/rules-of-conduct",
    status: "Active",
    notes: "CRITICAL: Familiarize yourself with Section 4 on digital advertising limits.",
    last_reviewed_at: "2026-06-25"
  },
  {
    id: "r4",
    title: "Digital Communication & Social Media Rules",
    category: "Digital Rules",
    description: "Official guidelines on how to talk about products and business opportunities on social media without violating policies.",
    url: "https://www.amway.my/digital-social-media-guidelines",
    status: "Active",
    notes: "Review before publishing any video routines or product claims.",
    last_reviewed_at: "2026-06-25"
  },
  {
    id: "r5",
    title: "Amway Digital Assets & Photo Library",
    category: "Digital Assets",
    description: "Authorized high-resolution images, brand logos, and product promotional resources provided by Amway Malaysia.",
    url: "https://www.amway.my/resources/brand-assets",
    status: "Active",
    notes: "Always use authorized marketing material for banners and posts.",
    last_reviewed_at: "2026-06-25"
  }
];

const DEFAULT_WEBINAR: Webinar = {
  id: "w1",
  title: "Malaysian Side Income Accelerator: Digital Distribution 101",
  slug: "side-income-accelerator",
  topic: "How to start a compliant product-sharing business with simple daily actions and realistic expectations.",
  webinar_type: WebinarType.SideIncomeWebinar,
  date: "2026-07-05",
  time: "20:00",
  duration: 45,
  status: "Published",
  video_url: "",
  replay_url: "",
  stripe_payment_link: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEFAULT_WEBINAR_PAGES: WebinarPage[] = [
  {
    id: "wp1",
    webinar_id: "w1",
    page_type: PageType.SignUp,
    slug: "register",
    headline: "Discover the Modern Social Commerce Blueprint in Malaysia",
    subheadline: "A fully transparent, step-by-step introduction to creating side income with Nutrilite & Amway Solutions.",
    body_content: "In this masterclass, you will learn: 1. The shift from traditional selling to digital recommendations. 2. How to leverage Nutrilite organic supplements to target the booming wellness sector. 3. Practical compliance guidelines to build a sustainable, long-term asset without high inventory costs.",
    cta_text: "Reserve My Free Seat Now",
    cta_type: CtaType.FormSubmit,
    cta_url: "",
    video_url: "",
    status: "Published",
    seo_title: "Free Amway Malaysia Social Commerce Masterclass",
    meta_description: "Register for a beginner-friendly Amway Malaysia product-sharing masterclass with clear compliance, follow-up, and business disclosure.",
    canonical_url: "",
    og_image_url: "",
    brand_logo_url: "",
    brand_accent_color: "#2563eb",
    hero_image_url: "",
    hero_layout: "Split",
    audience_segment: "Warm prospects exploring wellness, beauty, home care, or side-income education",
    tracking_source: "webinar-register",
    trust_points: "Clear Amway disclosure\nNo income guarantees\nNo medical claims\nConsent-based follow-up",
    faq_items: "Is this free? | Yes, this session is free.\nWill there be a replay? | Yes, a replay can be shared after registration.",
    testimonial_items: "Use real learner feedback only after permission.",
    custom_sections: "Instructor bio\nLearning outcomes\nFAQ\nCompliance disclosure preview",
    footer_disclaimer: "Independent Amway Partner content. No income guarantees or medical claims.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "wp2",
    webinar_id: "w1",
    page_type: PageType.ThankYou,
    slug: "thank-you",
    headline: "Registration Confirmed! Welcome Aboard.",
    subheadline: "We have saved your seat. Please check your WhatsApp for login details.",
    body_content: "The masterclass will begin exactly on time. Make sure you are in a quiet room with a stable internet connection. In the meantime, join our WhatsApp Broadcast updates list to receive a free PDF guide on Wellness trends.",
    cta_text: "Join WhatsApp Update Group",
    cta_type: CtaType.WhatsApp,
    cta_url: "https://wa.me/60123456789?text=I%20have%20registered%20for%20the%20digital%20distribution%20webinar!",
    video_url: "",
    status: "Published",
    seo_title: "Registration Confirmed | Amway Malaysia Masterclass",
    meta_description: "Thank-you page for registered webinar guests with WhatsApp reminder instructions and next steps.",
    brand_accent_color: "#10b981",
    hero_layout: "Centered",
    tracking_source: "webinar-thank-you",
    trust_points: "WhatsApp reminder\nCalendar confirmation\nReplay access",
    faq_items: "What happens next? | Check WhatsApp for manual reminders and session details.",
    custom_sections: "Confirmation summary\nWhatsApp CTA\nQuick survey prompt",
    footer_disclaimer: "You can opt out of follow-up at any time.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "wp3",
    webinar_id: "w1",
    page_type: PageType.Replay,
    slug: "replay",
    headline: "Masterclass Replay: Digital Social Commerce distribution",
    subheadline: "Available for a limited time only. Grab a coffee and review the blueprint.",
    body_content: "This presentation covers the compliant model of growing an Amway Malaysia franchise. If you are ready to set up an interview with us to review your eligibility, please use the WhatsApp application link below.",
    cta_text: "Book My 10-Min Strategy Call",
    cta_type: CtaType.WhatsApp,
    cta_url: "https://wa.me/60123456789?text=I%20have%20finished%20the%20replay%20and%20want%20to%20book%20a%20call",
    video_url: "",
    status: "Published",
    seo_title: "Replay | Digital Social Commerce Masterclass",
    meta_description: "Replay page for registered prospects to review compliant Amway Malaysia product-sharing education.",
    brand_accent_color: "#1d4ed8",
    hero_layout: "Video",
    tracking_source: "webinar-replay",
    trust_points: "Replay access\nTopic summary\nDisclosure before partnership CTA",
    faq_items: "Can I ask questions after the replay? | Yes, use the WhatsApp CTA for a respectful follow-up conversation.",
    custom_sections: "Replay video\nTopic summary\nNext steps\nDisclosure CTA",
    footer_disclaimer: "Replay is educational and does not promise earnings or health outcomes.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "wp4",
    webinar_id: "w1",
    page_type: PageType.FollowUpSignUp,
    slug: "signup",
    headline: "Partner With Us: Build Your Amway Malaysia Business",
    subheadline: "An honest, compliant, and supportive pathway to independent business ownership.",
    body_content: "Important Disclosure: This program teaches you to build an independent business by distributing Amway Malaysia products (Nutrilite, Artistry, Home Care). Success requires consistent customer building, personal effort, retail sales, and adherence to Amway Rules of Conduct. There are no income guarantees, easy-money promises, or shortcuts. We focus on training, mentorship, and high-quality products.",
    cta_text: "Start My Sign-Up Conversation",
    cta_type: CtaType.WhatsApp,
    cta_url: "https://wa.me/60123456789?text=I%20read%20the%20disclosure%20and%20want%20to%20know%20how%20to%20sign%20up%20as%20an%20ABO",
    video_url: "",
    status: "Published",
    seo_title: "Transparent Amway Malaysia Business Disclosure",
    meta_description: "Clear Amway Malaysia business disclosure page explaining effort, retail customer building, and no income guarantees.",
    brand_accent_color: "#0f172a",
    hero_layout: "Editorial",
    audience_segment: "Prospects who watched the replay or requested business information",
    tracking_source: "webinar-disclosure",
    trust_points: "Amway relationship disclosed\nNo income guarantees\nRetail customer focus\nCompliance-first conversation",
    faq_items: "Is income guaranteed? | No. Results depend on personal effort, retail customers, training, and compliance.\nIs this connected to Amway? | Yes, this page clearly discloses that relationship.",
    custom_sections: "Disclosure summary\nImportant disclaimer\nSponsor conversation CTA\nOfficial Amway portal CTA",
    footer_disclaimer: "This is an independent ABO conversation page. Always refer to official Amway Malaysia materials before joining.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_LEADS: Lead[] = [
  {
    id: "l1",
    name: "Mohd Fauzi",
    phone: "60112345678",
    email: "fauzi.kl@gmail.com",
    platform: "WhatsApp",
    source: "Instagram Reel",
    interest_type: InterestType.Wellness,
    lead_temperature: "Hot",
    stage: LeadStage.New,
    permission_status: PermissionStatus.OkToFollowUp,
    best_angle: "Interested in Nutrilite health boosters for daily desk workers.",
    notes: "Commented on healthy posture and nutrition post. Wants daily pack suggestions.",
    last_contacted_at: null,
    next_follow_up_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "l2",
    name: "Rachel Tan",
    phone: "60176543210",
    email: "rachel.tan@yahoo.com",
    platform: "Facebook",
    source: "Facebook Organic",
    interest_type: InterestType.Beauty,
    lead_temperature: "Warm",
    stage: LeadStage.Messaged,
    permission_status: PermissionStatus.OkToFollowUp,
    best_angle: "Artistry skin hydration tips.",
    notes: "Sent the initial introductory script. No response yet.",
    last_contacted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "l3",
    name: "Vikneswaran",
    phone: "60139988776",
    email: "vik.kalyan@gmail.com",
    platform: "LinkedIn",
    source: "Direct Outreach",
    interest_type: InterestType.SideIncome,
    lead_temperature: "Hot",
    stage: LeadStage.WebinarRegistered,
    permission_status: PermissionStatus.OkToFollowUp,
    best_angle: "Low risk e-commerce startup.",
    notes: "Registered for the accelerator webinar. Sent welcome script via WhatsApp.",
    last_contacted_at: new Date().toISOString(),
    next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_INTERACTIONS: Interaction[] = [
  {
    id: "i1",
    lead_id: "l2",
    type: "First Message Sent",
    notes: "Sent introductory script about Artistry moisturizers. Encouraged looking at a quick review guide.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "p1",
    lead_id: "l3",
    webinar_id: "w1",
    stripe_payment_link: "",
    amount: 50.0,
    currency: "MYR",
    status: PaymentStatus.Paid,
    payment_type: PaymentType.Workshop,
    paid_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_REGISTRATIONS: WebinarRegistration[] = [
  {
    id: "reg1",
    webinar_id: "w1",
    name: "Vikneswaran",
    phone: "60139988776",
    email: "vik.kalyan@gmail.com",
    interest_type: InterestType.SideIncome,
    source: "Direct Outreach",
    consent_to_follow_up: true,
    status: WebinarRegistrationStage.Registered,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_CONTENT_POSTS: ContentPost[] = [
  {
    id: "cp1",
    title: "The Side Income Reality Check",
    platform: "TikTok",
    post_date: new Date().toISOString().split("T")[0],
    hook: "You don't need a massive capital to start a real secondary stream in KL.",
    caption: "Breaking down how social distribution works with zero inventory requirements in Malaysia. #SideIncome #KLBiz",
    cta: "Comment Blue below to get my free PDF guide.",
    views: 1250,
    comments: 18,
    dms: 4,
    leads_created: 3,
    category: "Side-income journey",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_EVENTS: Event[] = [
  {
    id: "e1",
    event_name: "Mid Valley Wellness Expo 2026",
    event_type: "Networking Expo",
    location: "Mid Valley Exhibition Centre, KL",
    event_date: "2026-06-20",
    target_contacts: 10,
    actual_contacts: 8,
    leads_created: 4,
    follow_ups_created: 3,
    notes: "Highly receptive audience for organic products. Connected with 3 active Gym goers.",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_REFERRALS: Referral[] = [
  {
    id: "ref1",
    referrer_name: "Rachel Tan",
    referred_name: "Sarah Lim",
    referred_phone: "60162233445",
    interest_type: InterestType.Beauty,
    status: "New",
    follow_up_date: new Date().toISOString().split("T")[0],
    notes: "Rachel's cousin. Loves organic cosmetic skincare products.",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_UTM: UtmLink[] = [
  {
    id: "utm1",
    name: "TikTok Bio Link - Webinar",
    base_url: "https://brightfuture.my/register",
    utm_source: "tiktok",
    utm_medium: "bio_link",
    utm_campaign: "july_accelerator",
    utm_content: "profile",
    final_url: "https://brightfuture.my/register?utm_source=tiktok&utm_medium=bio_link&utm_campaign=july_accelerator&utm_content=profile",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_QR: QrCode[] = [
  {
    id: "qr1",
    name: "Wellness Webinar Leaflet QR",
    type: "Webinar Register",
    content: "https://brightfuture.my/register",
    created_at: new Date().toISOString()
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod_1",
    product_name: "Botanical Double-X Gold Edition",
    product_code: "NUTR-1001",
    category: "Wellness",
    brand: "Nutrilite",
    description: "Concentrated blend of vitamins, minerals, and phytonutrients for energy booster.",
    image_url: "",
    retail_price: 245.0,
    abo_price: 196.0,
    pv: 50,
    bv: 150,
    currency: "RM",
    availability_status: "Available",
    official_product_url: "https://www.amway.my/p/1001",
    notes: "Top seller for corporate workers and wellness enthusiasts.",
    imported_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "prod_2",
    product_name: "Organic Salmon Omega-3 Plus",
    product_code: "NUTR-1002",
    category: "Nutrition",
    brand: "Nutrilite",
    description: "Premium cold-water salmon omega-3 fatty acids for cardiovascular and brain wellness.",
    image_url: "",
    retail_price: 180.0,
    abo_price: 144.0,
    pv: 36,
    bv: 110,
    currency: "RM",
    availability_status: "Available",
    official_product_url: "https://www.amway.my/p/1002",
    notes: "Pairs excellently with Double-X as a daily wellness routine.",
    imported_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "prod_3",
    product_name: "Hydra-V Ampoule Moisture Mask",
    product_code: "BEAU-2001",
    category: "Skincare",
    brand: "Artistry",
    description: "Concentrated moisturizing ampoule sheet mask for deep skin hydration in humid weather.",
    image_url: "",
    retail_price: 135.0,
    abo_price: 108.0,
    pv: 28,
    bv: 80,
    currency: "RM",
    availability_status: "Available",
    official_product_url: "https://www.amway.my/p/2001",
    notes: "Recommended for beauty routines and skin repair.",
    imported_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "prod_4",
    product_name: "Concentrated L.O.C. Multi-Purpose Cleaner",
    product_code: "HOME-3001",
    category: "Home Care",
    brand: "Amway Home",
    description: "Biodegradable, safe multi-surface cleaner made with natural ingredients.",
    image_url: "",
    retail_price: 45.0,
    abo_price: 36.0,
    pv: 9,
    bv: 25,
    currency: "RM",
    availability_status: "Available",
    official_product_url: "https://www.amway.my/p/3001",
    notes: "Extremely cost-effective, concentrated formula.",
    imported_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_BUNDLES: Bundle[] = [
  {
    id: "bund_1",
    bundle_name: "Simple Wellness Starter Routine",
    category: "Wellness",
    description: "Consists of Botanical Double-X and Salmon Omega-3 Plus for daily vitality.",
    total_price: 425.0,
    notes: "Ideal for onboarding new customers to the Wellness category.",
    status: "Active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_BUNDLE_ITEMS: BundleItem[] = [
  {
    id: "bi_1",
    bundle_id: "bund_1",
    product_id: "prod_1",
    quantity: 1,
    created_at: new Date().toISOString()
  },
  {
    id: "bi_2",
    bundle_id: "bund_1",
    product_id: "prod_2",
    quantity: 1,
    created_at: new Date().toISOString()
  }
];

// Database state initializer
export function initDb() {
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCT_IMPORTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_IMPORTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDER_ITEMS)) {
    localStorage.setItem(STORAGE_KEYS.ORDER_ITEMS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BUNDLES)) {
    localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(DEFAULT_BUNDLES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BUNDLE_ITEMS)) {
    localStorage.setItem(STORAGE_KEYS.BUNDLE_ITEMS, JSON.stringify(DEFAULT_BUNDLE_ITEMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCRIPTS)) {
    localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(DEFAULT_SCRIPTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RESOURCES)) {
    localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(DEFAULT_RESOURCES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WEBINARS)) {
    localStorage.setItem(STORAGE_KEYS.WEBINARS, JSON.stringify([DEFAULT_WEBINAR]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WEBINAR_PAGES)) {
    localStorage.setItem(STORAGE_KEYS.WEBINAR_PAGES, JSON.stringify(DEFAULT_WEBINAR_PAGES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LEADS)) {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(DEFAULT_LEADS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INTERACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(DEFAULT_INTERACTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(DEFAULT_PAYMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WEBINAR_REGISTRATIONS)) {
    localStorage.setItem(STORAGE_KEYS.WEBINAR_REGISTRATIONS, JSON.stringify(DEFAULT_REGISTRATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONTENT_POSTS)) {
    localStorage.setItem(STORAGE_KEYS.CONTENT_POSTS, JSON.stringify(DEFAULT_CONTENT_POSTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(DEFAULT_EVENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REFERRALS)) {
    localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(DEFAULT_REFERRALS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.UTM_LINKS)) {
    localStorage.setItem(STORAGE_KEYS.UTM_LINKS, JSON.stringify(DEFAULT_UTM));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QR_CODES)) {
    localStorage.setItem(STORAGE_KEYS.QR_CODES, JSON.stringify(DEFAULT_QR));
  }

  // Create initial tasks based on leads if tasks are empty
  if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
    const leads = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADS) || "[]") as Lead[];
    const initialTasks: Task[] = [];
    leads.forEach(lead => {
      if (lead.stage === LeadStage.New) {
        initialTasks.push({
          id: `t_${lead.id}_init`,
          lead_id: lead.id,
          task_type: TaskType.FirstMessage,
          title: `Reach out to ${lead.name}`,
          description: `Send introductory message. Recommended: First Connection script.`,
          due_date: new Date().toISOString().split("T")[0],
          status: TaskStatus.Pending,
          priority: TaskPriority.High,
          created_at: new Date().toISOString(),
          completed_at: null
        });
      } else if (lead.stage === LeadStage.Messaged) {
        initialTasks.push({
          id: `t_${lead.id}_init`,
          lead_id: lead.id,
          task_type: TaskType.FollowUp,
          title: `Check back with ${lead.name}`,
          description: `No reply yet. Follow up to offer premium product demo or reference guide.`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: TaskStatus.Pending,
          priority: TaskPriority.Medium,
          created_at: new Date().toISOString(),
          completed_at: null
        });
      }
    });
    // Add general task
    initialTasks.push({
      id: "t_gen_1",
      lead_id: null,
      task_type: TaskType.ResourceLearning,
      title: "Review Amway Rules of Conduct",
      description: "Familiarize yourself with rules on digital advertisements and compliance claims.",
      due_date: new Date().toISOString().split("T")[0],
      status: TaskStatus.Pending,
      priority: TaskPriority.High,
      created_at: new Date().toISOString(),
      completed_at: null
    });

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(initialTasks));
  }
}

// Helper getter & setter
function get<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) || "[]") as T;
}

function set<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
  syncToSupabase(key, data);
}

// Automatic follow-up task generation logic
function handleLeadTaskLogic(lead: Lead) {
  if (lead.stage === LeadStage.DoNotContact) {
    // Never create follow-up tasks for Do Not Contact
    return;
  }

  const tasks = get<Task[]>(STORAGE_KEYS.TASKS);
  // Complete any old pending tasks for this lead
  const updatedTasks = tasks.map(t => {
    if (t.lead_id === lead.id && t.status === TaskStatus.Pending) {
      return { ...t, status: TaskStatus.Completed, completed_at: new Date().toISOString() };
    }
    return t;
  });

  let nextDays = 0;
  let taskType = TaskType.FollowUp;
  let title = `Follow up with ${lead.name}`;
  let description = "";

  switch (lead.stage) {
    case LeadStage.New:
      nextDays = 0; // today
      taskType = TaskType.FirstMessage;
      title = `Send first message to ${lead.name}`;
      description = "Send introductory message or Icebreaker. Open WhatsApp to initiate.";
      break;
    case LeadStage.Messaged:
      nextDays = 2; // in 2 days
      taskType = TaskType.FollowUp;
      title = `Follow up with ${lead.name} (Messaged)`;
      description = "No reply yet. Send a gentle reminder check-in script.";
      break;
    case LeadStage.Replied:
      nextDays = 1; // next day
      taskType = TaskType.FollowUp;
      title = `Respond to ${lead.name}`;
      description = "Lead replied. Answer their questions or invite them to a casual meeting.";
      break;
    case LeadStage.Interested:
      nextDays = 0; // within 24 hours (today)
      taskType = TaskType.InviteToWebinar;
      title = `Invite ${lead.name} to Webinar/Call`;
      description = "High interest. Recommend inviting to the upcoming digital masterclass or Zoom call.";
      break;
    case LeadStage.WebinarRegistered:
      nextDays = 0; // immediate (today)
      taskType = TaskType.FirstMessage;
      title = `Send Welcome Message to ${lead.name}`;
      description = "Send welcome template with date/time of the webinar.";
      break;
    case LeadStage.WebinarAttended:
      nextDays = 1;
      taskType = TaskType.FollowUp;
      title = `Check-in with ${lead.name} after Webinar`;
      description = "Attended webinar. Ask for thoughts, or transition to sign-up conversation.";
      break;
    case LeadStage.ReplayWatched:
      nextDays = 0; // within 24 hours
      taskType = TaskType.SendReplay;
      title = `Follow-up on Replay with ${lead.name}`;
      description = "Watched replay. Move to booking a 10-min Zoom call.";
      break;
    case LeadStage.NotNow:
      nextDays = 30; // 30 days
      taskType = TaskType.FollowUp;
      title = `Warm check-in with ${lead.name} (30d)`;
      description = "Not ready right now. Set a warm follow-up in 30 days.";
      break;
    default:
      nextDays = 3;
      taskType = TaskType.FollowUp;
      description = "Regular pipeline follow-up schedule.";
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + nextDays);
  const formattedDueDate = dueDate.toISOString().split("T")[0];

  const newTask: Task = {
    id: `t_auto_${lead.id}_${Date.now()}`,
    lead_id: lead.id,
    task_type: taskType,
    title,
    description,
    due_date: formattedDueDate,
    status: TaskStatus.Pending,
    priority: lead.lead_temperature === "Hot" ? TaskPriority.High : TaskPriority.Medium,
    created_at: new Date().toISOString(),
    completed_at: null
  };

  updatedTasks.push(newTask);
  set(STORAGE_KEYS.TASKS, updatedTasks);

  // Update lead's next follow-up date in state
  lead.next_follow_up_at = formattedDueDate;
}

// CRM Database API Actions
export const localDb = {
  // SETTINGS
  getSettings(): Settings {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)) as Settings;
  },
  saveSettings(settings: Settings): void {
    set(STORAGE_KEYS.SETTINGS, settings);
  },

  // LEADS
  getLeads(): Lead[] {
    return get<Lead[]>(STORAGE_KEYS.LEADS);
  },
  saveLead(lead: Lead): Lead {
    const leads = this.getLeads();
    const index = leads.findIndex(l => l.id === lead.id);
    const isNew = index === -1;

    lead.updated_at = new Date().toISOString();
    if (isNew) {
      lead.id = lead.id || `l_${Date.now()}`;
      lead.created_at = new Date().toISOString();
      leads.push(lead);
    } else {
      leads[index] = lead;
    }

    set(STORAGE_KEYS.LEADS, leads);

    // Auto-generate task
    handleLeadTaskLogic(lead);

    // Save lead again as next_follow_up_at might be updated by logic
    const updatedLeads = this.getLeads();
    const reIndex = updatedLeads.findIndex(l => l.id === lead.id);
    if (reIndex !== -1) {
      updatedLeads[reIndex] = lead;
      set(STORAGE_KEYS.LEADS, updatedLeads);
    }

    return lead;
  },
  deleteLead(id: string): void {
    const leads = this.getLeads();
    set(STORAGE_KEYS.LEADS, leads.filter(l => l.id !== id));
    deleteFromSupabase(STORAGE_KEYS.LEADS, id);
    // Remove tasks
    const tasks = get<Task[]>(STORAGE_KEYS.TASKS);
    const tasksToDelete = tasks.filter(t => t.lead_id === id);
    tasksToDelete.forEach(t => deleteFromSupabase(STORAGE_KEYS.TASKS, t.id));
    set(STORAGE_KEYS.TASKS, tasks.filter(t => t.lead_id !== id));
  },

  // INTERACTIONS
  getInteractions(leadId?: string): Interaction[] {
    const interactions = get<Interaction[]>(STORAGE_KEYS.INTERACTIONS);
    if (leadId) {
      return interactions.filter(i => i.lead_id === leadId);
    }
    return interactions;
  },
  addInteraction(interaction: Omit<Interaction, "id" | "created_at">): Interaction {
    const interactions = get<Interaction[]>(STORAGE_KEYS.INTERACTIONS);
    const newInteraction: Interaction = {
      ...interaction,
      id: `i_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    interactions.push(newInteraction);
    set(STORAGE_KEYS.INTERACTIONS, interactions);

    // Update lead's last contacted timestamp
    const leads = this.getLeads();
    const leadIndex = leads.findIndex(l => l.id === interaction.lead_id);
    if (leadIndex !== -1) {
      leads[leadIndex].last_contacted_at = interaction.date;
      leads[leadIndex].updated_at = new Date().toISOString();
      set(STORAGE_KEYS.LEADS, leads);
    }

    return newInteraction;
  },

  // TASKS
  getTasks(): Task[] {
    return get<Task[]>(STORAGE_KEYS.TASKS);
  },
  saveTask(task: Task): Task {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index === -1) {
      task.id = task.id || `t_${Date.now()}`;
      task.created_at = new Date().toISOString();
      tasks.push(task);
    } else {
      tasks[index] = task;
    }
    set(STORAGE_KEYS.TASKS, tasks);
    return task;
  },
  toggleTaskStatus(id: string): Task | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const task = tasks[index];
      task.status = task.status === TaskStatus.Pending ? TaskStatus.Completed : TaskStatus.Pending;
      task.completed_at = task.status === TaskStatus.Completed ? new Date().toISOString() : null;
      set(STORAGE_KEYS.TASKS, tasks);
      return task;
    }
    return null;
  },
  deleteTask(id: string): void {
    const tasks = this.getTasks();
    set(STORAGE_KEYS.TASKS, tasks.filter(t => t.id !== id));
    deleteFromSupabase(STORAGE_KEYS.TASKS, id);
  },

  // SCRIPTS
  getScripts(): Script[] {
    return get<Script[]>(STORAGE_KEYS.SCRIPTS);
  },
  saveScript(script: Script): Script {
    const scripts = this.getScripts();
    const index = scripts.findIndex(s => s.id === script.id);
    script.updated_at = new Date().toISOString();
    if (index === -1) {
      script.id = script.id || `s_${Date.now()}`;
      script.created_at = new Date().toISOString();
      scripts.push(script);
    } else {
      scripts[index] = script;
    }
    set(STORAGE_KEYS.SCRIPTS, scripts);
    return script;
  },
  deleteScript(id: string): void {
    const scripts = this.getScripts();
    set(STORAGE_KEYS.SCRIPTS, scripts.filter(s => s.id !== id));
    deleteFromSupabase(STORAGE_KEYS.SCRIPTS, id);
  },

  // RESOURCES
  getResources(): Resource[] {
    return get<Resource[]>(STORAGE_KEYS.RESOURCES);
  },
  saveResource(resource: Resource): Resource {
    const resources = this.getResources();
    const index = resources.findIndex(r => r.id === resource.id);
    if (index === -1) {
      resource.id = resource.id || `r_${Date.now()}`;
      resources.push(resource);
    } else {
      resources[index] = resource;
    }
    set(STORAGE_KEYS.RESOURCES, resources);
    return resource;
  },

  // WEBINARS
  getWebinars(): Webinar[] {
    return get<Webinar[]>(STORAGE_KEYS.WEBINARS);
  },
  saveWebinar(webinar: Webinar): Webinar {
    const webinars = this.getWebinars();
    const index = webinars.findIndex(w => w.id === webinar.id);
    webinar.updated_at = new Date().toISOString();
    if (index === -1) {
      webinar.id = webinar.id || `w_${Date.now()}`;
      webinar.created_at = new Date().toISOString();
      webinars.push(webinar);
    } else {
      webinars[index] = webinar;
    }
    set(STORAGE_KEYS.WEBINARS, webinars);
    return webinar;
  },
  deleteWebinar(id: string): void {
    const webinars = this.getWebinars();
    set(STORAGE_KEYS.WEBINARS, webinars.filter(w => w.id !== id));
    deleteFromSupabase(STORAGE_KEYS.WEBINARS, id);
    // Pages too
    const pages = get<WebinarPage[]>(STORAGE_KEYS.WEBINAR_PAGES);
    const pagesToDelete = pages.filter(p => p.webinar_id === id);
    pagesToDelete.forEach(p => deleteFromSupabase(STORAGE_KEYS.WEBINAR_PAGES, p.id));
    set(STORAGE_KEYS.WEBINAR_PAGES, pages.filter(p => p.webinar_id !== id));
  },

  // WEBINAR PAGES
  getWebinarPages(webinarId: string): WebinarPage[] {
    const pages = get<WebinarPage[]>(STORAGE_KEYS.WEBINAR_PAGES);
    return pages.filter(p => p.webinar_id === webinarId);
  },
  saveWebinarPage(page: WebinarPage): WebinarPage {
    const pages = get<WebinarPage[]>(STORAGE_KEYS.WEBINAR_PAGES);
    const index = pages.findIndex(p => p.id === page.id || (p.webinar_id === page.webinar_id && p.page_type === page.page_type));
    page.updated_at = new Date().toISOString();
    if (index === -1) {
      page.id = page.id || `wp_${Date.now()}`;
      page.created_at = new Date().toISOString();
      pages.push(page);
    } else {
      pages[index] = { ...pages[index], ...page };
    }
    set(STORAGE_KEYS.WEBINAR_PAGES, pages);
    return page;
  },

  // WEBINAR REGISTRATIONS
  getWebinarRegistrations(webinarId?: string): WebinarRegistration[] {
    const regs = get<WebinarRegistration[]>(STORAGE_KEYS.WEBINAR_REGISTRATIONS);
    if (webinarId) {
      return regs.filter(r => r.webinar_id === webinarId);
    }
    return regs;
  },
  addWebinarRegistration(reg: Omit<WebinarRegistration, "id" | "created_at">): WebinarRegistration {
    const regs = get<WebinarRegistration[]>(STORAGE_KEYS.WEBINAR_REGISTRATIONS);
    const newReg: WebinarRegistration = {
      ...reg,
      id: `reg_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    regs.push(newReg);
    set(STORAGE_KEYS.WEBINAR_REGISTRATIONS, regs);

    // Auto update or create lead in CRM
    const leads = this.getLeads();
    const existingLeadIndex = leads.findIndex(l => l.phone === reg.phone || l.email === reg.email);

    if (existingLeadIndex !== -1) {
      const oldLead = leads[existingLeadIndex];
      oldLead.stage = LeadStage.WebinarRegistered;
      oldLead.notes = `Registered for Webinar. Source: ${reg.source}. \nOld Notes: ${oldLead.notes}`;
      oldLead.updated_at = new Date().toISOString();
      this.saveLead(oldLead);
    } else {
      const newLead: Lead = {
        id: `l_${Date.now()}`,
        name: reg.name,
        phone: reg.phone,
        email: reg.email,
        platform: "WhatsApp",
        source: reg.source || "Webinar Funnel",
        interest_type: reg.interest_type,
        lead_temperature: "Hot",
        stage: LeadStage.WebinarRegistered,
        permission_status: reg.consent_to_follow_up ? PermissionStatus.OkToFollowUp : PermissionStatus.NoReplyYet,
        best_angle: "Registered directly via landing page registration.",
        notes: "Registered for webinar. Expressed interest in " + reg.interest_type + ".",
        last_contacted_at: null,
        next_follow_up_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.saveLead(newLead);
    }

    return newReg;
  },
  updateWebinarRegistrationStatus(id: string, status: WebinarRegistrationStage): void {
    const regs = get<WebinarRegistration[]>(STORAGE_KEYS.WEBINAR_REGISTRATIONS);
    const index = regs.findIndex(r => r.id === id);
    if (index !== -1) {
      regs[index].status = status;
      set(STORAGE_KEYS.WEBINAR_REGISTRATIONS, regs);
    }
  },

  // PAYMENTS
  getPayments(): Payment[] {
    return get<Payment[]>(STORAGE_KEYS.PAYMENTS);
  },
  savePayment(payment: Payment): Payment {
    const payments = this.getPayments();
    const index = payments.findIndex(p => p.id === payment.id);
    if (index === -1) {
      payment.id = payment.id || `p_${Date.now()}`;
      payment.created_at = new Date().toISOString();
      payments.push(payment);
    } else {
      payments[index] = payment;
    }
    set(STORAGE_KEYS.PAYMENTS, payments);
    return payment;
  },

  // CONTENT_POSTS
  getContentPosts(): ContentPost[] {
    return get<ContentPost[]>(STORAGE_KEYS.CONTENT_POSTS);
  },
  saveContentPost(post: ContentPost): ContentPost {
    const posts = this.getContentPosts();
    const index = posts.findIndex(p => p.id === post.id);
    if (index === -1) {
      post.id = post.id || `cp_${Date.now()}`;
      post.created_at = new Date().toISOString();
      posts.push(post);
    } else {
      posts[index] = post;
    }
    set(STORAGE_KEYS.CONTENT_POSTS, posts);
    return post;
  },
  deleteContentPost(id: string): void {
    const posts = this.getContentPosts();
    set(STORAGE_KEYS.CONTENT_POSTS, posts.filter(p => p.id !== id));
    deleteFromSupabase(STORAGE_KEYS.CONTENT_POSTS, id);
  },

  // EVENTS
  getEvents(): Event[] {
    return get<Event[]>(STORAGE_KEYS.EVENTS);
  },
  saveEvent(event: Event): Event {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === event.id);
    if (index === -1) {
      event.id = event.id || `e_${Date.now()}`;
      event.created_at = new Date().toISOString();
      events.push(event);
    } else {
      events[index] = event;
    }
    set(STORAGE_KEYS.EVENTS, events);
    return event;
  },
  deleteEvent(id: string): void {
    const events = this.getEvents();
    set(STORAGE_KEYS.EVENTS, events.filter(e => e.id !== id));
    deleteFromSupabase(STORAGE_KEYS.EVENTS, id);
  },

  // REFERRALS
  getReferrals(): Referral[] {
    return get<Referral[]>(STORAGE_KEYS.REFERRALS);
  },
  saveReferral(referral: Referral): Referral {
    const referrals = this.getReferrals();
    const index = referrals.findIndex(r => r.id === referral.id);
    if (index === -1) {
      referral.id = referral.id || `ref_${Date.now()}`;
      referral.created_at = new Date().toISOString();
      referrals.push(referral);

      // Create standard Task to follow up on referral
      const tasks = this.getTasks();
      tasks.push({
        id: `t_ref_${Date.now()}`,
        lead_id: null,
        task_type: TaskType.AskReferral,
        title: `Contact referral: ${referral.referred_name}`,
        description: `Referred by ${referral.referrer_name}. Phone: ${referral.referred_phone}. Notes: ${referral.notes}`,
        due_date: referral.follow_up_date,
        status: TaskStatus.Pending,
        priority: TaskPriority.Medium,
        created_at: new Date().toISOString(),
        completed_at: null
      });
      set(STORAGE_KEYS.TASKS, tasks);

    } else {
      referrals[index] = referral;
    }
    set(STORAGE_KEYS.REFERRALS, referrals);
    return referral;
  },
  deleteReferral(id: string): void {
    const referrals = this.getReferrals();
    set(STORAGE_KEYS.REFERRALS, referrals.filter(r => r.id !== id));
    deleteFromSupabase(STORAGE_KEYS.REFERRALS, id);
  },

  // UTM LINKS
  getUtmLinks(): UtmLink[] {
    return get<UtmLink[]>(STORAGE_KEYS.UTM_LINKS);
  },
  saveUtmLink(utm: UtmLink): UtmLink {
    const utms = this.getUtmLinks();
    const index = utms.findIndex(u => u.id === utm.id);
    if (index === -1) {
      utm.id = utm.id || `utm_${Date.now()}`;
      utm.created_at = new Date().toISOString();
      utms.push(utm);
    } else {
      utms[index] = utm;
    }
    set(STORAGE_KEYS.UTM_LINKS, utms);
    return utm;
  },
  deleteUtmLink(id: string): void {
    const utms = this.getUtmLinks();
    set(STORAGE_KEYS.UTM_LINKS, utms.filter(u => u.id !== id));
    deleteFromSupabase(STORAGE_KEYS.UTM_LINKS, id);
  },

  // QR CODES
  getQrCodes(): QrCode[] {
    return get<QrCode[]>(STORAGE_KEYS.QR_CODES);
  },
  saveQrCode(qr: QrCode): QrCode {
    const qrs = this.getQrCodes();
    const index = qrs.findIndex(q => q.id === qr.id);
    if (index === -1) {
      qr.id = qr.id || `qr_${Date.now()}`;
      qr.created_at = new Date().toISOString();
      qrs.push(qr);
    } else {
      qrs[index] = qr;
    }
    set(STORAGE_KEYS.QR_CODES, qrs);
    return qr;
  },
  deleteQrCode(id: string): void {
    const qrs = this.getQrCodes();
    set(STORAGE_KEYS.QR_CODES, qrs.filter(q => q.id !== id));
    deleteFromSupabase(STORAGE_KEYS.QR_CODES, id);
  },

  // PRODUCTS
  getProducts(): Product[] {
    return get<Product[]>(STORAGE_KEYS.PRODUCTS);
  },
  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    product.updated_at = new Date().toISOString();
    if (index === -1) {
      product.id = product.id || `prod_${Date.now()}`;
      product.created_at = new Date().toISOString();
      products.push(product);
    } else {
      products[index] = product;
    }
    set(STORAGE_KEYS.PRODUCTS, products);
    return product;
  },
  deleteProduct(id: string): void {
    const products = this.getProducts();
    set(STORAGE_KEYS.PRODUCTS, products.filter(p => p.id !== id));
    deleteFromSupabase(STORAGE_KEYS.PRODUCTS, id);
  },

  // PRODUCT IMPORTS
  getProductImports(): ProductImport[] {
    return get<ProductImport[]>(STORAGE_KEYS.PRODUCT_IMPORTS);
  },
  saveProductImport(imp: ProductImport): ProductImport {
    const imps = this.getProductImports();
    const index = imps.findIndex(i => i.id === imp.id);
    if (index === -1) {
      imp.id = imp.id || `imp_${Date.now()}`;
      imps.push(imp);
    } else {
      imps[index] = imp;
    }
    set(STORAGE_KEYS.PRODUCT_IMPORTS, imps);
    return imp;
  },

  // ORDERS
  getOrders(): Order[] {
    return get<Order[]>(STORAGE_KEYS.ORDERS);
  },
  saveOrder(order: Order, items: OrderItem[]): Order {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    order.updated_at = new Date().toISOString();
    if (index === -1) {
      order.id = order.id || `ord_${Date.now()}`;
      order.created_at = new Date().toISOString();
      orders.push(order);
    } else {
      orders[index] = order;
    }
    set(STORAGE_KEYS.ORDERS, orders);

    // Update items
    const allItems = get<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS);
    const filteredItems = allItems.filter(item => item.order_id !== order.id);
    const savedItems = items.map((item, idx) => ({
      ...item,
      id: item.id || `item_${order.id}_${idx}`,
      order_id: order.id,
      created_at: item.created_at || new Date().toISOString()
    }));
    set(STORAGE_KEYS.ORDER_ITEMS, [...filteredItems, ...savedItems]);

    return order;
  },
  deleteOrder(id: string): void {
    const orders = this.getOrders();
    set(STORAGE_KEYS.ORDERS, orders.filter(o => o.id !== id));
    deleteFromSupabase(STORAGE_KEYS.ORDERS, id);
    const items = get<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS);
    const itemsToDelete = items.filter(item => item.order_id === id);
    itemsToDelete.forEach(item => deleteFromSupabase(STORAGE_KEYS.ORDER_ITEMS, item.id));
    set(STORAGE_KEYS.ORDER_ITEMS, items.filter(item => item.order_id !== id));
  },
  getOrderItems(orderId?: string): OrderItem[] {
    const items = get<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS);
    if (orderId) {
      return items.filter(i => i.order_id === orderId);
    }
    return items;
  },

  // BUNDLES
  getBundles(): Bundle[] {
    return get<Bundle[]>(STORAGE_KEYS.BUNDLES);
  },
  saveBundle(bundle: Bundle, items: BundleItem[]): Bundle {
    const bundles = this.getBundles();
    const index = bundles.findIndex(b => b.id === bundle.id);
    bundle.updated_at = new Date().toISOString();
    if (index === -1) {
      bundle.id = bundle.id || `bund_${Date.now()}`;
      bundle.created_at = new Date().toISOString();
      bundles.push(bundle);
    } else {
      bundles[index] = bundle;
    }
    set(STORAGE_KEYS.BUNDLES, bundles);

    // Update bundle items
    const allItems = get<BundleItem[]>(STORAGE_KEYS.BUNDLE_ITEMS);
    const filteredItems = allItems.filter(item => item.bundle_id !== bundle.id);
    const savedItems = items.map((item, idx) => ({
      ...item,
      id: item.id || `bi_${bundle.id}_${idx}`,
      bundle_id: bundle.id,
      created_at: item.created_at || new Date().toISOString()
    }));
    set(STORAGE_KEYS.BUNDLE_ITEMS, [...filteredItems, ...savedItems]);

    return bundle;
  },
  deleteBundle(id: string): void {
    const bundles = this.getBundles();
    set(STORAGE_KEYS.BUNDLES, bundles.filter(b => b.id !== id));
    deleteFromSupabase(STORAGE_KEYS.BUNDLES, id);
    const items = get<BundleItem[]>(STORAGE_KEYS.BUNDLE_ITEMS);
    const itemsToDelete = items.filter(item => item.bundle_id === id);
    itemsToDelete.forEach(item => deleteFromSupabase(STORAGE_KEYS.BUNDLE_ITEMS, item.id));
    set(STORAGE_KEYS.BUNDLE_ITEMS, items.filter(item => item.bundle_id !== id));
  },
  getBundleItems(bundleId?: string): BundleItem[] {
    const items = get<BundleItem[]>(STORAGE_KEYS.BUNDLE_ITEMS);
    if (bundleId) {
      return items.filter(i => i.bundle_id === bundleId);
    }
    return items;
  },

  // REFRESH & EXPORT & SEED
  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.LEADS);
    localStorage.removeItem(STORAGE_KEYS.INTERACTIONS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SCRIPTS);
    localStorage.removeItem(STORAGE_KEYS.RESOURCES);
    localStorage.removeItem(STORAGE_KEYS.WEBINARS);
    localStorage.removeItem(STORAGE_KEYS.WEBINAR_PAGES);
    localStorage.removeItem(STORAGE_KEYS.WEBINAR_REGISTRATIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.CONTENT_POSTS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.REFERRALS);
    localStorage.removeItem(STORAGE_KEYS.UTM_LINKS);
    localStorage.removeItem(STORAGE_KEYS.QR_CODES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCT_IMPORTS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.ORDER_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.BUNDLES);
    localStorage.removeItem(STORAGE_KEYS.BUNDLE_ITEMS);
    initDb();
  },

  exportToCsv(tableKey: keyof typeof STORAGE_KEYS): string {
    const data = get<any[]>(STORAGE_KEYS[tableKey]);
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row =>
        headers
          .map(fieldName => {
            const val = row[fieldName];
            const cleanVal = val === null || val === undefined ? "" : String(val).replace(/"/g, '""');
            return `"${cleanVal}"`;
          })
          .join(",")
      )
    ];
    return csvRows.join("\n");
  }
};
