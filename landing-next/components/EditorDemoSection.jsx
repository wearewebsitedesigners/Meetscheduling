"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Blocks,
  ChevronsUpDown,
  LayoutTemplate,
  MousePointer2,
  Palette,
  Plus,
  Search,
  Settings2,
  Type,
} from "lucide-react";
import Container from "@/components/Container";

const TABS = ["Hero", "Testimonials", "Pricing", "FAQ"];
const HEADLINES = [
  "Sell your digital guide in 5 minutes",
  "Turn visitors into paying subscribers",
  "Launch polished pages with zero dev time",
];
const ACCENTS = ["#2159d2", "#23b4ff", "#3e78eb"];
const ORDERS = [
  ["Hero", "Features", "Testimonials", "Pricing", "FAQ"],
  ["Hero", "Testimonials", "Features", "Pricing", "FAQ"],
  ["Hero", "Features", "Pricing", "Testimonials", "FAQ"],
];

function Tooltip({ className = "", text }) {
  return (
    <motion.div
      className={`pointer-events-none absolute hidden rounded-xl border border-[#d7e4f9] bg-white px-3 py-2 text-[0.73rem] font-semibold text-[#56719f] shadow-card lg:inline-flex ${className}`}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {text}
    </motion.div>
  );
}

export default function EditorDemoSection() {
  const [phase, setPhase] = useState(0);
  const activeTab = phase % TABS.length;

  useEffect(() => {
    const timer = setInterval(() => setPhase((prev) => prev + 1), 2600);
    return () => clearInterval(timer);
  }, []);

  const accent = ACCENTS[phase % ACCENTS.length];
  const headline = HEADLINES[phase % HEADLINES.length];
  const order = useMemo(() => ORDERS[phase % ORDERS.length], [phase]);
  const showExtraTestimonials = phase % 2 === 1;

  return (
    <section id="editor" className="section-pad pb-8">
      <Container>
        <motion.div
          className="mx-auto max-w-[820px] text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
        >
          <p className="inline-flex items-center rounded-full border border-[#d6e0f2] bg-white px-4 py-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-[#6d80a4]">
            Landing page editor demo
          </p>
          <h2 className="mt-4 text-[clamp(1.9rem,3.6vw,3.05rem)] leading-[1.05] text-brandDark">
            Visually build and publish pages in minutes
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-[#5f7092]">
            Drag blocks, tune style settings, and launch conversion-ready pages from one live editor built for speed.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-9 overflow-hidden rounded-[32px] border border-[#cfddf2] bg-white p-4 shadow-soft sm:p-5"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 -z-10 soft-grid opacity-55" />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7e4f8] bg-[#f8fbff] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
                <LayoutTemplate size={16} />
              </span>
              <div>
                <p className="text-[0.88rem] font-semibold text-brandDark">Creator landing editor</p>
                <p className="text-[0.74rem] text-[#6f84ac]">Auto-saving changes every second</p>
              </div>
            </div>

            <motion.button
              className="relative overflow-hidden rounded-xl border border-[#cde0ff] bg-white px-4 py-2 text-sm font-semibold text-brandDark"
              animate={{ boxShadow: ["0 0 0 rgba(33,89,210,0)", "0 0 0 6px rgba(33,89,210,0.08)", "0 0 0 rgba(33,89,210,0)"] }}
              transition={{ duration: 2.6, repeat: Infinity }}
            >
              Publish
              <motion.span
                className="pointer-events-none absolute inset-y-0 -left-8 w-8 bg-gradient-to-r from-transparent via-white to-transparent"
                animate={{ x: [-20, 160] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
              />
            </motion.button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_1fr_250px]">
            <aside className="rounded-2xl border border-[#d9e5f8] bg-[#fbfdff] p-3">
              <p className="text-[0.71rem] font-semibold uppercase tracking-[0.09em] text-[#7c90b0]">Page structure</p>
              <div className="mt-3 space-y-1.5">
                {TABS.map((item, index) => (
                  <motion.div
                    key={item}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-[0.82rem] font-medium ${index === activeTab ? "border-[#a9c6ff] bg-[#edf3ff] text-brandDark" : "border-[#e2ecfc] bg-white text-[#647da6]"}`}
                    animate={index === activeTab ? { x: [0, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <span>{item} section</span>
                    <ChevronsUpDown size={14} />
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-[#bcd3fb] bg-[#f1f6ff] p-3 text-[0.78rem] font-medium text-[#5d78a5]">
                <div className="flex items-center gap-2">
                  <Blocks size={14} />
                  Blocks library
                </div>
                <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-white">
                  <Plus size={13} />
                  Add block
                </button>
              </div>
            </aside>

            <div className="relative overflow-hidden rounded-2xl border border-[#d8e3f7] bg-white p-4">
              <div className="rounded-2xl border border-[#dbe6f8] bg-[#f7faff] p-4">
                <p className="text-[0.67rem] font-semibold uppercase tracking-[0.08em] text-[#7288ad]">Hero block</p>

                <AnimatePresence mode="wait">
                  <motion.h3
                    key={headline}
                    className="mt-2 max-w-[28ch] text-[1.2rem] font-bold leading-tight text-brandDark"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    {headline}
                  </motion.h3>
                </AnimatePresence>

                <p className="mt-2 max-w-[50ch] text-[0.83rem] leading-relaxed text-[#63769a]">
                  Customize typography, layout, and calls-to-action without touching code.
                </p>

                <motion.button
                  className="mt-3 rounded-xl px-4 py-2 text-[0.78rem] font-semibold text-white"
                  animate={{ backgroundColor: accent }}
                  transition={{ duration: 0.45 }}
                >
                  Claim your offer
                </motion.button>
              </div>

              <div className="mt-4 rounded-2xl border border-[#dbe7fa] bg-[#fafcff] p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#7389af]">Canvas order</p>
                <motion.ul className="mt-2 space-y-1.5">
                  {order.map((item) => (
                    <motion.li
                      key={item}
                      layout
                      transition={{ type: "spring", damping: 22, stiffness: 220 }}
                      className="rounded-lg border border-[#dce8fb] bg-white px-3 py-2 text-[0.8rem] font-medium text-[#5f769f]"
                    >
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>

              <AnimatePresence>
                {showExtraTestimonials && (
                  <motion.div
                    key="testimonial-preview"
                    className="mt-4 rounded-2xl border border-[#d9e6fa] bg-white p-3"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#7389af]">Added testimonial</p>
                    <p className="mt-2 text-[0.82rem] leading-relaxed text-[#5f759f]">
                      “We launched in one afternoon and doubled conversion in week one.”
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <aside className="rounded-2xl border border-[#d9e5f8] bg-[#fbfdff] p-3">
              <p className="text-[0.71rem] font-semibold uppercase tracking-[0.09em] text-[#7c90b0]">Settings</p>

              <div className="mt-3 space-y-2.5 text-[0.81rem] text-[#5e769f]">
                <div className="rounded-xl border border-[#dce8fb] bg-white p-2.5">
                  <p className="mb-2 flex items-center gap-2 font-medium text-brandDark">
                    <Type size={14} />
                    Typography
                  </p>
                  <motion.div
                    className="h-1.5 rounded-full bg-brand"
                    animate={{ width: ["54%", "72%", "60%"] }}
                    transition={{ duration: 2.8, repeat: Infinity }}
                  />
                </div>

                <div className="rounded-xl border border-[#dce8fb] bg-white p-2.5">
                  <p className="mb-2 flex items-center gap-2 font-medium text-brandDark">
                    <Palette size={14} />
                    Colors
                  </p>
                  <motion.div className="h-7 rounded-lg" animate={{ backgroundColor: accent }} transition={{ duration: 0.45 }} />
                </div>

                <div className="rounded-xl border border-[#dce8fb] bg-white p-2.5">
                  <p className="mb-2 flex items-center gap-2 font-medium text-brandDark">
                    <Settings2 size={14} />
                    Spacing
                  </p>
                  <div className="space-y-1.5">
                    {[65, 48, 72].map((width, index) => (
                      <motion.div
                        key={index}
                        className="h-1.5 rounded-full bg-[#c3d6fa]"
                        animate={{ width: [`${width - 12}%`, `${width}%`, `${width - 8}%`] }}
                        transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.2 }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#dce8fb] bg-white p-2.5">
                  <p className="flex items-center gap-2 font-medium text-brandDark">
                    <Search size={14} />
                    SEO settings
                  </p>
                  <p className="mt-1 text-[0.75rem] text-[#7189b2]">Auto-generate meta tags and social preview.</p>
                </div>
              </div>
            </aside>
          </div>

          <motion.div
            className="pointer-events-none absolute left-[15%] top-[58%] hidden rounded-lg border border-[#bcd5ff] bg-[#eaf2ff] px-3 py-1.5 text-[0.72rem] font-semibold text-brandDark lg:block"
            animate={{ x: [0, 210], y: [0, -120], opacity: [1, 1, 0.85, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
          >
            + Testimonial block
          </motion.div>

          <motion.div
            className="pointer-events-none absolute hidden h-9 w-9 items-center justify-center rounded-full border border-[#d4e3fb] bg-white text-brand shadow-card lg:flex"
            animate={{ x: [220, 520, 800, 640, 220], y: [160, 90, 180, 340, 160] }}
            transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <MousePointer2 size={14} />
          </motion.div>

          <Tooltip className="left-12 top-6" text="Drag & drop blocks" />
          <Tooltip className="right-16 top-16" text="Customize every section" />
          <Tooltip className="bottom-8 right-24" text="Publish in minutes" />
        </motion.div>
      </Container>
    </section>
  );
}
