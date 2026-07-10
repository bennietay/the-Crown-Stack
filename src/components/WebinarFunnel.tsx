/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Webinar, 
  WebinarPage, 
  PageType, 
  CtaType, 
  WebinarType, 
  InterestType, 
  WebinarRegistration, 
  WebinarRegistrationStage, 
  Settings 
} from "../types";
import { localDb } from "../db/localDb";
import { 
  Tv, 
  PenTool, 
  Settings as SettingsIcon, 
  ExternalLink, 
  UserCheck, 
  User,
  Save, 
  Plus, 
  AlertTriangle, 
  Eye, 
  Smartphone, 
  CheckSquare, 
  Sparkles, 
  PhoneCall, 
  ShieldCheck,
  Award,
  Video,
  DollarSign,
  Calendar,
  Copy,
  BarChart3,
  Search,
  Palette,
  Globe,
  LayoutTemplate,
  FileText,
  Megaphone
} from "lucide-react";

interface WebinarFunnelProps {
  settings: Settings;
}

type FunnelTrack = "business" | "product";

export default function WebinarFunnel({ settings }: WebinarFunnelProps) {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [webinarPages, setWebinarPages] = useState<WebinarPage[]>([]);
  
  // CMS state or Public preview simulator mode
  // 'cms' | 'simulator'
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<"cms" | "simulator">("cms");
  
  // Public Simulator step
  // 'signup' | 'thankyou' | 'replay' | 'signup-opp'
  const [simulatorPage, setSimulatorPage] = useState<"signup" | "thankyou" | "replay" | "signup-opp">("signup");

  // CMS edit states
  const [editTitle, setEditTitle] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState<WebinarType>(WebinarType.SideIncomeWebinar);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editReplayUrl, setEditReplayUrl] = useState("");
  const [editStripeLink, setEditStripeLink] = useState("");

  // CMS pages config states
  const [signupHeadline, setSignupHeadline] = useState("");
  const [signupSubheadline, setSignupSubheadline] = useState("");
  const [signupBody, setSignupBody] = useState("");
  const [oppHeadline, setOppHeadline] = useState("");
  const [oppBody, setOppBody] = useState("");
  const [oppChecked, setOppChecked] = useState(false); // Compliance checkbox
  const [activeCmsPageType, setActiveCmsPageType] = useState<PageType>(PageType.SignUp);
  const [pageDrafts, setPageDrafts] = useState<WebinarPage[]>([]);

  // Registration Form in simulator
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regInterest, setRegInterest] = useState<InterestType>(InterestType.Wellness);
  const [regSource, setRegSource] = useState("TikTok Web Funnel");
  const [regConsent, setRegConsent] = useState(false);
  const [latestReg, setLatestReg] = useState<WebinarRegistration | null>(null);

  const [enabledSections, setEnabledSections] = useState({
    instructorBio: true,
    testimonials: false,
    faq: true,
    bonusOffer: false
  });

  const getFunnelTrack = (type: WebinarType): FunnelTrack =>
    type === WebinarType.SideIncomeWebinar || type === WebinarType.Custom ? "business" : "product";

  const activeFunnelTrack = getFunnelTrack(editType);
  const trackMeta: Record<FunnelTrack, { label: string; badge: string; description: string }> = {
    business: {
      label: "Business Track",
      badge: "ABO Opportunity",
      description: "Promote the Amway business with transparent disclosure, realistic effort expectations, and no income guarantees."
    },
    product: {
      label: "Product Track",
      badge: "Product Education",
      description: "Promote Nutrilite, Artistry, or Home Care education with no medical, treatment, cure, or guaranteed-results claims."
    }
  };

  const selectedRegistrations = selectedWebinar ? localDb.getWebinarRegistrations(selectedWebinar.id) : [];
  const funnelWarnings = [
    !editTitle.trim() ? "Add a clear webinar title." : "",
    !editDate ? "Set a real date before sharing the link." : "",
    !editTime.trim() ? "Set the start time in Malaysia time." : "",
    !signupHeadline.trim() ? "Add a sign-up page headline." : "",
    !signupBody.trim() ? "Add simple learning outcomes." : "",
    pageDrafts.some(page => !page.seo_title?.trim()) ? "Add SEO titles for every funnel page." : "",
    pageDrafts.some(page => !page.meta_description?.trim()) ? "Add meta descriptions for every funnel page." : "",
    pageDrafts.some(page => page.meta_description && page.meta_description.length > 160) ? "Keep meta descriptions under 160 characters." : "",
    activeFunnelTrack === "business" && !oppBody.toLowerCase().includes("no income") && !oppBody.toLowerCase().includes("income guarantees")
      ? "Disclosure should clearly say there are no income guarantees."
      : "",
    activeFunnelTrack === "business" && !oppBody.toLowerCase().includes("amway") ? "Disclosure should clearly identify Amway." : "",
    activeFunnelTrack === "product" && !oppBody.toLowerCase().includes("no medical") && !oppBody.toLowerCase().includes("medical claims")
      ? "Product track disclosure should clearly say there are no medical claims."
      : "",
    activeFunnelTrack === "product" && !oppBody.toLowerCase().includes("amway") ? "Product track should disclose the Amway relationship." : ""
  ].filter(Boolean);
  const readinessScore = Math.max(0, 100 - funnelWarnings.length * 15);

  const pageOrder = [PageType.SignUp, PageType.ThankYou, PageType.Replay, PageType.FollowUpSignUp];
  const pageLabels: Record<PageType, string> = {
    [PageType.SignUp]: "Register",
    [PageType.ThankYou]: "Thank You",
    [PageType.Replay]: "Replay",
    [PageType.FollowUpSignUp]: activeFunnelTrack === "business" ? "Disclosure" : "Product CTA"
  };

  const getPageDefaults = (webinar: Webinar, pageType: PageType): WebinarPage => {
    const slugByType: Record<PageType, string> = {
      [PageType.SignUp]: "register",
      [PageType.ThankYou]: "thank-you",
      [PageType.Replay]: "replay",
      [PageType.FollowUpSignUp]: "partnership-disclosure"
    };
    const headlineByType: Record<PageType, string> = {
      [PageType.SignUp]: signupHeadline || webinar.title,
      [PageType.ThankYou]: "Your Seat is Reserved",
      [PageType.Replay]: `Replay: ${webinar.title}`,
      [PageType.FollowUpSignUp]: oppHeadline || "Transparent Amway Business Conversation"
    };
    const bodyByType: Record<PageType, string> = {
      [PageType.SignUp]: signupBody || webinar.topic,
      [PageType.ThankYou]: "Check WhatsApp for reminders, session links, and replay updates.",
      [PageType.Replay]: "Review the session, then choose a respectful follow-up conversation if the topic is relevant.",
      [PageType.FollowUpSignUp]: oppBody || "This opportunity is connected to Amway Malaysia. There are no income guarantees."
    };

    return {
      id: `wp_${webinar.id}_${pageType.replace(/\W+/g, "_").toLowerCase()}`,
      webinar_id: webinar.id,
      page_type: pageType,
      slug: slugByType[pageType],
      headline: headlineByType[pageType],
      subheadline: pageType === PageType.SignUp ? signupSubheadline : "",
      body_content: bodyByType[pageType],
      cta_text: pageType === PageType.SignUp ? "Reserve My Seat" : pageType === PageType.FollowUpSignUp ? "Start Sponsor Conversation" : "Continue",
      cta_type: pageType === PageType.SignUp ? CtaType.FormSubmit : CtaType.WhatsApp,
      cta_url: pageType === PageType.FollowUpSignUp ? `https://wa.me/${settings.whatsapp_phone}` : "",
      video_url: pageType === PageType.Replay ? editReplayUrl || editVideoUrl : "",
      status: "Published",
      seo_title: `${headlineByType[pageType]} | ${settings.brand_name}`,
      meta_description: `${webinar.topic}`.slice(0, 155),
      canonical_url: "",
      og_image_url: "",
      brand_logo_url: "",
      brand_accent_color: settings.brand_color || "#2563eb",
      hero_image_url: "",
      hero_layout: pageType === PageType.Replay ? "Video" : pageType === PageType.FollowUpSignUp ? "Editorial" : "Split",
      audience_segment: "Warm prospects who gave permission for follow-up",
      tracking_source: `${webinar.slug}-${slugByType[pageType]}`,
      trust_points: "Clear disclosure\nConsent-based follow-up\nNo income guarantees\nNo medical claims",
      faq_items: "Is this connected to Amway? | Yes, the relationship is disclosed clearly.\nWill you pressure me? | No. The follow-up is respectful and consent-based.",
      testimonial_items: "Use real testimonials only after permission.",
      custom_sections: "Hero\nCTA\nTrust points\nFAQ\nFooter disclaimer",
      footer_disclaimer: "Independent Amway Partner content. No income guarantees or medical claims.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const normalizePage = (page: WebinarPage, webinar: Webinar): WebinarPage => ({
    ...getPageDefaults(webinar, page.page_type),
    ...page,
    seo_title: page.seo_title || `${page.headline} | ${settings.brand_name}`,
    meta_description: page.meta_description || page.subheadline || webinar.topic.slice(0, 155),
    brand_accent_color: page.brand_accent_color || settings.brand_color || "#2563eb",
    hero_layout: page.hero_layout || "Split",
    tracking_source: page.tracking_source || `${webinar.slug}-${page.slug}`,
    trust_points: page.trust_points || "Clear disclosure\nConsent-based follow-up\nNo income guarantees\nNo medical claims",
    faq_items: page.faq_items || "Is this connected to Amway? | Yes, the relationship is disclosed clearly.",
    custom_sections: page.custom_sections || "Hero\nCTA\nFAQ\nFooter disclaimer",
    footer_disclaimer: page.footer_disclaimer || "Independent Amway Partner content. No income guarantees or medical claims."
  });

  const buildPageDrafts = (webinar: Webinar, pages: WebinarPage[]) =>
    pageOrder.map(pageType => normalizePage(pages.find(page => page.page_type === pageType) || getPageDefaults(webinar, pageType), webinar));

  const activeCmsPage = pageDrafts.find(page => page.page_type === activeCmsPageType);
  const getDraftByType = (pageType: PageType) => pageDrafts.find(page => page.page_type === pageType);
  const signupPageDraft = getDraftByType(PageType.SignUp);
  const thankYouPageDraft = getDraftByType(PageType.ThankYou);
  const replayPageDraft = getDraftByType(PageType.Replay);
  const disclosurePageDraft = getDraftByType(PageType.FollowUpSignUp);
  const activePreviewPage =
    simulatorPage === "signup" ? signupPageDraft :
    simulatorPage === "thankyou" ? thankYouPageDraft :
    simulatorPage === "replay" ? replayPageDraft :
    disclosurePageDraft;

  const parseEventDate = () => {
    const dateValue = editDate || selectedWebinar?.date || "";
    const timeValue = editTime || selectedWebinar?.time || "20:00";
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hour, minute] = timeValue.split(":").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, hour || 20, minute || 0);
  };

  const formatCalendarDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const buildGoogleCalendarUrl = () => {
    const start = parseEventDate();
    if (!start || !selectedWebinar) return "#";
    const end = new Date(start.getTime() + (selectedWebinar.duration || 45) * 60_000);
    const details = activeFunnelTrack === "business"
      ? "Transparent Amway business education session. No income guarantees."
      : "Product education session. No medical claims or purchase pressure.";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: selectedWebinar.title,
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      details,
      location: "Online via WhatsApp reminder"
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const buildIcsDataUrl = () => {
    const start = parseEventDate();
    if (!start || !selectedWebinar) return "#";
    const end = new Date(start.getTime() + (selectedWebinar.duration || 45) * 60_000);
    const description = activeFunnelTrack === "business"
      ? "Transparent Amway business education session. No income guarantees."
      : "Product education session. No medical claims or purchase pressure.";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ProspectFlow MY//Webinar Funnel//EN",
      "BEGIN:VEVENT",
      `UID:${selectedWebinar.id}@prospectflow.my`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${selectedWebinar.title}`,
      `DESCRIPTION:${description}`,
      "LOCATION:Online via WhatsApp reminder",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  };

  const handleRegistrationStatusChange = (id: string, status: WebinarRegistrationStage) => {
    localDb.updateWebinarRegistrationStatus(id, status);
    if (selectedWebinar) {
      setSelectedWebinar({ ...selectedWebinar });
    }
  };

  const getRegistrationStatusLabel = (status: WebinarRegistrationStage) =>
    status === WebinarRegistrationStage.Attended ? "Participated" : status;

  const registrationStatusCounts = Object.values(WebinarRegistrationStage).reduce((acc, status) => {
    acc[status] = selectedRegistrations.filter(reg => reg.status === status).length;
    return acc;
  }, {} as Record<WebinarRegistrationStage, number>);

  const updateActiveCmsPage = (patch: Partial<WebinarPage>) => {
    setPageDrafts(prev => prev.map(page => {
      if (page.page_type !== activeCmsPageType) return page;
      const updated = { ...page, ...patch, updated_at: new Date().toISOString() };
      if (updated.page_type === PageType.SignUp) {
        if (patch.headline !== undefined) setSignupHeadline(patch.headline);
        if (patch.subheadline !== undefined) setSignupSubheadline(patch.subheadline);
        if (patch.body_content !== undefined) setSignupBody(patch.body_content);
      }
      if (updated.page_type === PageType.FollowUpSignUp) {
        if (patch.headline !== undefined) setOppHeadline(patch.headline);
        if (patch.body_content !== undefined) setOppBody(patch.body_content);
      }
      return updated;
    }));
  };

  const applyBusinessTrackTemplate = () => {
    setEditType(WebinarType.SideIncomeWebinar);
    setEditTitle("Start Simple: Amway Product Sharing Intro");
    setEditTopic("A practical introduction to building customers through honest product education, follow-up, and compliance.");
    setSignupHeadline("Learn a Simple Customer-Building Routine");
    setSignupSubheadline("A beginner-friendly session for people curious about wellness, beauty, home-care products, or a transparent Amway business conversation.");
    setSignupBody("1. How to start with a small warm list. 2. How to explain products without medical claims. 3. How to follow up respectfully. 4. What the Amway opportunity is and is not.");
    setOppHeadline("Transparent Amway Business Conversation");
    setOppBody("This opportunity is connected to Amway Malaysia product distribution. Results depend on personal effort, retail customer building, training, and compliance with Amway Rules of Conduct. There are no income guarantees, no medical claims, and no pressure to join.");
    setPageDrafts(prev => prev.map(page => {
      if (page.page_type === PageType.SignUp) {
        return {
          ...page,
          headline: "Learn a Simple Customer-Building Routine",
          subheadline: "A beginner-friendly session for people curious about wellness, beauty, home-care products, or a transparent Amway business conversation.",
          body_content: "1. How to start with a small warm list. 2. How to explain products without medical claims. 3. How to follow up respectfully. 4. What the Amway opportunity is and is not.",
          seo_title: "Simple Amway Customer-Building Webinar | ProspectFlow MY",
          meta_description: "Register for a beginner-friendly Amway Malaysia session on customer building, product education, compliance, and respectful follow-up.",
          trust_points: "Beginner friendly\nNo medical claims\nNo income guarantees\nClear Amway disclosure",
          custom_sections: "Hero registration\nLearning outcomes\nInstructor bio\nFAQ\nCompliance preview"
        };
      }
      if (page.page_type === PageType.FollowUpSignUp) {
        return {
          ...page,
          headline: "Transparent Amway Business Conversation",
          body_content: "This opportunity is connected to Amway Malaysia product distribution. Results depend on personal effort, retail customer building, training, and compliance with Amway Rules of Conduct. There are no income guarantees, no medical claims, and no pressure to join.",
          seo_title: "Transparent Amway Malaysia Business Disclosure",
          meta_description: "Review a clear Amway Malaysia business disclosure with no income guarantees, no pressure, and retail customer-building expectations.",
          trust_points: "Amway relationship disclosed\nNo income guarantees\nRetail customer focus\nRules of Conduct reminder"
        };
      }
      return page;
    }));
  };

  const applyProductTrackTemplate = () => {
    setEditType(WebinarType.WellnessWebinar);
    setEditTitle("Product Education Class: Daily Wellness Routine");
    setEditTopic("A practical product education session for daily wellness habits, basic nutrition support, and respectful follow-up.");
    setSignupHeadline("Learn a Simple Daily Wellness Routine");
    setSignupSubheadline("A beginner-friendly product education class for people curious about Nutrilite, daily habits, and practical wellness support.");
    setSignupBody("1. How to build a simple daily supplement routine. 2. How to read lifestyle needs without making medical claims. 3. How to compare product options responsibly. 4. How to request a personal recommendation after the session.");
    setOppHeadline("Product Recommendation Next Step");
    setOppBody("This product education session is connected to an Independent Amway Partner in Malaysia. Information is for general wellness education only. There are no medical claims, disease treatment claims, cure claims, guaranteed results, or pressure to purchase. Product recommendations should be based on personal needs and official product information.");
    setPageDrafts(prev => prev.map(page => {
      if (page.page_type === PageType.SignUp) {
        return {
          ...page,
          headline: "Learn a Simple Daily Wellness Routine",
          subheadline: "A beginner-friendly product education class for people curious about Nutrilite, daily habits, and practical wellness support.",
          body_content: "1. How to build a simple daily supplement routine. 2. How to read lifestyle needs without making medical claims. 3. How to compare product options responsibly. 4. How to request a personal recommendation after the session.",
          seo_title: "Daily Wellness Product Education Class | ProspectFlow MY",
          meta_description: "Register for a beginner-friendly Nutrilite wellness education class with no medical claims and respectful product follow-up.",
          audience_segment: "Prospects interested in wellness, nutrition habits, or product recommendations",
          tracking_source: "product-register",
          trust_points: "Product education only\nNo medical claims\nNo guaranteed results\nConsent-based WhatsApp follow-up",
          faq_items: "Is this medical advice? | No, this is general product education only.\nWill I be pressured to buy? | No. Follow-up is respectful and consent-based.",
          custom_sections: "Hero registration\nRoutine overview\nProduct education points\nFAQ\nProduct disclaimer",
          footer_disclaimer: "Independent Amway Partner content. Product education only. No medical claims or guaranteed results."
        };
      }
      if (page.page_type === PageType.ThankYou) {
        return {
          ...page,
          headline: "Your Product Class Seat is Reserved",
          subheadline: "Check WhatsApp for the class reminder and product education notes.",
          body_content: "You will receive manual reminders and simple notes before the session. Bring your current wellness routine questions if relevant.",
          cta_text: "Join WhatsApp Reminder",
          seo_title: "Product Class Registration Confirmed",
          meta_description: "Confirmation page for product education class guests with WhatsApp reminder instructions.",
          tracking_source: "product-thank-you",
          trust_points: "Reminder confirmed\nEducation-first session\nOpt-out anytime"
        };
      }
      if (page.page_type === PageType.Replay) {
        return {
          ...page,
          headline: "Replay: Daily Wellness Product Education",
          subheadline: "Review the product education session and request a respectful personal recommendation if useful.",
          body_content: "This replay covers general product education, daily routine ideas, and responsible follow-up. It does not provide medical advice or guaranteed results.",
          cta_text: "Ask for Product Recommendation",
          seo_title: "Replay | Daily Wellness Product Education",
          meta_description: "Replay page for product education guests to review wellness routine ideas and request a respectful recommendation.",
          tracking_source: "product-replay",
          trust_points: "Replay access\nNo medical claims\nPersonal recommendation optional"
        };
      }
      if (page.page_type === PageType.FollowUpSignUp) {
        return {
          ...page,
          slug: "product-recommendation",
          headline: "Request a Personal Product Recommendation",
          subheadline: "A respectful next step for people who want help choosing a routine.",
          body_content: "This product education session is connected to an Independent Amway Partner in Malaysia. Information is for general wellness education only. There are no medical claims, disease treatment claims, cure claims, guaranteed results, or pressure to purchase. Product recommendations should be based on personal needs and official product information.",
          cta_text: "Message Me About Products",
          cta_type: CtaType.WhatsApp,
          cta_url: `https://wa.me/${settings.whatsapp_phone}`,
          seo_title: "Request an Amway Product Recommendation",
          meta_description: "Request a respectful Amway Malaysia product recommendation after reviewing general product education with no medical claims.",
          hero_layout: "Editorial",
          audience_segment: "Guests who requested product information after the class",
          tracking_source: "product-recommendation",
          trust_points: "Amway relationship disclosed\nNo medical claims\nNo guaranteed results\nNo pressure to purchase",
          faq_items: "Is this medical advice? | No. For medical conditions, speak to a qualified healthcare professional.\nDo I have to buy today? | No.",
          custom_sections: "Product education recap\nRecommendation CTA\nDisclaimer\nOpt-out reminder",
          footer_disclaimer: "Independent Amway Partner content. Product education only. No medical claims or guaranteed results."
        };
      }
      return page;
    }));
  };

  const applyStartSimpleTemplate = () => {
    if (activeFunnelTrack === "business") {
      applyBusinessTrackTemplate();
    } else {
      applyProductTrackTemplate();
    }
  };

  const handleCopyReminder = () => {
    if (!selectedWebinar) return;
    const message = activeFunnelTrack === "business"
      ? `Hi, quick reminder for ${selectedWebinar.title} on ${editDate || selectedWebinar.date} at ${editTime || selectedWebinar.time} Malaysia time. No pressure. The session is educational and includes transparent Amway disclosure. Reply YES if you want the joining link.`
      : `Hi, quick reminder for ${selectedWebinar.title} on ${editDate || selectedWebinar.date} at ${editTime || selectedWebinar.time} Malaysia time. No pressure. This is product education only, with no medical claims or purchase pressure. Reply YES if you want the joining link.`;
    navigator.clipboard.writeText(message);
    alert("Webinar reminder copied.");
  };

  useEffect(() => {
    loadWebinars();
  }, [settings]);

  const loadWebinars = () => {
    const list = localDb.getWebinars();
    setWebinars(list);
    if (list.length > 0) {
      handleChooseWebinar(list[0]);
    }
  };

  const handleChooseWebinar = (w: Webinar) => {
    setSelectedWebinar(w);
    setEditTitle(w.title);
    setEditTopic(w.topic);
    setEditDate(w.date);
    setEditTime(w.time);
    setEditType(w.webinar_type);
    setEditVideoUrl(w.video_url);
    setEditReplayUrl(w.replay_url);
    setEditStripeLink(w.stripe_payment_link);

    // Load pages
    const pagesList = localDb.getWebinarPages(w.id);
    setWebinarPages(pagesList);
    const drafts = buildPageDrafts(w, pagesList);
    setPageDrafts(drafts);
    setActiveCmsPageType(PageType.SignUp);

    const signupP = pagesList.find(p => p.page_type === PageType.SignUp);
    const oppP = pagesList.find(p => p.page_type === PageType.FollowUpSignUp);

    if (signupP) {
      setSignupHeadline(signupP.headline);
      setSignupSubheadline(signupP.subheadline);
      setSignupBody(signupP.body_content);
    }
    if (oppP) {
      setOppHeadline(oppP.headline);
      setOppBody(oppP.body_content);
    }
  };

  const handleSaveCMS = () => {
    if (!selectedWebinar) return;

    // Check compliance checkbox
    if (!oppChecked) {
      alert("Please confirm the compliance checkbox before updating webinar funnel pages.");
      return;
    }
    if (funnelWarnings.length > 0) {
      alert(`Please resolve the funnel readiness items before publishing:\n\n- ${funnelWarnings.join("\n- ")}`);
      return;
    }

    const updatedWebinar: Webinar = {
      ...selectedWebinar,
      title: editTitle,
      topic: editTopic,
      date: editDate,
      time: editTime,
      webinar_type: editType,
      video_url: editVideoUrl,
      replay_url: editReplayUrl,
      stripe_payment_link: editStripeLink,
      updated_at: new Date().toISOString()
    };

    localDb.saveWebinar(updatedWebinar);

    // Save pages
    const currentPages = localDb.getWebinarPages(selectedWebinar.id);
    const signupP = currentPages.find(p => p.page_type === PageType.SignUp);
    const oppP = currentPages.find(p => p.page_type === PageType.FollowUpSignUp);
    const draftsToSave = pageDrafts.map(page => {
      if (page.page_type === PageType.SignUp) {
        return {
          ...page,
          headline: signupHeadline,
          subheadline: signupSubheadline,
          body_content: signupBody
        };
      }
      if (page.page_type === PageType.FollowUpSignUp) {
        return {
          ...page,
          headline: oppHeadline,
          body_content: oppBody
        };
      }
      return page;
    });

    if (signupP) {
      localDb.saveWebinarPage({
        ...signupP,
        headline: signupHeadline,
        subheadline: signupSubheadline,
        body_content: signupBody
      });
    }

    if (oppP) {
      localDb.saveWebinarPage({
        ...oppP,
        headline: oppHeadline,
        body_content: oppBody
      });
    }
    draftsToSave.forEach(page => localDb.saveWebinarPage(page));

    alert("Webinar Funnel configurations updated successfully.");
    loadWebinars();
  };

  const handleAddWebinar = (track: FunnelTrack = "product") => {
    if (!settings.scale_mode) return;
    const isBusiness = track === "business";
    const newW: Webinar = {
      id: `w_${Date.now()}`,
      title: isBusiness ? "New Amway Business Intro Webinar" : "New Product Education Webinar",
      slug: `${isBusiness ? "business-intro" : "product-education"}-${Date.now()}`,
      topic: isBusiness
        ? "A transparent introduction to the Amway business, realistic daily actions, compliance, and sponsor next steps."
        : "A practical product education session for wellness, beauty, or home-care routines with compliant follow-up.",
      webinar_type: isBusiness ? WebinarType.SideIncomeWebinar : WebinarType.WellnessWebinar,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      time: "20:00",
      duration: 45,
      status: "Published",
      video_url: "",
      replay_url: "",
      stripe_payment_link: settings.stripe_payment_link,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.saveWebinar(newW);

    // Create pages templates
    const pages: WebinarPage[] = [
      {
        id: `wp_s_${Date.now()}`,
        webinar_id: newW.id,
        page_type: PageType.SignUp,
        slug: "register",
        headline: isBusiness ? "Learn a Simple Amway Business Starting Routine" : "Learn a Simple Product Routine",
        subheadline: isBusiness ? "A beginner-friendly session on customer building, compliant sharing, and realistic expectations." : "A beginner-friendly session on product education, daily routines, and respectful recommendations.",
        body_content: isBusiness
          ? "Learn how to build a warm list, invite without pressure, explain the Amway opportunity transparently, and follow up with no income guarantees."
          : "Learn how to understand customer needs, explain wellness or beauty routines without medical claims, and invite follow-up conversations.",
        cta_text: "Reserve My Seat",
        cta_type: CtaType.FormSubmit,
        cta_url: "",
        video_url: "",
        status: "Published",
        seo_title: isBusiness ? "Amway Business Intro Webinar | ProspectFlow MY" : "Product Education Webinar | ProspectFlow MY",
        meta_description: isBusiness
          ? "Register for a simple Amway Malaysia business intro with clear disclosure, no income guarantees, and respectful follow-up."
          : "Register for a simple product education session with compliant product education and respectful follow-up.",
        brand_accent_color: settings.brand_color || "#2563eb",
        hero_layout: "Split",
        tracking_source: isBusiness ? "business-register" : "product-register",
        trust_points: isBusiness ? "Clear Amway disclosure\nNo income guarantees\nRetail customer focus\nConsent-based follow-up" : "Product education only\nNo medical claims\nConsent-based WhatsApp follow-up",
        faq_items: "Is this a sales pitch? | It is an educational session with transparent follow-up options.",
        custom_sections: "Hero registration\nRoutine overview\nInstructor bio\nFAQ",
        footer_disclaimer: isBusiness ? "Independent Amway Partner content. No income guarantees." : "Independent Amway Partner content. Product education only.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `wp_t_${Date.now()}`,
        webinar_id: newW.id,
        page_type: PageType.ThankYou,
        slug: "thank-you",
        headline: "Seat Reserved!",
        subheadline: isBusiness ? "Business intro session starting soon." : "Product education session starting soon.",
        body_content: "Check WhatsApp for reminders, session notes, and replay access.",
        cta_text: "Join WhatsApp",
        cta_type: CtaType.WhatsApp,
        cta_url: "https://wa.me/60123456789",
        video_url: "",
        status: "Published",
        seo_title: isBusiness ? "Business Webinar Registration Confirmed" : "Product Webinar Registration Confirmed",
        meta_description: "Confirmation page for webinar guests with WhatsApp reminder instructions.",
        brand_accent_color: settings.brand_color || "#2563eb",
        hero_layout: "Centered",
        tracking_source: isBusiness ? "business-thank-you" : "product-thank-you",
        custom_sections: "Confirmation\nWhatsApp CTA\nQuick reminder",
        footer_disclaimer: "You may opt out of follow-up at any time.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `wp_f_${Date.now()}`,
        webinar_id: newW.id,
        page_type: PageType.FollowUpSignUp,
        slug: isBusiness ? "partnership-disclosure" : "product-recommendation",
        headline: isBusiness ? "Transparent Amway Business Conversation" : "Request a Product Recommendation",
        subheadline: isBusiness ? "Compliant sponsorship disclosure under Amway Malaysia Rules." : "A respectful next step for people who want help choosing a routine.",
        body_content: isBusiness
          ? "Disclosure: This opportunity is linked to Amway Malaysia product distribution. Success requires customer recommendation effort, retail sales, training, and personal consistency. There are no income promises or shortcuts."
          : "Disclosure: This product recommendation is connected to an Independent Amway Partner in Malaysia. Information is for general product education only. There are no medical claims, treatment claims, cure claims, guaranteed results, or pressure to purchase.",
        cta_text: isBusiness ? "Talk About Business" : "Ask About Products",
        cta_type: CtaType.WhatsApp,
        cta_url: "https://wa.me/60123456789",
        video_url: "",
        status: "Published",
        seo_title: isBusiness ? "Amway Business Disclosure | Malaysia" : "Amway Product Recommendation | Malaysia",
        meta_description: isBusiness
          ? "Transparent Amway Malaysia opportunity disclosure with no income guarantees and no pressure."
          : "Request an Amway Malaysia product recommendation after product education with no medical claims or pressure.",
        brand_accent_color: settings.brand_color || "#2563eb",
        hero_layout: "Editorial",
        tracking_source: isBusiness ? "business-disclosure" : "product-recommendation",
        trust_points: isBusiness ? "Amway relationship disclosed\nNo income guarantees\nNo pressure\nCompliance-first conversation" : "Amway relationship disclosed\nNo medical claims\nNo guaranteed results\nNo pressure to purchase",
        faq_items: isBusiness ? "Is this connected to Amway? | Yes, this page clearly discloses the relationship.\nIs income guaranteed? | No." : "Is this medical advice? | No, this is product education only.\nDo I need to buy today? | No.",
        custom_sections: isBusiness ? "Disclosure\nDisclaimer\nSponsor CTA\nOfficial portal link" : "Product education recap\nRecommendation CTA\nDisclaimer\nOpt-out reminder",
        footer_disclaimer: isBusiness ? "Always review official Amway Malaysia materials before joining." : "Independent Amway Partner content. Product education only. No medical claims or guaranteed results.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    pages.forEach(p => localDb.saveWebinarPage(p));
    loadWebinars();
    alert(`New ${isBusiness ? "Business" : "Product"} Webinar Funnel created (Scale Mode authorized).`);
  };

  // Simulator Form Submission
  const handleSimulatorRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone) {
      alert("Name and Phone are mandatory to simulate signups.");
      return;
    }
    if (!regConsent) {
      alert("Please check consent checkbox.");
      return;
    }
    if (!selectedWebinar) return;

    // Clean Phone
    let cleanPh = regPhone.replace(/\D/g, "");
    if (cleanPh.startsWith("0")) {
      cleanPh = "60" + cleanPh.substring(1);
    }

    const registration = localDb.addWebinarRegistration({
      webinar_id: selectedWebinar.id,
      name: regName,
      phone: cleanPh,
      email: regEmail,
      interest_type: regInterest,
      source: regSource,
      consent_to_follow_up: regConsent,
      status: WebinarRegistrationStage.Registered
    });

    setLatestReg(registration);
    setSimulatorPage("thankyou");

    // Reset Form
    setRegName("");
    setRegPhone("");
    setRegEmail("");
    setRegConsent(false);
  };

  return (
    <div className="space-y-4 pb-20 w-full font-sans text-gray-900">
      {/* Workspace toggle navigation */}
      <div className="bg-white p-2 border border-gray-200 rounded-[20px] flex items-center justify-between shadow-xs">
        <button
          id="toggle-cms-mode"
          onClick={() => setActiveWorkspaceMode("cms")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeWorkspaceMode === "cms" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>CMS Funnel Editor</span>
        </button>
        <button
          id="toggle-sim-mode"
          onClick={() => setActiveWorkspaceMode("simulator")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            activeWorkspaceMode === "simulator" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Live Funnel Preview</span>
        </button>
      </div>

      {/* CMS Form editor fields */}
      {selectedWebinar && activeWorkspaceMode === "cms" && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Config Column */}
          <div className="space-y-4">
            {/* Funnel Selector (SCALE mode only) */}
            {settings.scale_mode ? (
              <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Choose Active Funnel (Scale Mode Enabled)</label>
                  <div className="flex items-center gap-2">
                    <button
                      id="cms-add-business-webinar-btn"
                      onClick={() => handleAddWebinar("business")}
                      className="text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Business</span>
                    </button>
                    <button
                      id="cms-add-product-webinar-btn"
                      onClick={() => handleAddWebinar("product")}
                      className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Product</span>
                    </button>
                  </div>
                </div>
                <select
                  id="select-webinar-cms"
                  value={selectedWebinar.id}
                  onChange={(e) => {
                    const found = webinars.find(w => w.id === e.target.value);
                    if (found) handleChooseWebinar(found);
                  }}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                >
                  {webinars.map(w => (
                    <option key={w.id} value={w.id}>{w.title} ({w.webinar_type})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-100 p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Active Funnel: {selectedWebinar.title}</span>
                <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">Start Mode Limit 1</span>
              </div>
            )}

            <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Funnel Readiness</h3>
                    <p className="text-[10px] text-slate-500">Keep it simple: invite, register, remind, replay, follow up.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    readinessScore >= 85
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {readinessScore}% Ready
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                    {trackMeta[activeFunnelTrack].badge}
                  </span>
                  <button
                    id="apply-simple-funnel-template"
                    type="button"
                    onClick={applyStartSimpleTemplate}
                    className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-full"
                  >
                    Apply Current Track
                  </button>
                  <button
                    id="copy-webinar-reminder"
                    type="button"
                    onClick={handleCopyReminder}
                    className="text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Reminder</span>
                  </button>
                </div>
              </div>
              {funnelWarnings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {funnelWarnings.map(warning => (
                    <div key={warning} className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800">
                      {warning}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800">
                  Core funnel copy is ready for review. Test the preview and confirm links before sharing publicly.
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Registrations</span>
                  <span className="text-lg font-black text-slate-900">{selectedRegistrations.length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Consent</span>
                  <span className="text-lg font-black text-slate-900">{selectedRegistrations.filter(reg => reg.consent_to_follow_up).length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Latest</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1 truncate">{latestReg?.name || selectedRegistrations[0]?.name || "None"}</span>
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-100 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Registration Status Pipeline</h4>
                    <p className="text-[10px] text-slate-500">Track who registered, participated, watched replay, and requested the next step.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      WebinarRegistrationStage.Registered,
                      WebinarRegistrationStage.Attended,
                      WebinarRegistrationStage.WatchedReplay,
                      activeFunnelTrack === "business" ? WebinarRegistrationStage.RequestedBusinessInfo : WebinarRegistrationStage.RequestedProductInfo
                    ].map(status => (
                      <span key={status} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600">
                        {getRegistrationStatusLabel(status)}: {registrationStatusCounts[status] || 0}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedRegistrations.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedRegistrations.map(reg => (
                      <div key={reg.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="sm:col-span-5 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{reg.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{reg.phone} · {reg.interest_type}</p>
                        </div>
                        <div className="sm:col-span-3">
                          <span className="inline-flex px-2 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-600">
                            {reg.source}
                          </span>
                        </div>
                        <div className="sm:col-span-4">
                          <select
                            id={`webinar-reg-status-${reg.id}`}
                            value={reg.status}
                            onChange={(e) => handleRegistrationStatusChange(reg.id, e.target.value as WebinarRegistrationStage)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                          >
                            {Object.values(WebinarRegistrationStage).map(status => (
                              <option key={status} value={status}>{getRegistrationStatusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500">
                    No registrations yet. Submit the preview form once to test the status flow.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">Funnel General Configurations</h3>

              <div className="space-y-3.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Funnel Track</label>
                      <p className="text-[10px] text-slate-500 mt-0.5">{trackMeta[activeFunnelTrack].description}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 uppercase whitespace-nowrap">
                      {trackMeta[activeFunnelTrack].badge}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      id="select-business-funnel-track"
                      type="button"
                      onClick={applyBusinessTrackTemplate}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        activeFunnelTrack === "business"
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-bold">Business Track</span>
                      </div>
                      <p className={`text-[10px] mt-1 leading-relaxed ${activeFunnelTrack === "business" ? "text-slate-300" : "text-slate-500"}`}>
                        Webinar to explain the Amway opportunity, daily actions, and sponsor conversation.
                      </p>
                    </button>
                    <button
                      id="select-product-funnel-track"
                      type="button"
                      onClick={applyProductTrackTemplate}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        activeFunnelTrack === "product"
                          ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-bold">Product Track</span>
                      </div>
                      <p className={`text-[10px] mt-1 leading-relaxed ${activeFunnelTrack === "product" ? "text-blue-100" : "text-slate-500"}`}>
                        Webinar to educate prospects on wellness, beauty, or home-care products and recommendations.
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Webinar Masterclass Title</label>
                  <input
                    id="cms-webinar-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Value proposition / Headline Topic</label>
                  <input
                    id="cms-webinar-topic"
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Schedule Date</label>
                    <input
                      id="cms-webinar-date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Start Time (KL/Malaysia)</label>
                    <input
                      id="cms-webinar-time"
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="20:00"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Video Embed Link (Sign-Up/Replay)</label>
                    <input
                      id="cms-video-url"
                      type="text"
                      value={editVideoUrl}
                      onChange={(e) => setEditVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/embed/..."
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Stripe Checkout Link</label>
                    <input
                      id="cms-stripe-link"
                      type="text"
                      value={editStripeLink}
                      onChange={(e) => setEditStripeLink(e.target.value)}
                      placeholder="https://buy.stripe.com/..."
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Editor Column */}
          <div className="space-y-4">
            {/* Page Copy Editor */}
            <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">Landing Pages Content Copy</h3>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-[20px] space-y-2.5 border border-gray-200">
                  <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">1. Sign-Up Page Editor</span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Hero Headline</label>
                    <input
                      id="cms-signup-headline"
                      type="text"
                      value={signupHeadline}
                      onChange={(e) => setSignupHeadline(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                    />
                  </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Subheadline</label>
                  <input
                    id="cms-signup-subheadline"
                    type="text"
                    value={signupSubheadline}
                    onChange={(e) => setSignupSubheadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Learning Outcomes (Bullet lines)</label>
                  <textarea
                    id="cms-signup-body"
                    value={signupBody}
                    onChange={(e) => setSignupBody(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-[20px] space-y-2.5 border border-blue-100">
                <span className="text-[10px] font-bold text-blue-800 block uppercase tracking-wider flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{activeFunnelTrack === "business" ? "2. Opportunity Disclosure Page (Amway Compliant)" : "2. Product Recommendation Page (No Medical Claims)"}</span>
                </span>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Title Headline</label>
                  <input
                    id="cms-opp-headline"
                    type="text"
                    value={oppHeadline}
                    onChange={(e) => setOppHeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                    {activeFunnelTrack === "business" ? "Disclosure Body & Guidelines (Strict transparency)" : "Product Education Disclaimer & Next Step"}
                  </label>
                  <textarea
                    id="cms-opp-body"
                    value={oppBody}
                    onChange={(e) => setOppBody(e.target.value)}
                    rows={3}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
              </div>
            </div>

            {/* Page Builder Toggles */}
            {activeCmsPage && (
              <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Advanced Page CMS</h3>
                    <p className="text-[10px] text-slate-500 mt-1">SEO, branding, sections, and tracking for each funnel page.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                    {pageOrder.map(pageType => (
                      <button
                        id={`cms-page-tab-${pageType.replace(/\s+/g, "-").toLowerCase()}`}
                        key={pageType}
                        type="button"
                        onClick={() => setActiveCmsPageType(pageType)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                          activeCmsPageType === pageType
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {pageLabels[pageType]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  <div className="xl:col-span-7 space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] space-y-3">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Page Content</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">URL Slug</label>
                          <input
                            id="cms-advanced-page-slug"
                            value={activeCmsPage.slug}
                            onChange={(e) => updateActiveCmsPage({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Page Status</label>
                          <select
                            id="cms-advanced-page-status"
                            value={activeCmsPage.status}
                            onChange={(e) => updateActiveCmsPage({ status: e.target.value as WebinarPage["status"] })}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                          >
                            <option value="Published">Published</option>
                            <option value="Draft">Draft</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Headline</label>
                        <input
                          id="cms-advanced-page-headline"
                          value={activeCmsPage.headline}
                          onChange={(e) => updateActiveCmsPage({ headline: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Subheadline</label>
                        <input
                          id="cms-advanced-page-subheadline"
                          value={activeCmsPage.subheadline}
                          onChange={(e) => updateActiveCmsPage({ subheadline: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Body / Section Copy</label>
                        <textarea
                          id="cms-advanced-page-body"
                          value={activeCmsPage.body_content}
                          onChange={(e) => updateActiveCmsPage({ body_content: e.target.value })}
                          rows={3}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-[20px] space-y-3">
                      <div className="flex items-center space-x-2 text-blue-900">
                        <Search className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">SEO Settings</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">SEO Title ({activeCmsPage.seo_title?.length || 0}/60)</label>
                        <input
                          id="cms-seo-title"
                          value={activeCmsPage.seo_title || ""}
                          onChange={(e) => updateActiveCmsPage({ seo_title: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-blue-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Meta Description ({activeCmsPage.meta_description?.length || 0}/160)</label>
                        <textarea
                          id="cms-meta-description"
                          value={activeCmsPage.meta_description || ""}
                          onChange={(e) => updateActiveCmsPage({ meta_description: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-blue-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Canonical URL</label>
                          <input
                            id="cms-canonical-url"
                            value={activeCmsPage.canonical_url || ""}
                            onChange={(e) => updateActiveCmsPage({ canonical_url: e.target.value })}
                            placeholder="https://yourdomain.com/register"
                            className="w-full px-2.5 py-1.5 border border-blue-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">OG Image URL</label>
                          <input
                            id="cms-og-image-url"
                            value={activeCmsPage.og_image_url || ""}
                            onChange={(e) => updateActiveCmsPage({ og_image_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 border border-blue-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-[20px] space-y-3">
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <Palette className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Branding & Visuals</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Accent Color</label>
                          <input
                            id="cms-brand-accent"
                            type="color"
                            value={activeCmsPage.brand_accent_color || settings.brand_color || "#2563eb"}
                            onChange={(e) => updateActiveCmsPage({ brand_accent_color: e.target.value })}
                            className="w-full h-9 p-1 border border-emerald-100 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Hero Layout</label>
                          <select
                            id="cms-hero-layout"
                            value={activeCmsPage.hero_layout || "Split"}
                            onChange={(e) => updateActiveCmsPage({ hero_layout: e.target.value as WebinarPage["hero_layout"] })}
                            className="w-full px-2.5 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-20"
                          >
                            <option value="Split">Split</option>
                            <option value="Centered">Centered</option>
                            <option value="Editorial">Editorial</option>
                            <option value="Video">Video</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Logo URL</label>
                          <input
                            id="cms-brand-logo-url"
                            value={activeCmsPage.brand_logo_url || ""}
                            onChange={(e) => updateActiveCmsPage({ brand_logo_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-20"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Hero Image URL</label>
                          <input
                            id="cms-hero-image-url"
                            value={activeCmsPage.hero_image_url || ""}
                            onChange={(e) => updateActiveCmsPage({ hero_image_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 border border-emerald-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-opacity-20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] space-y-3">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <LayoutTemplate className="w-4 h-4 text-slate-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Advanced Sections</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Trust Points (one per line)</label>
                        <textarea
                          id="cms-trust-points"
                          value={activeCmsPage.trust_points || ""}
                          onChange={(e) => updateActiveCmsPage({ trust_points: e.target.value })}
                          rows={3}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">FAQ Items (Question | Answer)</label>
                        <textarea
                          id="cms-faq-items"
                          value={activeCmsPage.faq_items || ""}
                          onChange={(e) => updateActiveCmsPage({ faq_items: e.target.value })}
                          rows={3}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Testimonials / Proof Notes</label>
                        <textarea
                          id="cms-testimonial-items"
                          value={activeCmsPage.testimonial_items || ""}
                          onChange={(e) => updateActiveCmsPage({ testimonial_items: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Custom Sections / CMS Notes</label>
                        <textarea
                          id="cms-custom-sections"
                          value={activeCmsPage.custom_sections || ""}
                          onChange={(e) => updateActiveCmsPage({ custom_sections: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-5 space-y-4">
                    <div className="p-4 bg-white border border-gray-200 rounded-[20px] space-y-3 shadow-sm">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Search Preview</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-emerald-700 truncate">
                          {activeCmsPage.canonical_url || `https://yourdomain.com/${selectedWebinar.slug}/${activeCmsPage.slug}`}
                        </p>
                        <p className="text-sm font-semibold text-blue-700 leading-snug">
                          {activeCmsPage.seo_title || activeCmsPage.headline}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {activeCmsPage.meta_description || activeCmsPage.subheadline}
                        </p>
                      </div>
                    </div>

                    <div
                      className="p-5 rounded-[24px] border shadow-sm overflow-hidden"
                      style={{
                        borderColor: `${activeCmsPage.brand_accent_color || settings.brand_color || "#2563eb"}33`,
                        background: `linear-gradient(135deg, ${activeCmsPage.brand_accent_color || settings.brand_color || "#2563eb"}14, #ffffff 46%)`
                      }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {activeCmsPage.brand_logo_url ? (
                              <img src={activeCmsPage.brand_logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                                style={{ backgroundColor: activeCmsPage.brand_accent_color || settings.brand_color || "#2563eb" }}
                              >
                                {settings.brand_name[0] || "P"}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-900">{settings.brand_name}</p>
                              <p className="text-[9px] text-slate-500 uppercase">{pageLabels[activeCmsPage.page_type]} page</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-white/80 border border-white text-slate-500">
                            {activeCmsPage.hero_layout}
                          </span>
                        </div>

                        {activeCmsPage.hero_image_url && (
                          <img src={activeCmsPage.hero_image_url} alt="" className="w-full aspect-video rounded-2xl object-cover border border-white shadow-sm" />
                        )}

                        <div className="space-y-2">
                          <h4 className="text-lg font-black text-slate-950 leading-tight">{activeCmsPage.headline}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{activeCmsPage.subheadline || activeCmsPage.body_content}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {(activeCmsPage.trust_points || "").split("\n").filter(Boolean).slice(0, 4).map(point => (
                            <div key={point} className="flex items-center space-x-2 text-[10px] text-slate-700">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="w-full py-2.5 rounded-xl text-white text-xs font-bold"
                          style={{ backgroundColor: activeCmsPage.brand_accent_color || settings.brand_color || "#2563eb" }}
                        >
                          {activeCmsPage.cta_text || settings.default_cta_text}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-[20px] space-y-3">
                      <div className="flex items-center space-x-2 text-amber-900">
                        <Megaphone className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Audience & Tracking</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Audience Segment</label>
                        <input
                          id="cms-audience-segment"
                          value={activeCmsPage.audience_segment || ""}
                          onChange={(e) => updateActiveCmsPage({ audience_segment: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-amber-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Tracking Source Label</label>
                        <input
                          id="cms-tracking-source"
                          value={activeCmsPage.tracking_source || ""}
                          onChange={(e) => updateActiveCmsPage({ tracking_source: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-amber-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-20"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Footer Disclaimer</label>
                        <textarea
                          id="cms-footer-disclaimer"
                          value={activeCmsPage.footer_disclaimer || ""}
                          onChange={(e) => updateActiveCmsPage({ footer_disclaimer: e.target.value })}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-amber-100 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Page Builder Toggles */}
            <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">Page Builder Sections</h3>
              <p className="text-[10px] text-slate-500">Toggle premium section templates on your sign-up page.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(enabledSections).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setEnabledSections(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="accent-blue-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Compliance Publish Check */}
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-2.5">
              <div className="flex items-center space-x-1 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Verification Checkbox Required</span>
              </div>
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  id="cms-compliance-verify-check"
                  type="checkbox"
                  checked={oppChecked}
                  onChange={(e) => setOppChecked(e.target.checked)}
                  className="mt-0.5 accent-rose-600 rounded shrink-0"
                />
                <span className="text-[10px] text-rose-900 leading-tight">
                  I confirm this page does not include income guarantees, medical claims, misleading promises, pressure tactics, or hidden Amway-related claims.
                </span>
              </label>
            </div>

            <button
              id="save-cms-funnel"
              onClick={handleSaveCMS}
              className={`w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                oppChecked 
                  ? "bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-md cursor-pointer" 
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Publish and Sync Funnel</span>
            </button>
          </div>
        </div>
        </div>
      )}

      {/* PUBLIC WEBINAR LIVE PREVIEW CANVAS */}
      {selectedWebinar && activeWorkspaceMode === "simulator" && (
        <div className="space-y-4 animate-fade-in max-w-5xl mx-auto w-full">
          {/* Page step navigator */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center justify-between text-[10px] font-bold border border-gray-200 overflow-x-auto">
            {[
              { id: "signup", label: "1. Sign-Up Link" },
              { id: "thankyou", label: "2. Thank-You" },
              { id: "replay", label: "3. Replay Page" },
              { id: "signup-opp", label: activeFunnelTrack === "business" ? "4. Amway Disclosure" : "4. Product CTA" }
            ].map(step => (
              <button
                id={`sim-page-${step.id}`}
                key={step.id}
                onClick={() => setSimulatorPage(step.id as any)}
                className={`flex-1 min-w-[100px] py-2 rounded-xl text-center transition-all cursor-pointer ${
                  simulatorPage === step.id
                    ? "bg-white text-slate-800 shadow-xs border border-gray-100 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* PUBLIC WEB PORTAL PREVIEW */}
          <div className="bg-[#fcfcfc] rounded-[32px] border border-gray-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col justify-start w-full mx-auto">
            {/* Live Header */}
            <div className="bg-slate-900 px-4 py-3 text-white text-[10px] font-bold flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-300 font-mono text-[9px] sm:text-[10px] truncate">
                  {activePreviewPage?.canonical_url || `https://webinar.amwaycrm.my/${selectedWebinar.slug}/${activePreviewPage?.slug || simulatorPage}`}
                </span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-[8px] tracking-widest uppercase border border-emerald-500/30">
                Preview
              </span>
            </div>

            {/* Public Pages Viewport */}
            <div className="flex-1 flex flex-col justify-start overflow-y-auto pb-12">
              {simulatorPage === "signup" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10">
                    {/* Left Column: Value Proposition */}
                    <div className="lg:col-span-7 space-y-6 flex flex-col justify-center">
                      <div className="space-y-4">
                        <span className="inline-block text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-100/80 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-widest">
                          {signupPageDraft?.audience_segment || "Live Free Masterclass"}
                        </span>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                          {signupPageDraft?.headline || signupHeadline}
                        </h2>
                        <p className="text-sm sm:text-lg text-slate-500 max-w-xl leading-relaxed">
                          {signupPageDraft?.subheadline || signupSubheadline}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-1 transition-all hover:shadow-md">
                          <div className="flex items-center space-x-2 text-slate-800 font-bold mb-1">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">Schedule</span>
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{editDate}</span>
                          <span className="text-xs text-slate-500">{editTime} (KL Time)</span>
                        </div>
                        
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-1 transition-all hover:shadow-md">
                           <div className="flex items-center space-x-2 text-slate-800 font-bold mb-1">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">Hosted By</span>
                          </div>
                          <span className="text-xs text-slate-600 font-bold">{settings.name}</span>
                          <span className="text-[10px] text-slate-400">Independent Amway Partner</span>
                        </div>
                      </div>

                      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-sm mb-3">What you will learn:</h3>
                        <p className="text-sm text-slate-600 leading-relaxed italic">"{signupPageDraft?.body_content || signupBody}"</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                          {(signupPageDraft?.trust_points || "").split("\n").filter(Boolean).slice(0, 4).map(point => (
                            <div key={point} className="flex items-center space-x-2 text-[11px] text-slate-600">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Registration Form */}
                    <div className="lg:col-span-5 flex flex-col justify-center">
                      <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-6">{signupPageDraft?.cta_text || "Reserve Your Seat"}</h3>
                        
                        <form onSubmit={handleSimulatorRegister} className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Your Name *</label>
                            <input
                              id="sim-reg-name"
                              type="text"
                              required
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              placeholder="Mohd Fauzi"
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">WhatsApp Number *</label>
                              <input
                                id="sim-reg-phone"
                                type="text"
                                required
                                value={regPhone}
                                onChange={(e) => setRegPhone(e.target.value)}
                                placeholder="6011..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Primary Interest</label>
                              <select
                                id="sim-reg-interest"
                                value={regInterest}
                                onChange={(e) => setRegInterest(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none"
                              >
                                {Object.values(InterestType).map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Email Optional</label>
                              <input
                                id="sim-reg-email"
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                placeholder="name@email.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Lead Source</label>
                              <select
                                id="sim-reg-source"
                                value={regSource}
                                onChange={(e) => setRegSource(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                              >
                                <option value="TikTok Web Funnel">TikTok Web Funnel</option>
                                <option value="Instagram Bio">Instagram Bio</option>
                                <option value="Facebook Post">Facebook Post</option>
                                <option value="WhatsApp Invitation">WhatsApp Invitation</option>
                                <option value="QR Code">QR Code</option>
                                <option value="Referral">Referral</option>
                              </select>
                            </div>
                          </div>

                          <label className="flex items-start space-x-3 cursor-pointer pt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                            <input
                              id="sim-reg-consent"
                              type="checkbox"
                              required
                              checked={regConsent}
                              onChange={(e) => setRegConsent(e.target.checked)}
                              className="mt-1 accent-blue-600 w-4 h-4 rounded shrink-0 cursor-pointer"
                            />
                            <span className="text-[11px] text-slate-500 leading-relaxed">
                              I consent to receive manual follow-up reminders and educational information about wellness, beauty, home-care, or a transparent Amway business conversation via WhatsApp.
                            </span>
                          </label>

                          <button
                            id="sim-reg-submit"
                            type="submit"
                            className="w-full py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:bg-slate-800 active:scale-95 transition-all mt-4"
                            style={{ backgroundColor: signupPageDraft?.brand_accent_color || undefined }}
                          >
                            {signupPageDraft?.cta_text || "Reserve My Seat Now (Free)"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <section className="mx-4 lg:mx-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 space-y-3">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Who This Is For</span>
                      <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                        {activeFunnelTrack === "business" ? "Simple enough for a new ABO to follow." : "Clear enough for a product-curious customer to decide."}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {activeFunnelTrack === "business"
                          ? "This session is built for people who want a realistic introduction before any sponsor conversation."
                          : "This session is built for people who want education before asking for a personal recommendation."}
                      </p>
                    </div>
                    {[
                      activeFunnelTrack === "business"
                        ? { title: "New Business Explorers", body: "Understand the Amway model, retail customer building, and daily actions without hype." }
                        : { title: "Wellness Learners", body: "Understand product categories, lifestyle routines, and responsible next steps." },
                      activeFunnelTrack === "business"
                        ? { title: "Warm Referrals", body: "See what the opportunity is, what it is not, and how follow-up works." }
                        : { title: "Beauty or Home-Care Shoppers", body: "Compare routines and use cases without pressure or exaggerated claims." }
                    ].map(item => (
                      <div key={item.title} className="p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-2">{item.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.body}</p>
                      </div>
                    ))}
                  </section>

                  <section className="mx-4 lg:mx-10 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                      <div className="lg:col-span-5 p-8 bg-slate-900 text-white flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">Session Flow</span>
                        <h3 className="text-2xl font-extrabold leading-tight">
                          A short, practical agenda that keeps the next step obvious.
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed mt-3">
                          The goal is not to overload people. It is to educate, answer the key objections, and invite one clear follow-up action.
                        </p>
                      </div>
                      <div className="lg:col-span-7 p-6 space-y-3">
                        {[
                          activeFunnelTrack === "business"
                            ? { step: "01", title: "What Amway Is", body: "Clear explanation of products, retail customers, ABO role, and the sponsor relationship." }
                            : { step: "01", title: "What The Products Are For", body: "Clear overview of product categories and daily routine use cases." },
                          activeFunnelTrack === "business"
                            ? { step: "02", title: "Daily Starting Routine", body: "Simple invite, follow-up, customer education, and compliance habits." }
                            : { step: "02", title: "How To Choose A Routine", body: "Needs-based education without medical claims, cure language, or guaranteed results." },
                          activeFunnelTrack === "business"
                            ? { step: "03", title: "Disclosure Before Decision", body: "No income guarantees, no shortcuts, and no pressure to join." }
                            : { step: "03", title: "Recommendation Next Step", body: "Optional WhatsApp follow-up for questions or product recommendation." }
                        ].map(item => (
                          <div key={item.step} className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                              {item.step}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">{item.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="mx-4 lg:mx-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { icon: ShieldCheck, title: "Compliance First", body: activeFunnelTrack === "business" ? "No guaranteed income, easy-money promises, or pressure tactics." : "No disease, treatment, cure, or guaranteed-result claims." },
                      { icon: PhoneCall, title: "WhatsApp Follow-Up", body: "Follow-up is manual, respectful, and based on the consent captured in the form." },
                      { icon: FileText, title: "Clear Next Step", body: activeFunnelTrack === "business" ? "Move interested guests into a sponsor conversation." : "Move interested guests into a product recommendation chat." }
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                          <Icon className="w-5 h-5 text-blue-700 mb-3" />
                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-2">{item.body}</p>
                        </div>
                      );
                    })}
                  </section>

                  {/* Conditional Instructor Section */}
                  {enabledSections.instructorBio && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white p-8 md:p-10 rounded-[32px] border border-slate-100 shadow-sm mx-4 lg:mx-10 flex flex-col md:flex-row items-center gap-8"
                    >
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center shrink-0 border-4 border-white shadow-lg rotate-[-2deg]">
                        <User className="w-16 h-16 text-slate-400" />
                      </div>
                      <div className="space-y-4 text-center md:text-left">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Meet Your Instructor</span>
                        <h3 className="text-2xl font-extrabold text-slate-900">{settings.name}</h3>
                        <p className="text-slate-600 leading-relaxed">
                          {activeFunnelTrack === "business"
                            ? "As an Independent Amway Partner, I use this session to explain products, follow-up habits, and the business model clearly. The focus is education, transparency, and respectful customer conversations."
                            : "As an Independent Amway Partner, I use this session to explain product education, routine-building, and follow-up clearly. The focus is general education, no medical claims, and respectful customer conversations."}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Conditional Testimonials Section */}
                  {enabledSections.testimonials && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="mx-4 lg:mx-10 space-y-6"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Learner Feedback</h3>
                        <p className="text-sm text-slate-500">Use real testimonials only after obtaining permission.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { name: "Example 1", text: "The session explained the product-sharing model in a clear and respectful way." },
                          { name: "Example 2", text: "I appreciated the focus on realistic effort, product education, and follow-up habits." },
                          { name: "Example 3", text: "The disclosure section helped me understand what the opportunity is and is not." }
                        ].map((t, i) => (
                          <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex text-yellow-400 space-x-1">
                              {[...Array(5)].map((_, j) => <span key={j}>★</span>)}
                            </div>
                            <p className="text-sm text-slate-700 italic">"{t.text}"</p>
                            <p className="text-xs font-bold text-slate-900">— {t.name}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Conditional FAQ Section */}
                  {enabledSections.faq && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-slate-900 text-white rounded-[32px] p-8 md:p-12 mx-4 lg:mx-10 space-y-8 shadow-xl"
                    >
                      <div className="text-center space-y-2">
                        <h3 className="text-xl sm:text-3xl font-extrabold">Frequently Asked Questions</h3>
                        <p className="text-slate-400 text-sm">Everything you need to know before joining.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {[
                          { q: "Is this really 100% free?", a: "Yes, this masterclass is fully complimentary. Our goal is to provide value upfront." },
                          { q: "Will there be a recording?", a: "Yes, you will receive a replay link via WhatsApp if you cannot make it live." },
                          { q: "Do I need any prior experience?", a: "Not at all. The content is designed for beginners and experienced individuals alike." },
                          activeFunnelTrack === "business"
                            ? { q: "Is this a get-rich-quick scheme?", a: "Absolutely not. We emphasize realistic effort, retail customer building, and compliance guidelines." }
                            : { q: "Is this medical advice?", a: "No. This is general product education only. For health concerns, speak to a qualified healthcare professional." }
                        ].map((faq, i) => (
                          <div key={i} className="space-y-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                            <h4 className="font-bold text-sm text-white">{faq.q}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Conditional Bonus Offer Section */}
                  {enabledSections.bonusOffer && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-[32px] p-8 md:p-12 mx-4 lg:mx-10 space-y-6 shadow-xl text-center flex flex-col items-center relative overflow-hidden"
                    >
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
                      <span className="relative z-10 inline-block bg-white text-blue-800 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest shadow-sm">
                        Fast Action Bonus
                      </span>
                      <h3 className="relative z-10 text-2xl sm:text-3xl font-extrabold max-w-lg">
                        Get the optional "Simple Follow-Up Checklist" PDF when you attend live.
                      </h3>
                      <p className="relative z-10 text-sm text-emerald-50 max-w-md">
                        This guide helps you track consent, reminders, and next steps after the session.
                      </p>
                    </motion.div>
                  )}

                </motion.div>
              )}

              {simulatorPage === "thankyou" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-3xl mx-auto w-full space-y-6 text-center py-10 p-4"
                >
                  <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-emerald-400 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg transform rotate-3">
                    <UserCheck className="w-8 h-8 -rotate-3" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Your Seat is Reserved!</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                      {thankYouPageDraft?.body_content || "We have compiled your workbook instructions and sent them via WhatsApp. Keep an eye on your phone!"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <div className="p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm text-left flex flex-col justify-center space-y-2 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-2 text-slate-800 font-bold">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Masterclass Schedule</span>
                      </div>
                      <p className="text-slate-900 font-bold">{selectedWebinar.title}</p>
                      <p className="text-slate-500 font-mono text-xs">{selectedWebinar.date} at {selectedWebinar.time}</p>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <a
                          id="sim-add-google-calendar"
                          href={buildGoogleCalendarUrl()}
                          target="_blank"
                          className="px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-[10px] font-bold text-center hover:bg-blue-100 transition-colors"
                        >
                          Google Calendar
                        </a>
                        <a
                          id="sim-download-ics-calendar"
                          href={buildIcsDataUrl()}
                          download={`${selectedWebinar.slug || "webinar"}.ics`}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold text-center hover:bg-slate-100 transition-colors"
                        >
                          Apple / Outlook
                        </a>
                      </div>
                    </div>

                    <div className="p-5 bg-blue-50/50 rounded-[24px] border border-blue-100 text-left flex flex-col justify-center space-y-2 hover:bg-blue-50/80 transition-colors">
                      <div className="flex items-center space-x-2 text-blue-900 font-bold uppercase text-xs tracking-wider">
                         <ShieldCheck className="w-4 h-4 text-blue-600" />
                         <span>Quick Survey</span>
                      </div>
                      <p className="text-blue-800 text-sm font-medium leading-relaxed">What is your primary goal: building customer retail base or side-income hours?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 max-w-xl mx-auto">
                    <a
                      id="sim-thank-you-wa"
                      href={`https://wa.me/${settings.whatsapp_phone}?text=Hi%20${settings.name},%20I%20registered%20for%20your%20webinar!`}
                      target="_blank"
                      className="w-full py-4 bg-emerald-500 text-white font-bold text-sm rounded-[20px] shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:bg-emerald-600 transition-all flex items-center justify-center space-x-2"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Join WhatsApp Group</span>
                    </a>
                    <button
                      id="sim-to-replay"
                      onClick={() => setSimulatorPage("replay")}
                      className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-[20px] hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                      Go to Replay Demo
                    </button>
                  </div>
                </motion.div>
              )}

              {simulatorPage === "replay" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-5xl mx-auto w-full p-4 lg:p-8 space-y-6"
                >
                  <div className="space-y-2 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
                    <div>
                      <span className="inline-block text-[10px] bg-blue-100/80 text-blue-700 font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 border border-blue-200">
                        Masterclass Playback
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                        {selectedWebinar.title}
                      </h2>
                    </div>
                    <button
                      id="sim-to-disclosure"
                      onClick={() => setSimulatorPage("signup-opp")}
                      className="mt-4 md:mt-0 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 flex items-center space-x-2 shadow-lg transition-all"
                    >
                      <span>Apply For Partnership</span>
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Simulated Video Frame Bento */}
                    <div className="lg:col-span-8 w-full aspect-video bg-slate-900 rounded-[32px] border border-slate-200 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] transform group-hover:scale-110 group-hover:bg-blue-600 transition-all cursor-pointer border border-white/40">
                          <Video className="w-6 h-6 ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-6 z-20 flex items-center space-x-3">
                         <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs border border-slate-600">
                           {settings.name[0]}
                         </div>
                         <div className="text-left">
                           <p className="text-white font-bold text-sm">{settings.name}</p>
                           <p className="text-slate-300 text-[10px]">Independent Amway Partner</p>
                         </div>
                      </div>
                      <span className="text-[10px] text-slate-300 font-mono absolute bottom-6 right-6 z-20 bg-black/60 py-1 px-3 rounded-full backdrop-blur-sm">
                        Duration: 45 min
                      </span>
                    </div>

                    <div className="lg:col-span-4 flex flex-col space-y-4">
                      <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex-1 shadow-sm flex flex-col justify-center">
                        <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center space-x-2">
                           <PenTool className="w-4 h-4 text-blue-600" />
                           <span>Topic Summary</span>
                        </h3>
                        <p className="text-slate-600 italic text-sm leading-relaxed">"{replayPageDraft?.body_content || selectedWebinar.topic}"</p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-emerald-50 rounded-[24px] border border-blue-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-sm mb-2">Next Steps</h3>
                        <p className="text-slate-600 text-xs leading-relaxed mb-4">Ready to start your journey? Review our transparency guidelines and apply to partner with us.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {simulatorPage === "signup-opp" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-4xl mx-auto w-full space-y-6 py-8 px-4"
                >
                  <div className="text-center space-y-2 mb-8">
                    <span className="inline-block text-[10px] bg-blue-100/80 text-blue-700 font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-blue-200">
                      Transparency Portal
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                      {disclosurePageDraft?.headline || oppHeadline}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Compliance Transparency Box */}
                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[24px] space-y-3 text-slate-700 leading-relaxed shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center space-x-2 text-blue-900 font-bold text-[11px] uppercase tracking-wider mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                           <ShieldCheck className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>Sponsorship Rules & Standards</span>
                      </div>
                      <p className="italic text-sm text-slate-600">"{disclosurePageDraft?.body_content || oppBody}"</p>
                    </div>

                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-[24px] text-rose-900 space-y-3 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center space-x-2 font-bold text-[11px] uppercase tracking-wider mb-4">
                        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                           <AlertTriangle className="w-4 h-4 text-rose-600" />
                        </div>
                        <span>Important Disclaimer</span>
                      </div>
                      <p className="font-bold text-sm">No Income Guarantees / Medical Claims</p>
                      <p className="text-sm leading-relaxed opacity-90">{disclosurePageDraft?.footer_disclaimer || "There are no easy-money shortcuts or guaranteed revenue targets. Your efforts must adhere to Amway Malaysia Code of Conduct."}</p>
                    </div>
                  </div>

                  {/* Opportunity CTA links */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                    <a
                      id="sim-opp-wa-btn"
                      href={`https://wa.me/${settings.whatsapp_phone}?text=I%20have%20read%20the%20disclosure%20and%20want%20to%20apply%20as%20an%20ABO`}
                      target="_blank"
                      className="flex-1 w-full py-4 bg-slate-900 text-white font-bold text-sm rounded-[20px] hover:bg-slate-800 shadow-lg flex items-center justify-center space-x-2 transition-all"
                    >
                      <PhoneCall className="w-4 h-4 text-blue-400" />
                      <span>Start Sponsor Conversation</span>
                    </a>
                    <a
                      id="sim-opp-amway-link"
                      href="https://www.amway.my/register-abo"
                      target="_blank"
                      className="flex-1 w-full py-4 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-[20px] hover:bg-slate-50 flex items-center justify-center space-x-2 transition-all"
                    >
                      <span>Official Amway Portal</span>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Simulated Frame Footer */}
            <div className="bg-slate-900 px-6 py-4 text-slate-400 text-[10px] flex items-center justify-between border-t border-slate-800">
               <span>Generated for client lead funnel tracking</span>
               <span className="flex items-center space-x-1">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 <span>Preview mode</span>
               </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
