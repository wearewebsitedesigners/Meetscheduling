import React, { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  BookOpen,
  Briefcase,
  Brush,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Eye,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Instagram,
  LayoutGrid,
  Layers3,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Newspaper,
  Package,
  Plus,
  Redo2,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Type,
  Undo2,
  Video,
  X,
} from "lucide-react";
import { apiFetch, copyToClipboard, getStoredUser, setStoredUser } from "../shared.jsx";

const STORAGE_KEY = "meetscheduling_custom_builder_v2";
const MAX_HISTORY_ENTRIES = 40;

const themes = [
  {
    id: "luxe-hair",
    name: "Luxe Extensions",
    brand: "LUXEE",
    accent: "#f59ab2",
    heroTitle: "PRETTY EXTENSIONS PRETTY YOU",
    heroSubtitle: "Luxury beauty storefront with clean promo banners and bold product merchandising.",
    buttonLabel: "SHOP THE COLLECTION",
    pageBg: "#f7f3f5",
  },
  {
    id: "coach-booking",
    name: "Consulting Funnel",
    brand: "Elevate",
    accent: "#6ea8ff",
    heroTitle: "Turn visitors into booked strategy calls",
    heroSubtitle: "A landing page and scheduler blended into one premium conversion flow.",
    buttonLabel: "BOOK NOW",
    pageBg: "#f5f7fb",
  },
  {
    id: "saas-demo",
    name: "SaaS Demo",
    brand: "Flowbase",
    accent: "#8b7cff",
    heroTitle: "See the platform in action",
    heroSubtitle: "Demo-focused page with proof, features, and embedded booking blocks.",
    buttonLabel: "SCHEDULE DEMO",
    pageBg: "#f5f6fb",
  },
];

const sectionLibrary = [
  { id: "header", name: "Header", kind: "header", category: "Sections" },
  { id: "hero", name: "Slideshow", kind: "hero", category: "Sections" },
  { id: "reviews", name: "Auto Sliding Reviews", kind: "reviews", category: "Sections" },
  { id: "richtext", name: "Rich Text", kind: "richtext", category: "Sections" },
  { id: "banner", name: "Image Banner", kind: "banner", category: "Sections" },
  { id: "booking", name: "Booking Block", kind: "booking", category: "Sections" },
  { id: "faq", name: "FAQ", kind: "faq", category: "Sections" },
  { id: "newsletter", name: "Newsletter", kind: "newsletter", category: "Sections" },
  { id: "footer", name: "Footer", kind: "footer", category: "Sections" },
  { id: "featuredblog", name: "Featured Blog", kind: "featuredblog", category: "Sections" },
  { id: "customliquid", name: "Custom Liquid", kind: "customliquid", category: "Sections" },
  { id: "page", name: "Page", kind: "page", category: "Sections" },
  { id: "announcement", name: "Announcement Bar", kind: "announcement", category: "Sections" },
  { id: "beforeafter", name: "Before/After Image Slider", kind: "beforeafter", category: "Sections" },
  { id: "brandslider", name: "Brand Slider", kind: "brandslider", category: "Sections" },
  { id: "marquee", name: "Marquee", kind: "marquee", category: "Sections" },
  { id: "product", name: "Product Block", kind: "product", category: "Sections" },
  { id: "spotlight", name: "Slidable Spotlight", kind: "spotlight", category: "Sections" },
  { id: "video", name: "Video", kind: "video", category: "Sections" },
  { id: "googlemap", name: "Google Map", kind: "googlemap", category: "Sections" },
  { id: "instagram", name: "Instagram", kind: "instagram", category: "Sections" },
  { id: "custompress", name: "Custom Press Banner", kind: "custompress", category: "Sections" },
  { id: "apps", name: "Apps", kind: "apps", category: "Apps" },
];

const sectionNameMap = {
  announcement: "Announcement Bar",
  header: "Header Nav - Plain",
  hero: "Slideshow",
  marquee: "Marquee",
  spotlight: "Custom Block: Spotlight",
  reviews: "Customer Review",
  product: "Product Block",
  banner: "Image Banner",
  richtext: "Rich Text",
  booking: "Booking Block",
  faq: "FAQ",
  newsletter: "Newsletter",
  footer: "Footer",
  apps: "Apps",
  video: "Video",
  instagram: "Instagram",
  custompress: "Custom Press Banner",
  brandslider: "Brands Slider",
  beforeafter: "Before/After Image Slider",
  customliquid: "Custom Liquid",
  featuredblog: "Featured Blog",
  page: "Page",
  googlemap: "Google Map",
};

const defaultSections = {
  home: [
    { id: "announcement", name: "Announcement Bar", kind: "announcement", visible: true },
    { id: "header", name: "Header Nav - Plain", kind: "header", visible: true },
    {
      id: "hero",
      name: "Slideshow",
      kind: "hero",
      visible: true,
      hasBlocks: true,
      children: [{ id: "image-slideshow", name: "Image SlideShow" }],
    },
    { id: "marquee", name: "Marquee", kind: "marquee", visible: true },
    { id: "spotlight", name: "Custom Block: Spotlight", kind: "spotlight", visible: true },
    { id: "reviews", name: "Customer Review", kind: "reviews", visible: true },
    { id: "apps-1", name: "Apps", kind: "apps", visible: true },
    { id: "product-1", name: "Product Block", kind: "product", visible: true },
    { id: "banner-1", name: "Image Banner", kind: "banner", visible: true },
    { id: "banner-2", name: "Image Banner", kind: "banner", visible: true },
    { id: "product-2", name: "Product Block", kind: "product", visible: true },
    { id: "video", name: "Video", kind: "video", visible: true },
    { id: "spotlight-2", name: "Custom Block: Spotlight", kind: "spotlight", visible: true },
    { id: "brandslider", name: "Brands Slider", kind: "brandslider", visible: true },
    { id: "hero-2", name: "Slideshow", kind: "hero", visible: true },
    { id: "product-3", name: "Product Block", kind: "product", visible: true },
    { id: "richtext", name: "Rich Text", kind: "richtext", visible: true },
    { id: "apps-2", name: "Apps", kind: "apps", visible: true },
    { id: "instagram", name: "Instagram", kind: "instagram", visible: true },
    { id: "custompress", name: "Custom Press Banner", kind: "custompress", visible: true },
    { id: "newsletter", name: "Newsletter", kind: "newsletter", visible: true },
    { id: "banner-3", name: "Image Banner", kind: "banner", visible: true },
    { id: "marquee-2", name: "Marquee", kind: "marquee", visible: true },
    { id: "footer", name: "Footer 01", kind: "footer", visible: true },
  ],
  booking: [
    { id: "announcement", name: "Announcement Bar", kind: "announcement", visible: true },
    { id: "header", name: "Header", kind: "header", visible: true },
    { id: "hero", name: "Booking Hero", kind: "hero", visible: true },
    { id: "booking", name: "Booking Block", kind: "booking", visible: true },
    { id: "reviews", name: "Testimonials", kind: "reviews", visible: true },
    { id: "faq", name: "FAQ", kind: "faq", visible: true },
    { id: "footer", name: "Footer", kind: "footer", visible: true },
  ],
  about: [
    { id: "header", name: "Header", kind: "header", visible: true },
    { id: "hero", name: "Hero", kind: "hero", visible: true },
    { id: "richtext", name: "Rich Text", kind: "richtext", visible: true },
    { id: "featuredblog", name: "Featured Blog", kind: "featuredblog", visible: true },
    { id: "googlemap", name: "Google Map", kind: "googlemap", visible: true },
    { id: "footer", name: "Footer", kind: "footer", visible: true },
  ],
};

const leftMenu = [
  { id: "theme", icon: Brush, label: "Theme" },
  { id: "blocks", icon: Blocks, label: "Blocks" },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultChildren(kind) {
  const labels = {
    hero: ["Image SlideShow", "Offer Badge", "Secondary Slide"],
    reviews: ["Review Card 1", "Review Card 2", "Review Card 3", "Review Card 4"],
    brandslider: ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"],
    product: ["Product 1", "Product 2", "Product 3", "Product 4"],
    instagram: ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5", "Post 6"],
    spotlight: ["Spotlight 1", "Spotlight 2", "Spotlight 3"],
    faq: ["Question 1", "Question 2", "Question 3"],
    featuredblog: ["Article 1", "Article 2", "Article 3"],
    apps: ["App Embed 1", "App Embed 2"],
  };
  const nextLabels = labels[kind];
  if (!nextLabels) return undefined;
  return nextLabels.map((name) => ({ id: makeId("block"), name }));
}

function createSectionFromLibraryItem(item) {
  const children = getDefaultChildren(item.kind);
  return {
    id: makeId(item.kind),
    name: item.name,
    kind: item.kind,
    visible: true,
    hasBlocks: Boolean(children?.length),
    children,
  };
}

function getNextBlockName(section) {
  const currentCount = section.children?.length || 0;
  const labels = {
    hero: "Slide",
    reviews: "Review Card",
    brandslider: "Brand",
    product: "Product",
    instagram: "Post",
    spotlight: "Spotlight",
    faq: "Question",
    featuredblog: "Article",
    apps: "App Embed",
  };
  const baseLabel = labels[section.kind] || "Block";
  return `${baseLabel} ${currentCount + 1}`;
}

function createBuilderSnapshot(sectionsByPage, themeByPage, selectedSectionByPage) {
  return deepClone({
    sectionsByPage,
    themeByPage,
    selectedSectionByPage,
  });
}

function getSectionIcon(kind) {
  switch (kind) {
    case "announcement":
      return <MessageSquare className="h-4 w-4" />;
    case "header":
      return <LayoutGrid className="h-4 w-4" />;
    case "hero":
      return <ImageIcon className="h-4 w-4" />;
    case "marquee":
      return <Type className="h-4 w-4" />;
    case "spotlight":
      return <Sparkles className="h-4 w-4" />;
    case "reviews":
      return <Star className="h-4 w-4" />;
    case "product":
      return <ShoppingBag className="h-4 w-4" />;
    case "banner":
      return <ImageIcon className="h-4 w-4" />;
    case "booking":
      return <CalendarDays className="h-4 w-4" />;
    case "faq":
      return <MessageSquare className="h-4 w-4" />;
    case "newsletter":
      return <Mail className="h-4 w-4" />;
    case "footer":
      return <Layers3 className="h-4 w-4" />;
    case "richtext":
      return <Type className="h-4 w-4" />;
    case "apps":
      return <Package className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "instagram":
      return <Instagram className="h-4 w-4" />;
    case "custompress":
      return <Newspaper className="h-4 w-4" />;
    case "brandslider":
      return <Briefcase className="h-4 w-4" />;
    case "beforeafter":
      return <ImageIcon className="h-4 w-4" />;
    case "customliquid":
      return <Code2 className="h-4 w-4" />;
    case "featuredblog":
      return <BookOpen className="h-4 w-4" />;
    case "page":
      return <BookOpen className="h-4 w-4" />;
    case "googlemap":
      return <MapPin className="h-4 w-4" />;
    default:
      return <Layers3 className="h-4 w-4" />;
  }
}

function readStoredBuilder() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredBuilder(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore local storage failures in preview
  }
}

function normalizeUsernameInput(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function getPublicLabel(username) {
  const cleanUsername = normalizeUsernameInput(username) || "your-name";
  return `meetscheduling.com/${cleanUsername}`;
}

function getPublicShareUrl(username) {
  const cleanUsername = normalizeUsernameInput(username) || "your-name";
  return `https://www.meetscheduling.com/${cleanUsername}`;
}

function getPublicPreviewUrl(username) {
  const cleanUsername = normalizeUsernameInput(username) || "your-name";
  if (typeof window === "undefined") {
    return getPublicShareUrl(cleanUsername);
  }
  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalHost) {
    return `${window.location.origin}/${cleanUsername}`;
  }
  return getPublicShareUrl(cleanUsername);
}

function getPageLabel(page) {
  if (page === "booking") return "Booking page";
  if (page === "about") return "About page";
  return "Home page";
}

function Toolbar({
  page,
  setPage,
  viewMode,
  setViewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveState,
  publishState,
  onSave,
  onPublish,
  onPreview,
  publicUsername,
  usernameDraft,
  onUsernameDraftChange,
  onSaveUsername,
  onCopyPublicUrl,
  onOpenPublicUrl,
  usernameSaving,
  usernameMessage,
  usernameError,
}) {
  const usernameDirty = normalizeUsernameInput(usernameDraft) !== normalizeUsernameInput(publicUsername);
  const saveButtonSaved = saveState === "Saved" || saveState === "Loaded";
  const saveButtonBusy = saveState === "Saving...";
  const publishButtonPublished = publishState === "Published";
  const publishButtonBusy = publishState === "Publishing...";
  const publishButtonLabel =
    publishState === "Unpublished changes"
      ? "Publish updates"
      : publishState === "Published"
        ? "Published live"
        : publishState === "Publishing..."
          ? "Publishing..."
          : "Publish live";

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="flex min-h-14 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-lg p-2 hover:bg-zinc-100">
            <ChevronLeft className="h-4 w-4 text-zinc-700" />
          </button>
          <div className="flex items-center gap-3">
            <p className="text-base font-medium text-zinc-800">{publicUsername || "username"}</p>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Live</span>
            <button type="button" className="rounded-lg p-2 hover:bg-zinc-100">
              <MoreHorizontal className="h-4 w-4 text-zinc-700" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onPreview} className="rounded-lg p-2 hover:bg-zinc-100">
            <Eye className="h-4 w-4 text-zinc-700" />
          </button>
          <button type="button" className={cn("rounded-lg p-2", viewMode === "desktop" ? "bg-blue-50 text-blue-600" : "text-zinc-700 hover:bg-zinc-100")} onClick={() => setViewMode("desktop")}>
            <Monitor className="h-4 w-4" />
          </button>
          <button type="button" className={cn("rounded-lg p-2", viewMode === "tablet" ? "bg-blue-50 text-blue-600" : "text-zinc-700 hover:bg-zinc-100")} onClick={() => setViewMode("tablet")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" className={cn("rounded-lg p-2", viewMode === "mobile" ? "bg-blue-50 text-blue-600" : "text-zinc-700 hover:bg-zinc-100")} onClick={() => setViewMode("mobile")}>
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-lg p-2 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className={cn("h-4 w-4", canUndo ? "text-zinc-700" : "text-zinc-400")} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-lg p-2 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Redo2 className={cn("h-4 w-4", canRedo ? "text-zinc-700" : "text-zinc-400")} />
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishButtonBusy || publishButtonPublished}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              publishButtonPublished
                ? "cursor-default border border-zinc-200 bg-zinc-100 text-zinc-500"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75"
            )}
          >
            <Globe className="h-4 w-4" />
            {publishButtonLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveButtonBusy || saveButtonSaved}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              saveButtonSaved
                ? "cursor-default border border-zinc-200 bg-zinc-100 text-zinc-500"
                : "bg-zinc-900 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-75"
            )}
          >
            <Save className="h-4 w-4" />
            {saveButtonBusy ? "Saving..." : saveButtonSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-1.5 xl:max-w-[720px]">
          <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-zinc-200 bg-zinc-50 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
              <Globe className="h-3 w-3" />
              Public URL
            </div>
            <span className="hidden text-[13px] font-medium text-zinc-500 sm:block">meetscheduling.com/</span>
            <input
              value={usernameDraft}
              onChange={(event) => onUsernameDraftChange(event.target.value)}
              placeholder="your-name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-[150px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-900 outline-none transition focus:border-blue-500"
            />
            <button
              type="button"
              onClick={onCopyPublicUrl}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={onOpenPublicUrl}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              View
            </button>
            <button
              type="button"
              onClick={onSaveUsername}
              disabled={usernameSaving || !usernameDirty || !normalizeUsernameInput(usernameDraft)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {usernameSaving ? "Saving..." : "Update URL"}
            </button>
          </div>
          <div className={cn("text-[11px] font-medium", usernameError ? "text-rose-600" : "text-zinc-500")}>
            {usernameError || usernameMessage || `Live at ${getPublicLabel(publicUsername)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLibraryModal({ open, onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Sections");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTab("Sections");
    }
  }, [open]);

  const items = useMemo(() => {
    return sectionLibrary.filter((item) => {
      const matchTab = item.category === tab;
      const matchQuery = item.name.toLowerCase().includes(query.toLowerCase());
      return matchTab && matchQuery;
    });
  }, [query, tab]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/15">
      <div className="flex h-[680px] w-[1120px] overflow-hidden rounded-[26px] border border-zinc-300 bg-[#f5f5f6] shadow-2xl">
        <div className="w-[440px] border-r border-zinc-200 bg-[#f8f8f9] p-4">
          <div className="flex items-center gap-3 rounded-[20px] border-2 border-blue-600 bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sections"
              className="w-full bg-transparent text-[18px] text-zinc-700 outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="mt-4 flex rounded-2xl bg-zinc-200 p-1">
            {["Sections", "Apps"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "flex-1 rounded-xl px-4 py-3 text-[18px] font-medium",
                  tab === item ? "bg-white shadow-sm text-zinc-900" : "text-zinc-700"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-[18px] font-semibold text-violet-600">Generate</div>

          <div className="mt-4 h-[510px] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <button
                key={`${item.name}-${item.category}`}
                type="button"
                onClick={() => onAdd(item)}
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-[17px] text-zinc-800 transition hover:bg-zinc-200"
              >
                <span className="text-zinc-700">{getSectionIcon(item.kind)}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-[#ededee] p-6">
          <div className="mb-4 flex items-center justify-end">
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-white/70">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-[560px] rounded-[26px] bg-[#efefef] p-10 text-center shadow-sm">
              <h3 className="text-[34px] font-semibold text-zinc-800">Have an idea?</h3>
              <p className="mt-1 text-[28px] font-semibold text-violet-600">Let&apos;s bring it to life</p>
              <div className="mx-auto mt-10 w-full max-w-[420px] overflow-hidden rounded-[22px] bg-white shadow-sm">
                <div className="relative aspect-[1.2] bg-[linear-gradient(135deg,#d9d0c8,#b8d5f6)]">
                  <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white" />
                  <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow">
                    <ChevronRight className="h-5 w-5 text-zinc-700" />
                  </div>
                </div>
              </div>
              <p className="mt-8 text-[18px] text-zinc-500">A before/after image slider</p>
              <div className="mt-16 flex items-center justify-center gap-3">
                <span className="h-3 w-3 rounded-full bg-zinc-300" />
                <span className="h-3 w-3 rounded-full bg-zinc-500" />
                <span className="h-3 w-3 rounded-full bg-zinc-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftSidebar({
  sections,
  selectedSection,
  setSelectedSection,
  leftRailTab,
  setLeftRailTab,
  page,
  setPage,
  onOpenLibrary,
  onAddSection,
  onAddBlock,
  theme,
  setTheme,
}) {
  const themeSearch = "";
  const activeTheme = themes.find((item) => item.id === theme.id) || themes[0];

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[52px_290px] border-r border-zinc-200 bg-[#f7f7f8]">
      <div className="flex flex-col items-center gap-3 border-r border-zinc-200 bg-[#f8f8f9] py-4">
        {leftMenu.map((item) => {
          const Icon = item.icon;
          const active = leftRailTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLeftRailTab(item.id)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition",
                active ? "bg-blue-50 text-blue-600" : "text-zinc-500 hover:bg-zinc-100"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div className="overflow-y-auto p-4">
        {leftRailTab === "sections" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-800">{getPageLabel(page)}</h2>
            </div>

            <div className="mb-4 flex gap-2">
              {["home", "booking", "about"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium capitalize",
                    page === item ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Template</p>
              {sections.map((section) => {
                const active = selectedSection === section.id;
                const canAddBlocks = Boolean(section.children?.length || getDefaultChildren(section.kind)?.length);
                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSection(section.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition",
                        active ? "bg-blue-600 text-white" : "text-zinc-700 hover:bg-zinc-100"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <ChevronRight className={cn("h-4 w-4", active ? "text-white/90" : "text-zinc-400")} />
                        {getSectionIcon(section.kind)}
                        {section.name}
                      </span>
                      <span className="flex items-center gap-2">
                        {!section.visible && <Eye className="h-4 w-4 text-zinc-400" />}
                        {section.hasBlocks && <ChevronDown className={cn("h-4 w-4", active ? "text-white/80" : "text-zinc-400")} />}
                      </span>
                    </button>
                    {active && canAddBlocks ? (
                      <div className="ml-10 mt-1 space-y-1 pb-2">
                        <button
                          type="button"
                          onClick={() => onAddBlock(section.id)}
                          className="flex items-center gap-2 text-sm font-medium text-blue-600"
                        >
                          <Plus className="h-4 w-4" /> Add block
                        </button>
                        {(section.children || getDefaultChildren(section.kind) || []).map((child) => (
                          <div key={child.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-700">
                            <GripVertical className="h-4 w-4 text-zinc-400" />
                            <ImageIcon className="h-4 w-4" />
                            {child.name}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={onOpenLibrary} className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
              <Plus className="h-4 w-4" /> Add section
            </button>
          </>
        )}

        {leftRailTab === "theme" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-800">Theme presets</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">{themes.length} presets</span>
                <button
                  type="button"
                  onClick={() => setLeftRailTab("sections")}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Sections
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {themes.map((item) => {
                const active = activeTheme.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      active ? "border-blue-500 bg-blue-50 shadow-sm" : "border-zinc-200 bg-white hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{item.heroSubtitle}</p>
                      </div>
                      <span className="mt-1 h-4 w-4 rounded-full border border-white shadow" style={{ backgroundColor: item.accent }} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
                      <div className="mb-2 h-3 w-20 rounded-full" style={{ backgroundColor: item.accent }} />
                      <div className="h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${item.pageBg}, #ffffff)` }} />
                      <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{item.brand}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Current theme</p>
              <p className="mt-2 text-base font-semibold text-zinc-900">{activeTheme.name}</p>
              <p className="mt-1 text-sm text-zinc-500">Accent: {activeTheme.accent}</p>
            </div>
          </div>
        )}

        {leftRailTab === "blocks" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-zinc-800">Blocks & apps</h2>
              <button
                type="button"
                onClick={() => setLeftRailTab("sections")}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Sections
              </button>
            </div>
            <div className="space-y-2">
              {sectionLibrary.map((item) => (
                <button
                  key={`${item.id}-${item.name}`}
                  type="button"
                  onClick={() => onAddSection(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                >
                  <span className="text-zinc-600">{getSectionIcon(item.kind)}</span>
                  <span className="flex-1">{item.name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{item.category}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onOpenLibrary} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Open library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhonePreview({ theme }) {
  return (
    <div className="mx-auto w-[390px] rounded-[32px] border border-zinc-300 bg-white p-3 shadow-sm">
      <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 bg-[#fbe0e7] px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-zinc-800">
          PINK FRIDAY STARTED! Use code PINK at checkout
        </div>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm font-semibold text-zinc-900">{theme.brand}</span>
          <div className="flex gap-3 text-zinc-600">
            <Search className="h-4 w-4" />
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-8 border-y border-zinc-100 bg-[#f6b7c8] px-4 py-3 text-sm font-semibold text-zinc-900">
          <span>HOME</span>
          <span>CATALOG</span>
          <span>CONTACT</span>
        </div>
        <div className="relative bg-[#fcf7f8] px-4 py-10 text-center">
          <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(180deg, ${theme.accent}10, transparent)` }} />
          <div className="relative">
            <p className="mx-auto max-w-[270px] text-4xl font-light tracking-tight text-[#e4c4cf]">{theme.heroTitle}</p>
            <div className="mx-auto mt-6 h-48 max-w-[280px] rounded-[30px] bg-gradient-to-b from-zinc-200 to-zinc-50" />
            <p className="mt-6 text-2xl font-light tracking-wide" style={{ color: theme.accent }}>{theme.brand}</p>
            <button type="button" className="mt-3 rounded-full px-5 py-2 text-xs font-semibold text-white" style={{ backgroundColor: theme.accent }}>
              {theme.buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuilderMotionStyles() {
  return (
    <style>{`
      @keyframes ms-builder-marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes ms-builder-fade {
        0%, 26% { opacity: 1; }
        33%, 93% { opacity: 0; }
        100% { opacity: 1; }
      }
    `}</style>
  );
}

function HeroSectionPreview({ section, theme }) {
  const slides = section.children?.length ? section.children : [{ id: "fallback-slide", name: "Slide 1" }];
  return (
    <div className="relative px-10 py-10 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-80" />
      <div className="relative">
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {slides.length} live slides
        </div>
        <p className="mx-auto max-w-[920px] text-[84px] font-extralight leading-[0.9] tracking-tight text-[#e2d9dc]">{theme.heroTitle}</p>
        <div className="relative mx-auto mt-4 h-[420px] max-w-[760px] overflow-hidden rounded-[42px] bg-gradient-to-b from-zinc-300 to-zinc-100">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="absolute inset-0 flex items-end justify-between bg-gradient-to-br from-white/10 via-white/0 to-black/10 p-10"
              style={{
                animation: `ms-builder-fade ${slides.length * 4.5}s linear infinite`,
                animationDelay: `${index * 4.5}s`,
              }}
            >
              <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm">
                {slide.name}
              </div>
              <div className="rounded-3xl border border-white/50 bg-white/30 px-5 py-3 text-sm font-medium text-zinc-700 backdrop-blur">
                Premium visual slide
              </div>
            </div>
          ))}
        </div>
        <p className="mt-7 text-6xl font-light tracking-wide" style={{ color: theme.accent }}>{theme.brand}</p>
        <p className="mx-auto mt-3 max-w-3xl text-lg text-zinc-500">{theme.heroSubtitle}</p>
        <button type="button" className="mt-4 rounded-full px-8 py-3 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>
          {theme.buttonLabel}
        </button>
      </div>
    </div>
  );
}

function AutoSlidingReviewsSection({ section, theme }) {
  const items = (section.children?.length ? section.children : getDefaultChildren("reviews")).map((item, index) => ({
    id: item.id,
    quote: [
      "The builder feels fast, polished, and actually useful for launch pages.",
      "We replaced manual mockups with a page flow the whole team can maintain.",
      "Publishing branded booking pages now takes minutes instead of hours.",
      "The section controls are clean enough for non-technical clients to use.",
    ][index % 4],
    name: ["Maya Carter", "Jordan Lee", "Ava Stone", "Noah Brooks"][index % 4],
    role: ["Creative Director", "Growth Consultant", "Studio Owner", "Operations Lead"][index % 4],
  }));
  const trackItems = [...items, ...items];

  return (
    <div className="overflow-hidden bg-white px-10 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">Testimonials</p>
          <h3 className="mt-3 text-4xl font-semibold text-zinc-900">Auto-sliding social proof that keeps the page alive</h3>
        </div>
        <div className="overflow-hidden">
          <div
            className="flex gap-5"
            style={{
              width: `${trackItems.length * 360}px`,
              animation: "ms-builder-marquee 28s linear infinite",
            }}
          >
            {trackItems.map((item, index) => (
              <article key={`${item.id}-${index}`} className="w-[340px] flex-none rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-lg leading-8 text-zinc-700">{item.quote}</p>
                <div className="mt-6 border-t border-zinc-200 pt-4">
                  <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutoSlidingBrandSlider({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("brandslider");
  const trackItems = [...items, ...items];

  return (
    <div className="overflow-hidden bg-white px-10 py-10">
      <div
        className="flex items-center gap-5 text-zinc-400"
        style={{
          width: `${trackItems.length * 220}px`,
          animation: "ms-builder-marquee 24s linear infinite",
        }}
      >
        {trackItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-2xl border border-zinc-200 px-8 py-6 text-lg font-semibold">
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function BeforeAfterSection() {
  const [position, setPosition] = useState(52);

  return (
    <div className="bg-white px-10 py-12">
      <div className="mx-auto max-w-5xl rounded-3xl bg-zinc-100 p-8">
        <div className="mb-6 text-center">
          <h3 className="text-3xl font-semibold text-zinc-900">Interactive before / after comparison</h3>
          <p className="mt-3 text-zinc-500">Drag the slider to compare the transformation visually inside the builder preview.</p>
        </div>
        <div className="relative mx-auto aspect-[1.5] max-w-[860px] overflow-hidden rounded-[28px] bg-[#eee7e1]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#d9d0c8,#b8d5f6)]" />
          <div
            className="absolute inset-y-0 left-0 overflow-hidden bg-[linear-gradient(135deg,#f8d2e0,#f59ab2)]"
            style={{ width: `${position}%` }}
          />
          <div className="absolute inset-y-0 bg-white/80" style={{ left: `${position}%`, width: "2px", transform: "translateX(-1px)" }} />
          <div className="absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg" style={{ left: `calc(${position}% - 24px)` }}>
            <ChevronRight className="h-5 w-5 text-zinc-700" />
          </div>
        </div>
        <input
          type="range"
          min="15"
          max="85"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="mx-auto mt-6 block w-full max-w-[520px]"
        />
      </div>
    </div>
  );
}

function SpotlightSectionPreview({ section, theme }) {
  const items = section.children?.length ? section.children : getDefaultChildren("spotlight") || [];

  return (
    <div className="grid grid-cols-3 gap-3 bg-[#f4f4f6] p-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="relative aspect-[1.1] overflow-hidden rounded-[26px] p-5 text-left text-white shadow-sm"
          style={{ background: `linear-gradient(145deg, ${theme.accent}, #111827)` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <span className="inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              Spotlight
            </span>
            <div>
              <p className="text-lg font-semibold">{item.name}</p>
              <p className="mt-2 text-sm text-white/75">
                Featured panel {index + 1} with editable title, image, and CTA area.
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductGridPreview({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("product") || [];

  return (
    <div className="bg-[#f4f4f6] px-4 pb-10 pt-6">
      <div className="mb-6 flex items-center justify-center gap-10 text-[22px] font-semibold text-zinc-800">
        <div className="h-[2px] w-80 bg-zinc-700" />
        <span>OUR LATEST COLLECTION</span>
        <div className="h-[2px] w-80 bg-zinc-700" />
      </div>
      <div className="grid grid-cols-4 gap-6">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-[24px] bg-white p-3 shadow-sm">
            <div className="aspect-[0.92] rounded-[20px] bg-[#f7dbe4]" />
            <p className="mt-4 text-xs uppercase tracking-wide text-zinc-400">MEETSCHEDULING STORE</p>
            <p className="mt-2 text-lg font-medium text-zinc-900">{item.name}</p>
            <p className="mt-2 text-sm text-zinc-500">
              From <span className="font-semibold text-zinc-900">${110 + index * 15}.00 USD</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQSectionPreview({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("faq") || [];
  const [openId, setOpenId] = useState(items[0]?.id || "");

  return (
    <div className="bg-white px-10 py-10">
      <div className="mx-auto max-w-4xl space-y-3">
        {items.map((item, index) => {
          const open = item.id === openId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(open ? "" : item.id)}
              className="w-full rounded-xl border border-zinc-200 p-5 text-left transition hover:border-zinc-300"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-zinc-900">{item.name}</p>
                <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", open && "rotate-180")} />
              </div>
              {open && (
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  This answer block is editable. Use it for delivery timelines, support policies, booking
                  questions, or product-specific FAQs.
                </p>
              )}
              {!open && index === 0 && <p className="mt-3 text-xs font-medium text-zinc-400">Click to expand</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppsSectionPreview({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("apps") || [];

  return (
    <div className="bg-white px-10 py-12">
      <div className="mx-auto max-w-5xl rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10">
        <div className="mb-6 text-center">
          <Package className="mx-auto h-10 w-10 text-zinc-400" />
          <h3 className="mt-4 text-2xl font-semibold text-zinc-900">Apps block</h3>
          <p className="mt-3 text-zinc-500">Render app embeds, badges, upsells, and reviews inside your landing page builder.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                <Package className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
              <p className="mt-2 text-sm text-zinc-500">Placeholder for embedded app functionality and merchandising widgets.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramPreviewSection({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("instagram") || [];

  return (
    <div className="bg-white px-10 py-12">
      <h3 className="mb-6 text-center text-3xl font-semibold text-zinc-900">Instagram</h3>
      <div className="grid grid-cols-6 gap-3">
        {items.map((item, index) => (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#f7dbe4]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_45%)] transition group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-3 text-xs font-semibold text-white">
              {item.name || `Post ${index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedBlogPreview({ section }) {
  const items = section.children?.length ? section.children : getDefaultChildren("featuredblog") || [];

  return (
    <div className="bg-white px-10 py-12">
      <h3 className="mb-6 text-center text-3xl font-semibold text-zinc-900">Featured blog</h3>
      <div className="grid grid-cols-3 gap-5">
        {items.map((item, index) => (
          <div key={item.id} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-[1.5] bg-zinc-200" />
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Editorial</p>
              <h4 className="mt-3 text-xl font-semibold text-zinc-900">{item.name}</h4>
              <p className="mt-2 text-zinc-500">
                Long-form story block {index + 1} with thumbnail, excerpt, and CTA.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionFrame({ active, label, onAddAfter, onSelect, children }) {
  return (
    <div
      onClick={onSelect}
      className={cn("relative cursor-pointer border-b border-zinc-200", active && "ring-2 ring-inset ring-blue-500")}
    >
      <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
        {label}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddAfter();
        }}
        className="absolute left-1/2 top-0 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm"
      >
        <Plus className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

function renderSectionContent(section, theme) {
  switch (section.kind) {
    case "announcement":
      return (
        <div className="border-b border-zinc-200 bg-[#f7d4dd] px-4 py-3 text-center text-xs font-semibold text-zinc-800">
          PINK FRIDAY STARTED! Use code PINK at checkout
        </div>
      );
    case "header":
      return (
        <>
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3 text-sm text-zinc-700">
              <Globe className="h-4 w-4" />
              <span>EN</span>
              <span>USD</span>
            </div>
            <p className="text-4xl font-light tracking-[0.16em]" style={{ color: theme.accent }}>{theme.brand}</p>
            <div className="flex items-center gap-6 text-zinc-700">
              <span className="text-sm">Search</span>
              <Search className="h-5 w-5" />
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="border-y border-zinc-200 bg-[#f6b7c8] px-6 py-4">
            <div className="flex items-center justify-center gap-16 text-lg font-semibold text-zinc-900">
              <span>HOME</span>
              <span>CATALOG</span>
              <span>CONTACT</span>
            </div>
          </div>
        </>
      );
    case "hero":
      return <HeroSectionPreview section={section} theme={theme} />;
    case "marquee":
      return (
        <div className="overflow-hidden bg-[#f8c4d1] py-3 text-center text-[13px] font-semibold uppercase tracking-wide text-zinc-800">
          READY TO WEAR GLUELESS WIGS • HIGHEST HUMAN HAIR STRANDS • PROFESSIONALLY SHAPED • EXQUISITELY COLORED •
        </div>
      );
    case "spotlight":
      return <SpotlightSectionPreview section={section} theme={theme} />;
    case "reviews":
      return <AutoSlidingReviewsSection section={section} theme={theme} />;
    case "product":
      return <ProductGridPreview section={section} />;
    case "banner":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto flex max-w-5xl items-center gap-10 rounded-3xl bg-zinc-100 p-8">
            <div className="flex-1">
              <p className="text-3xl font-semibold text-zinc-900">Iconic Divine Eyeshadow Palettes</p>
              <p className="mt-3 text-zinc-500">New shades. Improved formula. Full color payoff.</p>
              <button type="button" className="mt-5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Shop now</button>
            </div>
            <div className="aspect-[1.2] w-[420px] rounded-2xl bg-zinc-300" />
          </div>
        </div>
      );
    case "richtext":
      return (
        <div className="bg-white px-10 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">Rich text</p>
            <h3 className="mt-3 text-4xl font-semibold text-zinc-900">Designed for modern storefront storytelling</h3>
            <p className="mt-4 text-lg leading-8 text-zinc-500">Add rich typography, editorial content, and strong product positioning sections exactly where your landing page needs them.</p>
          </div>
        </div>
      );
    case "booking":
      return (
        <div className="bg-white px-10 py-10">
          <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-200 p-8 shadow-sm">
            <h3 className="text-3xl font-semibold text-zinc-900">Book your session</h3>
            <p className="mt-2 text-zinc-500">Select a service and continue to choose a time.</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {["Initial Consultation", "Follow-up", "Deep Dive"].map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-200 p-5">
                  <p className="text-lg font-semibold text-zinc-900">{item}</p>
                  <p className="mt-1 text-sm text-zinc-500">60 min</p>
                  <button type="button" className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Choose</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "faq":
      return <FAQSectionPreview section={section} />;
    case "newsletter":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-3xl rounded-3xl bg-zinc-50 p-10 text-center">
            <h3 className="text-3xl font-semibold text-zinc-900">Newsletter</h3>
            <p className="mt-3 text-zinc-500">Get new offers, drops, and collection alerts.</p>
            <div className="mx-auto mt-6 flex max-w-xl items-center gap-3">
              <input className="h-12 flex-1 rounded-xl border border-zinc-200 px-4 outline-none" placeholder="Enter your email" />
              <button type="button" className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white">Subscribe</button>
            </div>
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="bg-zinc-950 px-10 py-12 text-white">
          <div className="grid grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <p className="font-semibold">Footer {index + 1}</p>
                <div className="mt-3 space-y-2 text-sm text-zinc-400">
                  <p>Link One</p>
                  <p>Link Two</p>
                  <p>Link Three</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "apps":
      return <AppsSectionPreview section={section} />;
    case "video":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-900">
            <div className="aspect-[16/7] bg-[linear-gradient(135deg,#3b3b3b,#111)]" />
            <div className="p-6 text-white">
              <h3 className="text-2xl font-semibold">Featured video section</h3>
              <p className="mt-2 text-zinc-400">Use autoplay, poster images, TikTok style embeds, or product-led demo reels.</p>
            </div>
          </div>
        </div>
      );
    case "instagram":
      return <InstagramPreviewSection section={section} />;
    case "custompress":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-5xl rounded-3xl bg-zinc-50 p-10 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Press</p>
            <h3 className="mt-3 text-4xl font-semibold text-zinc-900">Featured in iconic beauty publications</h3>
            <div className="mt-8 grid grid-cols-4 gap-4 text-zinc-400">
              {["VOGUE", "ELLE", "ALLURE", "GLAMOUR"].map((name) => (
                <div key={name} className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-xl font-semibold">{name}</div>
              ))}
            </div>
          </div>
        </div>
      );
    case "brandslider":
      return <AutoSlidingBrandSlider section={section} />;
    case "beforeafter":
      return <BeforeAfterSection />;
    case "customliquid":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-5xl rounded-3xl border border-zinc-200 bg-zinc-950 p-8 text-zinc-100">
            <p className="font-mono text-sm text-zinc-400">{"{% raw %} custom liquid {% endraw %}"}</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-5 text-sm text-cyan-300">{`<section className="promo-banner">\n  <h2>Custom liquid output</h2>\n</section>`}</pre>
          </div>
        </div>
      );
    case "featuredblog":
      return <FeaturedBlogPreview section={section} />;
    case "page":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-200 p-10 text-center">
            <h3 className="text-4xl font-semibold text-zinc-900">Page content section</h3>
            <p className="mt-3 text-lg text-zinc-500">Use this for legal pages, brand stories, support layouts, or long-form content pages.</p>
          </div>
        </div>
      );
    case "googlemap":
      return (
        <div className="bg-white px-10 py-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100">
            <div className="flex h-[380px] items-center justify-center text-zinc-500">
              <MapPin className="mr-2 h-6 w-6" /> Google Map preview
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function Canvas({
  theme,
  sections,
  selectedSection,
  viewMode,
  libraryOpen,
  onCloseLibrary,
  onAddSection,
  onRequestAddAfter,
  onSelectSection,
}) {
  const canvasWidth = viewMode === "desktop" ? "w-full" : viewMode === "tablet" ? "w-[900px]" : "w-[390px]";

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-[#efeff1]">
      <div className="flex-1 overflow-auto p-4">
        <div className={cn("mx-auto rounded-2xl border border-zinc-300 bg-white shadow-sm", canvasWidth)}>
          {viewMode === "mobile" ? (
            <PhonePreview theme={theme} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: theme.pageBg }}>
              {sections.map((section) => {
                if (!section.visible) return null;
                const active = selectedSection === section.id;
                return (
                  <SectionFrame
                    key={section.id}
                    active={active}
                    label={section.name}
                    onAddAfter={() => onRequestAddAfter(section.id)}
                    onSelect={() => onSelectSection(section.id)}
                  >
                    {renderSectionContent(section, theme)}
                  </SectionFrame>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SectionLibraryModal open={libraryOpen} onClose={onCloseLibrary} onAdd={onAddSection} />
    </div>
  );
}

function RightSidebar({ selectedSectionId, sections, theme, setTheme, onToggleVisibility, onMoveSection, onDeleteSection }) {
  const section = sections.find((item) => item.id === selectedSectionId) || sections[0] || null;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-zinc-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Settings</p>
          <h3 className="mt-1 text-2xl font-semibold text-zinc-900">{section ? section.name : "No section selected"}</h3>
        </div>
        <button type="button" className="rounded-lg p-2 hover:bg-zinc-100">
          <Settings className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      {section ? (
        <>
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Section type</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                {getSectionIcon(section.kind)}
                {sectionNameMap[section.kind] || section.name}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onToggleVisibility(section.id)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                {section.visible ? "Hide section" : "Show section"}
              </button>
              <button
                type="button"
                onClick={() => onDeleteSection(section.id)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onMoveSection(section.id, -1)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => onMoveSection(section.id, 1)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Move down
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Theme accent</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {themes.map((item) => {
                const active = item.id === theme.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition",
                      active ? "border-blue-500 bg-blue-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                    )}
                  >
                    <div className="h-8 rounded-xl" style={{ backgroundColor: item.accent }} />
                    <p className="mt-2 text-xs font-semibold text-zinc-800">{item.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Selected section</p>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="rounded-xl bg-zinc-100 p-2 text-zinc-600">{getSectionIcon(section.kind)}</div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{section.name}</p>
                <p className="mt-1 text-sm text-zinc-500">Use the canvas and left rail to reorder, hide, and add sections while keeping the page structure clean.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">Select a section to edit its settings.</div>
      )}
    </div>
  );
}

function PreviewModal({ open, theme, sections, page }) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 p-6">
      <div className="w-full max-w-[1200px] overflow-hidden rounded-[28px] border border-zinc-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Preview</p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-900">{getPageLabel(page)}</h3>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">{theme.name}</span>
        </div>
        <div className="max-h-[80vh] overflow-auto" style={{ backgroundColor: theme.pageBg }}>
          {sections.filter((section) => section.visible).map((section) => (
            <div key={section.id}>{renderSectionContent(section, theme)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPageBuilder({ pageId = "home" }) {
  const initialPage = ["home", "booking", "about"].includes(pageId) ? pageId : "home";
  const initialStoredUser = getStoredUser();
  const [page, setPage] = useState(initialPage);
  const [leftRailTab, setLeftRailTab] = useState("sections");
  const [viewMode, setViewMode] = useState("desktop");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [libraryInsertAfterId, setLibraryInsertAfterId] = useState(null);
  const [saveState, setSaveState] = useState("Not saved");
  const [publishState, setPublishState] = useState("Not published");
  const [publicUsername, setPublicUsername] = useState(normalizeUsernameInput(initialStoredUser?.username) || "preview-user");
  const [usernameDraft, setUsernameDraft] = useState(normalizeUsernameInput(initialStoredUser?.username) || "preview-user");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [themeByPage, setThemeByPage] = useState({
    home: themes[0],
    booking: themes[1],
    about: themes[2],
  });
  const [sectionsByPage, setSectionsByPage] = useState(() => deepClone(defaultSections));
  const [selectedSectionByPage, setSelectedSectionByPage] = useState({
    home: defaultSections.home[0].id,
    booking: defaultSections.booking[0].id,
    about: defaultSections.about[0].id,
  });

  useEffect(() => {
    const stored = readStoredBuilder();
    if (!stored) return;
    if (stored.sectionsByPage) setSectionsByPage(stored.sectionsByPage);
    if (stored.themeByPage) setThemeByPage(stored.themeByPage);
    if (stored.selectedSectionByPage) setSelectedSectionByPage(stored.selectedSectionByPage);
    if (stored.publishedSnapshot) setPublishState("Published");
    setHistory([]);
    setFuture([]);
    setSaveState("Loaded");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const payload = await apiFetch("/api/auth/me");
        const nextUsername = normalizeUsernameInput(payload?.user?.username) || "preview-user";
        if (!active) return;
        setPublicUsername(nextUsername);
        setUsernameDraft(nextUsername);
        setStoredUser(payload?.user || null);
      } catch {
        if (!active) return;
        const fallbackUsername = normalizeUsernameInput(getStoredUser()?.username) || "preview-user";
        setPublicUsername(fallbackUsername);
        setUsernameDraft(fallbackUsername);
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPath = `/dashboard/landing-page-builder/${page}`;
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath);
    }
  }, [page]);

  const sections = sectionsByPage[page] || [];
  const selectedSection = selectedSectionByPage[page] || sections[0]?.id || "";
  const theme = themeByPage[page] || themes[0];

  const markBuilderDirty = () => {
    setSaveState("Unsaved changes");
    setPublishState((current) => {
      if (current === "Publishing...") return current;
      if (current === "Published" || current === "Unpublished changes") return "Unpublished changes";
      return "Not published";
    });
  };

  const applyBuilderSnapshot = (snapshot) => {
    setSectionsByPage(snapshot.sectionsByPage);
    setThemeByPage(snapshot.themeByPage);
    setSelectedSectionByPage(snapshot.selectedSectionByPage);
  };

  const runBuilderMutation = (mutator) => {
    const currentSnapshot = createBuilderSnapshot(sectionsByPage, themeByPage, selectedSectionByPage);
    const workingSnapshot = deepClone(currentSnapshot);
    const nextSnapshot = mutator(workingSnapshot) || workingSnapshot;
    setHistory((current) => [...current, currentSnapshot].slice(-MAX_HISTORY_ENTRIES));
    setFuture([]);
    applyBuilderSnapshot(nextSnapshot);
    markBuilderDirty();
  };

  const handleUndo = () => {
    const previousSnapshot = history[history.length - 1];
    if (!previousSnapshot) return;
    const currentSnapshot = createBuilderSnapshot(sectionsByPage, themeByPage, selectedSectionByPage);
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [currentSnapshot, ...current].slice(0, MAX_HISTORY_ENTRIES));
    applyBuilderSnapshot(previousSnapshot);
    markBuilderDirty();
  };

  const handleRedo = () => {
    const nextSnapshot = future[0];
    if (!nextSnapshot) return;
    const currentSnapshot = createBuilderSnapshot(sectionsByPage, themeByPage, selectedSectionByPage);
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current, currentSnapshot].slice(-MAX_HISTORY_ENTRIES));
    applyBuilderSnapshot(nextSnapshot);
    markBuilderDirty();
  };

  const setTheme = (nextTheme) => {
    runBuilderMutation((snapshot) => {
      snapshot.themeByPage[page] = nextTheme;
      return snapshot;
    });
  };

  const openLibraryToAppend = () => {
    setLibraryInsertAfterId(null);
    setLibraryOpen(true);
  };

  const openLibraryToInsertAfter = (sectionId) => {
    setLibraryInsertAfterId(sectionId);
    setLibraryOpen(true);
  };

  const addSection = (item) => {
    runBuilderMutation((snapshot) => {
      const nextSection = createSectionFromLibraryItem(item);
      const pageSections = [...(snapshot.sectionsByPage[page] || [])];
      const insertIndex = libraryInsertAfterId ? pageSections.findIndex((section) => section.id === libraryInsertAfterId) : -1;
      if (insertIndex >= 0) {
        pageSections.splice(insertIndex + 1, 0, nextSection);
      } else {
        pageSections.push(nextSection);
      }
      snapshot.sectionsByPage[page] = pageSections;
      snapshot.selectedSectionByPage[page] = nextSection.id;
      return snapshot;
    });
    setLibraryInsertAfterId(null);
    setLibraryOpen(false);
  };

  const addBlockToSection = (sectionId) => {
    runBuilderMutation((snapshot) => {
      snapshot.sectionsByPage[page] = (snapshot.sectionsByPage[page] || []).map((section) => {
        if (section.id !== sectionId) return section;
        const currentChildren = section.children || getDefaultChildren(section.kind) || [];
        const nextSection = { ...section, children: currentChildren };
        return {
          ...nextSection,
          hasBlocks: true,
          children: [
            ...currentChildren,
            { id: makeId("block"), name: getNextBlockName(nextSection) },
          ],
        };
      });
      snapshot.selectedSectionByPage[page] = sectionId;
      return snapshot;
    });
  };

  const toggleSectionVisibility = (sectionId) => {
    runBuilderMutation((snapshot) => {
      snapshot.sectionsByPage[page] = (snapshot.sectionsByPage[page] || []).map((section) =>
        section.id === sectionId ? { ...section, visible: !section.visible } : section
      );
      return snapshot;
    });
  };

  const moveSection = (sectionId, direction) => {
    runBuilderMutation((snapshot) => {
      const currentSections = [...(snapshot.sectionsByPage[page] || [])];
      const index = currentSections.findIndex((section) => section.id === sectionId);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= currentSections.length) return snapshot;
      const next = [...currentSections];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      snapshot.sectionsByPage[page] = next;
      return snapshot;
    });
  };

  const deleteSection = (sectionId) => {
    runBuilderMutation((snapshot) => {
      const remainingSections = (snapshot.sectionsByPage[page] || []).filter((section) => section.id !== sectionId);
      snapshot.sectionsByPage[page] = remainingSections;
      if (!remainingSections.some((section) => section.id === snapshot.selectedSectionByPage[page])) {
        snapshot.selectedSectionByPage[page] = remainingSections[0]?.id || "";
      }
      return snapshot;
    });
  };

  const saveBuilder = () => {
    setSaveState("Saving...");
    const existing = readStoredBuilder() || {};
    writeStoredBuilder({
      ...existing,
      sectionsByPage,
      themeByPage,
      selectedSectionByPage,
      savedAt: new Date().toISOString(),
    });
    setSaveState("Saved");
  };

  const publishBuilder = () => {
    setPublishState("Publishing...");
    const existing = readStoredBuilder() || {};
    writeStoredBuilder({
      ...existing,
      sectionsByPage,
      themeByPage,
      selectedSectionByPage,
      savedAt: new Date().toISOString(),
      publishedSnapshot: {
        sectionsByPage,
        themeByPage,
        publicUsername,
        publishedAt: new Date().toISOString(),
      },
    });
    setSaveState("Saved");
    setPublishState("Published");
    setUsernameError("");
    setUsernameMessage(`Published live at ${getPublicLabel(publicUsername)}`);
  };

  const handleUsernameDraftChange = (value) => {
    setUsernameDraft(normalizeUsernameInput(value));
    setUsernameError("");
    setUsernameMessage("");
  };

  const savePublicUsername = async () => {
    const nextUsername = normalizeUsernameInput(usernameDraft);
    if (!nextUsername) {
      setUsernameError("Username is required.");
      return;
    }

    if (nextUsername === publicUsername) {
      setUsernameMessage("Public URL is already up to date.");
      return;
    }

    setUsernameSaving(true);
    setUsernameError("");
    setUsernameMessage("");

    try {
      const payload = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { username: nextUsername },
      });
      const savedUsername = normalizeUsernameInput(payload?.user?.username) || nextUsername;
      setPublicUsername(savedUsername);
      setUsernameDraft(savedUsername);
      setStoredUser(payload?.user || null);
      setUsernameMessage(`Public URL updated to ${getPublicLabel(savedUsername)}`);
    } catch (error) {
      setUsernameError(error?.message || "Could not update public URL.");
    } finally {
      setUsernameSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    const ok = await copyToClipboard(getPublicShareUrl(publicUsername));
    setUsernameError("");
    setUsernameMessage(ok ? "Public URL copied." : "Could not copy the public URL.");
  };

  const openPublicUrl = () => {
    if (typeof window === "undefined") return;
    window.open(getPublicPreviewUrl(publicUsername), "_blank", "noopener,noreferrer");
  };

  const setSelectedSection = (sectionId) => {
    setSelectedSectionByPage((current) => ({ ...current, [page]: sectionId }));
  };

  return (
    <>
      <BuilderMotionStyles />
      <div className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <Toolbar
          page={page}
          setPage={setPage}
          viewMode={viewMode}
          setViewMode={setViewMode}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          saveState={saveState}
          publishState={publishState}
          onSave={saveBuilder}
          onPublish={publishBuilder}
          onPreview={() => setPreviewOpen(true)}
          publicUsername={publicUsername}
          usernameDraft={usernameDraft}
          onUsernameDraftChange={handleUsernameDraftChange}
          onSaveUsername={savePublicUsername}
          onCopyPublicUrl={copyPublicUrl}
          onOpenPublicUrl={openPublicUrl}
          usernameSaving={usernameSaving}
          usernameMessage={usernameMessage}
          usernameError={usernameError}
        />

        <div className="grid grid-cols-[342px_minmax(0,1fr)_320px]">
          <LeftSidebar
            sections={sections}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            leftRailTab={leftRailTab}
            setLeftRailTab={setLeftRailTab}
            page={page}
            setPage={setPage}
            onOpenLibrary={openLibraryToAppend}
            onAddSection={addSection}
            onAddBlock={addBlockToSection}
            theme={theme}
            setTheme={setTheme}
          />

          <Canvas
            theme={theme}
            sections={sections}
            selectedSection={selectedSection}
            viewMode={viewMode}
            libraryOpen={libraryOpen}
            onCloseLibrary={() => setLibraryOpen(false)}
            onAddSection={addSection}
            onRequestAddAfter={openLibraryToInsertAfter}
            onSelectSection={setSelectedSection}
          />

          <RightSidebar
            selectedSectionId={selectedSection}
            sections={sections}
            theme={theme}
            setTheme={setTheme}
            onToggleVisibility={toggleSectionVisibility}
            onMoveSection={moveSection}
            onDeleteSection={deleteSection}
          />
        </div>

        <PreviewModal open={previewOpen} theme={theme} sections={sections} page={page} />
        {previewOpen && (
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-8 top-20 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
}
