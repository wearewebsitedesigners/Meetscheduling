import React, { useState } from "react";
import {
  Check,
  Zap,
  Building2,
  Sparkles,
  ArrowRight,
  PhoneCall,
  Users,
  Calendar,
  BarChart3,
  Globe,
  Mail,
  Shield,
  Star,
  Server,
} from "lucide-react";
import { cn } from "../shared.jsx";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "Everything you need to get started with scheduling.",
    badge: null,
    accent: "slate",
    icon: Calendar,
    cta: "Current plan",
    ctaDisabled: true,
    ctaHref: null,
    features: [
      "1 event type",
      "Unlimited bookings",
      "Google Calendar sync",
      "Email confirmations",
      "Custom booking page",
      "Basic availability settings",
      "meetscheduling.com/username link",
    ],
    missing: [
      "Confirmation calls",
      "Team members",
      "Advanced analytics",
      "Custom domain",
      "Email automation",
      "Priority support",
    ],
  },
  {
    key: "startup",
    name: "Startup",
    price: { monthly: 12, yearly: 9 },
    description: "For growing teams that need more power and automation.",
    badge: "Most popular",
    accent: "blue",
    icon: Zap,
    cta: "Upgrade to Startup",
    ctaDisabled: false,
    ctaHref: null,
    features: [
      "10 event types",
      "Unlimited bookings",
      "Google & Outlook Calendar sync",
      "Email confirmations & reminders",
      "Custom booking page + branding",
      "Advanced availability & buffers",
      "Email automation workflows",
      "3 team members",
      "Contacts CRM",
      "Basic analytics",
      "1 custom domain",
      "Round-robin & fixed round-robin scheduling",
      "Collective events (multiple hosts)",
      "Routing forms",
      "Teams workflows",
      "Schedule meetings as a team",
      "Same-day email & chat support",
    ],
    missing: [],
  },
  {
    key: "business-pro",
    name: "Business Pro",
    price: { monthly: 29, yearly: 22 },
    description: "The full stack for serious operators and agencies.",
    badge: "Best value",
    accent: "purple",
    icon: Building2,
    cta: "Upgrade to Business Pro",
    ctaDisabled: false,
    ctaHref: null,
    features: [
      "Unlimited event types",
      "Unlimited bookings",
      "All calendar integrations",
      "Email confirmations, reminders & sequences",
      "Full white-label branding",
      "Advanced availability & routing",
      "Unlimited email automation",
      "Confirmation calls (IVR via Twilio)",
      "Unlimited team members",
      "Full CRM + contact history",
      "Advanced analytics & exports",
      "Unlimited custom domains",
      "Landing page builder",
      "Priority support",
      "Organization workflows",
      "Custom org subdomain (company.meetscheduling.com)",
      "SAML SSO",
      "Domain-wide calendar delegation",
      "Member attributes",
      "Attribute-based routing",
    ],
    missing: [],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: { monthly: null, yearly: null },
    description: "For organizations that need security, compliance, and dedicated support.",
    badge: "Enterprise",
    accent: "amber",
    icon: Server,
    cta: "Contact sales",
    ctaDisabled: false,
    ctaHref: "mailto:sales@meetscheduling.com",
    features: [
      "Everything in Business Pro",
      "Dedicated database",
      "AI phone agents",
      "Active directory sync",
      "Dedicated onboarding & engineering support",
      "Enterprise-level support",
      "99.9% uptime SLA",
      "24/7 real-time Slack Connect",
      "SOC2, HIPAA, ISO 27001 compliance",
    ],
    missing: [],
  },
];

const accentTokens = {
  slate: {
    badge: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    border: "border-[#DFE7F3] dark:border-white/10",
    ring: "",
    cta: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15",
    icon: "text-slate-500",
    pill: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
  },
  blue: {
    badge: "bg-[#3B82F6]/10 text-[#2563EB] dark:bg-[#3B82F6]/20 dark:text-[#93BBFF]",
    border: "border-[#3B82F6]/40 dark:border-[#3B82F6]/30",
    ring: "ring-2 ring-[#3B82F6]/20 dark:ring-[#3B82F6]/15",
    cta: "bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:from-[#2563EB] hover:to-[#1D4ED8] shadow-[0_8px_24px_rgba(37,99,235,0.28)]",
    icon: "text-[#3B82F6]",
    pill: "bg-[#EEF4FF] text-[#2563EB] dark:bg-[#1e3a6e] dark:text-[#93BBFF]",
  },
  purple: {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    border: "border-violet-300/50 dark:border-violet-500/30",
    ring: "ring-2 ring-violet-300/30 dark:ring-violet-500/20",
    cta: "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-[0_8px_24px_rgba(124,58,237,0.28)]",
    icon: "text-violet-600 dark:text-violet-400",
    pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    border: "border-amber-300/50 dark:border-amber-500/30",
    ring: "ring-2 ring-amber-300/30 dark:ring-amber-500/20",
    cta: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-[0_8px_24px_rgba(245,158,11,0.28)]",
    icon: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
};

function FeatureRow({ text, included }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px]">
      {included ? (
        <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
      ) : (
        <span className="mt-0.5 shrink-0 h-[14px] w-[14px] flex items-center justify-center">
          <span className="block h-[2px] w-[8px] rounded-full bg-slate-300 dark:bg-slate-600" />
        </span>
      )}
      <span className={included ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-600 line-through"}>
        {text}
      </span>
    </li>
  );
}

function PlanCard({ plan, billing }) {
  const tokens = accentTokens[plan.accent];
  const Icon = plan.icon;
  const isFree = plan.price.monthly === 0;
  const isCustom = plan.price.monthly === null;
  const price = isCustom ? null : (billing === "yearly" ? plan.price.yearly : plan.price.monthly);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[28px] border bg-white p-7 shadow-[0_18px_50px_rgba(15,31,61,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,31,61,0.10)] dark:bg-white/[0.04]",
        tokens.border,
        tokens.ring
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <div className={cn("absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm", tokens.badge)}>
          <Star size={10} fill="currentColor" />
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("mb-2 inline-flex h-9 w-9 items-center justify-center rounded-[14px] border", tokens.border)}>
            <Icon size={16} className={tokens.icon} />
          </div>
          <h3 className="text-[20px] font-bold tracking-tight text-slate-800 dark:text-white">{plan.name}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-end gap-1">
        <span className="text-[38px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
          {isCustom ? "Custom" : isFree ? "Free" : `$${price}`}
        </span>
        {!isFree && !isCustom && (
          <span className="mb-1 text-[14px] text-slate-400 dark:text-slate-500">
            / mo{billing === "yearly" ? " · billed yearly" : ""}
          </span>
        )}
        {isCustom && (
          <span className="mb-1 text-[14px] text-slate-400 dark:text-slate-500">pricing</span>
        )}
      </div>

      {billing === "yearly" && !isFree && !isCustom && (
        <div className={cn("mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tokens.pill)}>
          Save ${(plan.price.monthly - plan.price.yearly) * 12}/yr
        </div>
      )}

      {/* CTA */}
      {plan.ctaHref ? (
        <a
          href={plan.ctaHref}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-semibold transition-all duration-200",
            tokens.cta
          )}
        >
          {plan.cta}
          <ArrowRight size={14} />
        </a>
      ) : (
        <button
          disabled={plan.ctaDisabled}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-semibold transition-all duration-200",
            plan.ctaDisabled ? "cursor-default opacity-60 " + tokens.cta : tokens.cta
          )}
        >
          {plan.ctaDisabled ? (
            plan.cta
          ) : (
            <>
              {plan.cta}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      )}

      {/* Divider */}
      <div className="my-6 border-t border-[#DFE7F3] dark:border-white/10" />

      {/* Features */}
      <ul className="space-y-2.5">
        {plan.features.map((f) => (
          <FeatureRow key={f} text={f} included />
        ))}
        {plan.missing.map((f) => (
          <FeatureRow key={f} text={f} included={false} />
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({ label }) {
  return (
    <tr className="bg-slate-50 dark:bg-white/[0.03]">
      <td colSpan={5} className="py-2 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </td>
    </tr>
  );
}

function CompareRow({ label, free, startup, pro, enterprise, icon: Icon }) {
  function Cell({ value }) {
    if (value === true) return <Check size={16} className="mx-auto text-emerald-500" />;
    if (value === false) return <span className="mx-auto block h-[2px] w-4 rounded-full bg-slate-200 dark:bg-white/10" />;
    return <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{value}</span>;
  }

  return (
    <tr className="border-t border-[#DFE7F3] dark:border-white/10">
      <td className="py-3.5 pr-4">
        <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
          {Icon && <Icon size={14} className="shrink-0 text-slate-400" />}
          {label}
        </div>
      </td>
      <td className="py-3.5 text-center"><Cell value={free} /></td>
      <td className="py-3.5 text-center"><Cell value={startup} /></td>
      <td className="py-3.5 text-center"><Cell value={pro} /></td>
      <td className="py-3.5 text-center"><Cell value={enterprise} /></td>
    </tr>
  );
}

export default function UpgradePanel() {
  const [billing, setBilling] = useState("monthly");

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-[#3B82F6] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF]">
          <Sparkles size={12} />
          Choose your plan
        </div>
        <h1 className="mt-3 text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">
          Grow without limits
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          Start free and upgrade when you need more power. No contracts, cancel any time.
        </p>

        {/* Billing toggle */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-[#DFE7F3] bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200",
              billing === "monthly"
                ? "bg-white text-slate-800 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200",
              billing === "yearly"
                ? "bg-white text-slate-800 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Yearly
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.key} plan={plan} billing={billing} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="mb-6 text-[22px] font-bold text-slate-800 dark:text-white">Full feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="pb-4 text-left text-[12px] font-semibold uppercase tracking-widest text-slate-400">Feature</th>
                <th className="pb-4 text-center text-[13px] font-bold text-slate-600 dark:text-slate-300">Free</th>
                <th className="pb-4 text-center text-[13px] font-bold text-[#2563EB] dark:text-[#93BBFF]">Startup</th>
                <th className="pb-4 text-center text-[13px] font-bold text-violet-700 dark:text-violet-300">Business Pro</th>
                <th className="pb-4 text-center text-[13px] font-bold text-amber-600 dark:text-amber-400">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {/* Scheduling */}
              <CategoryRow label="Scheduling" />
              <CompareRow label="Event types"             icon={Calendar}  free="1"         startup="10"       pro="Unlimited"  enterprise="Unlimited" />
              <CompareRow label="Bookings / month"        icon={Calendar}  free="Unlimited" startup="Unlimited" pro="Unlimited" enterprise="Unlimited" />
              <CompareRow label="Round-robin scheduling"  icon={Calendar}  free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Collective events"       icon={Users}     free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Routing forms"           icon={Globe}     free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Instant meetings"        icon={Zap}       free={false}     startup={true}     pro={true}       enterprise={true} />

              {/* Team & Collaboration */}
              <CategoryRow label="Team & Collaboration" />
              <CompareRow label="Team members"            icon={Users}     free="1"         startup="3"        pro="Unlimited"  enterprise="Unlimited" />
              <CompareRow label="Teams workflows"         icon={Users}     free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Schedule as a team"      icon={Users}     free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Organization workflows"  icon={Building2} free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="Member attributes"       icon={Users}     free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="Active directory sync"   icon={Shield}    free={false}     startup={false}    pro={false}      enterprise={true} />

              {/* Customization & Branding */}
              <CategoryRow label="Customization & Branding" />
              <CompareRow label="Custom domain"           icon={Globe}     free={false}     startup="1"        pro="Unlimited"  enterprise="Unlimited" />
              <CompareRow label="Org subdomain"           icon={Globe}     free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="White-label branding"    icon={Building2} free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="Landing page builder"    icon={Globe}     free={false}     startup={false}    pro={true}       enterprise={true} />

              {/* Integrations & Security */}
              <CategoryRow label="Integrations & Security" />
              <CompareRow label="Calendar integrations"   icon={Calendar}  free="Google"    startup="G + Outlook" pro="All"     enterprise="All" />
              <CompareRow label="Email automation"        icon={Mail}      free={false}     startup={true}     pro={true}       enterprise={true} />
              <CompareRow label="Confirmation calls (IVR)" icon={PhoneCall} free={false}   startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="SAML SSO"                icon={Shield}    free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="Domain-wide cal. delegation" icon={Globe} free={false}    startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="Attribute-based routing" icon={Globe}     free={false}     startup={false}    pro={true}       enterprise={true} />
              <CompareRow label="AI phone agents"         icon={PhoneCall} free={false}     startup={false}    pro={false}      enterprise={true} />
              <CompareRow label="Dedicated database"      icon={Server}    free={false}     startup={false}    pro={false}      enterprise={true} />

              {/* Analytics, Support & Compliance */}
              <CategoryRow label="Analytics, Support & Compliance" />
              <CompareRow label="Analytics"               icon={BarChart3} free={false}     startup="Basic"    pro="Full + exports" enterprise="Full + exports" />
              <CompareRow label="Contacts CRM"            icon={Users}     free={false}     startup={true}     pro="Full + history" enterprise="Full + history" />
              <CompareRow label="Support level"           icon={Mail}      free="—"         startup="Same-day" pro="Priority"    enterprise="Dedicated" />
              <CompareRow label="Uptime SLA"              icon={Shield}    free={false}     startup={false}    pro={false}      enterprise="99.9%" />
              <CompareRow label="24/7 Slack Connect"      icon={Mail}      free={false}     startup={false}    pro={false}      enterprise={true} />
              <CompareRow label="SOC2 / HIPAA / ISO 27001" icon={Shield}   free={false}    startup={false}    pro={false}      enterprise={true} />
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ / trust strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Shield, title: "No credit card required", body: "Start on Free instantly. Upgrade only when you need to." },
          { icon: Zap, title: "Instant activation", body: "Paid features unlock immediately after upgrade — no waiting." },
          { icon: Star, title: "Cancel any time", body: "No long-term contracts. Downgrade or cancel with one click." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-4 rounded-[24px] border border-[#DFE7F3] bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] dark:bg-[#1e3a6e]">
              <Icon size={16} className="text-[#2563EB] dark:text-[#93BBFF]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-800 dark:text-white">{title}</div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
