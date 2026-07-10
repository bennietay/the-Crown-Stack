/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LeadStage {
  New = "New",
  Messaged = "Messaged",
  Replied = "Replied",
  Interested = "Interested",
  Appointment = "Appointment",
  Customer = "Customer",
  BusinessProspect = "Business Prospect",
  WebinarRegistered = "Webinar Registered",
  WebinarAttended = "Webinar Attended",
  ReplayWatched = "Replay Watched",
  FollowUpPageClicked = "Follow-Up Page Clicked",
  OrderedProduct = "Ordered Product",
  RepeatCustomer = "Repeat Customer",
  NotNow = "Not Now",
  DoNotContact = "Do Not Contact"
}

export enum InterestType {
  Wellness = "Wellness",
  Beauty = "Beauty",
  HomeCare = "Home Care",
  SideIncome = "Side Income",
  Unknown = "Unknown"
}

export enum PermissionStatus {
  OkToFollowUp = "OK to follow up",
  NoReplyYet = "No reply yet",
  DoNotContact = "Do not contact"
}

export enum TaskType {
  AddLead = "Add Lead",
  FirstMessage = "First Message",
  FollowUp = "Follow Up",
  InviteToWebinar = "Invite to Webinar",
  SendReplay = "Send Replay",
  AskReferral = "Ask Referral",
  PostContent = "Post Content",
  PaymentFollowUp = "Payment Follow-Up",
  ResourceLearning = "Resource Learning",
  OrderConfirmation = "Order Confirmation",
  DeliveryFollowUp = "Delivery Follow-Up",
  ReorderFollowUp = "Reorder Follow-Up",
  ProductFeedbackRequest = "Product Feedback Request"
}

export enum TaskStatus {
  Pending = "Pending",
  Completed = "Completed"
}

export enum TaskPriority {
  Low = "Low",
  Medium = "Medium",
  High = "High"
}

export enum WebinarType {
  SideIncomeWebinar = "Side-Income Webinar",
  WellnessWebinar = "Wellness Webinar",
  BeautyWebinar = "Beauty Webinar",
  HomeCareWebinar = "Home Care Webinar",
  Custom = "Custom"
}

export enum PageType {
  SignUp = "Sign-Up",
  ThankYou = "Thank You",
  Replay = "Replay",
  FollowUpSignUp = "Follow-Up Sign-Up"
}

export enum CtaType {
  FormSubmit = "Form Submit",
  WhatsApp = "WhatsApp",
  StripePaymentLink = "Stripe Payment Link",
  OfficialAmwayLink = "Official Amway Link",
  ReplayLink = "Replay Link",
  CustomUrl = "Custom URL"
}

export enum WebinarRegistrationStage {
  Registered = "Registered",
  JoinedWhatsApp = "Joined WhatsApp",
  ReminderSent = "Reminder Sent",
  Attended = "Attended",
  WatchedReplay = "Watched Replay",
  ClickedCTA = "Clicked CTA",
  RequestedProductInfo = "Requested Product Info",
  RequestedBusinessInfo = "Requested Business Info",
  SentFollowUpPage = "Sent Follow-Up Page",
  ReadyForSignUpConversation = "Ready for Sign-Up Conversation",
  Customer = "Customer",
  BusinessProspect = "Business Prospect",
  NotNow = "Not Now"
}

export enum PaymentType {
  PaidWebinar = "Paid webinar",
  Workshop = "Workshop",
  Consultation = "Consultation",
  DigitalGuide = "Digital guide",
  Other = "Other"
}

export enum PaymentStatus {
  Unpaid = "Unpaid",
  Pending = "Pending",
  Paid = "Paid",
  Refunded = "Refunded",
  Cancelled = "Cancelled"
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Settings {
  name: string;
  whatsapp_phone: string;
  email: string;
  brand_name: string;
  brand_color: string;
  default_cta_text: string;
  daily_lead_target: number;
  daily_message_target: number;
  daily_follow_up_target: number;
  stripe_payment_link: string;
  grow_mode: boolean;
  scale_mode: boolean;
  compliance_accepted: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: string;
  source: string;
  interest_type: InterestType;
  lead_temperature: "Cold" | "Warm" | "Hot";
  stage: LeadStage;
  permission_status: PermissionStatus;
  best_angle: string;
  notes: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: string;
  notes: string;
  date: string;
  created_at: string;
}

export interface Task {
  id: string;
  lead_id: string | null;
  task_type: TaskType;
  title: string;
  description: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at: string | null;
}

export interface Script {
  id: string;
  title: string;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  status: string;
  notes: string;
  last_reviewed_at: string;
}

export interface Webinar {
  id: string;
  title: string;
  slug: string;
  topic: string;
  webinar_type: WebinarType;
  date: string;
  time: string;
  duration: number; // in minutes
  status: "Draft" | "Published";
  video_url: string;
  replay_url: string;
  stripe_payment_link: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarPage {
  id: string;
  webinar_id: string;
  page_type: PageType;
  slug: string;
  headline: string;
  subheadline: string;
  body_content: string;
  cta_text: string;
  cta_type: CtaType;
  cta_url: string;
  video_url: string;
  status: "Draft" | "Published";
  seo_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_image_url?: string;
  brand_logo_url?: string;
  brand_accent_color?: string;
  hero_image_url?: string;
  hero_layout?: "Split" | "Centered" | "Editorial" | "Video";
  audience_segment?: string;
  tracking_source?: string;
  trust_points?: string;
  faq_items?: string;
  testimonial_items?: string;
  custom_sections?: string;
  footer_disclaimer?: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarRegistration {
  id: string;
  webinar_id: string;
  name: string;
  phone: string;
  email: string;
  interest_type: InterestType;
  source: string;
  consent_to_follow_up: boolean;
  status: WebinarRegistrationStage;
  created_at: string;
}

export interface Payment {
  id: string;
  lead_id: string | null;
  webinar_id: string | null;
  stripe_payment_link: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  paid_at: string | null;
  created_at: string;
}

export interface ContentPost {
  id: string;
  title: string;
  platform: string;
  post_date: string;
  hook: string;
  caption: string;
  cta: string;
  views: number;
  comments: number;
  dms: number;
  leads_created: number;
  category: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_name: string;
  referred_name: string;
  referred_phone: string;
  interest_type: InterestType;
  status: string;
  follow_up_date: string;
  notes: string;
  created_at: string;
}

export interface Event {
  id: string;
  event_name: string;
  event_type: string;
  location: string;
  event_date: string;
  target_contacts: number;
  actual_contacts: number;
  leads_created: number;
  follow_ups_created: number;
  notes: string;
  created_at: string;
}

export interface UtmLink {
  id: string;
  name: string;
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  final_url: string;
  created_at: string;
}

export interface QrCode {
  id: string;
  name: string;
  type: string;
  content: string;
  created_at: string;
}

export interface Product {
  id: string;
  product_name: string;
  product_code: string;
  category: string;
  brand: string;
  description: string;
  image_url: string;
  retail_price: number;
  abo_price: number;
  pv: number;
  bv: number;
  currency: string;
  availability_status: "Available" | "Out of Stock" | "Limited" | "Discontinued" | "Unknown";
  official_product_url: string;
  notes: string;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImport {
  id: string;
  file_name: string;
  import_status: "Pending" | "Completed" | "Failed";
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  error_report: string;
  imported_at: string;
  created_at: string;
}

export interface Order {
  id: string;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_date: string;
  order_status: "Draft" | "Confirmed" | "Payment Pending" | "Paid" | "Ordered from Amway" | "Ready for Delivery" | "Delivered" | "Completed" | "Cancelled" | "Refunded";
  payment_status: "Unpaid" | "Pending" | "Paid" | "Refunded" | "Cancelled";
  payment_method: "Cash" | "Bank Transfer" | "DuitNow" | "Stripe Card Payment" | "Other";
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  stripe_payment_link: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pv: number;
  bv: number;
  created_at: string;
}

export interface Bundle {
  id: string;
  bundle_name: string;
  category: string;
  description: string;
  total_price: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
}
