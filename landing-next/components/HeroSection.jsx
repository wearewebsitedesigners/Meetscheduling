"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, BarChart3, Globe, Mail, Sparkles, Star } from "lucide-react";
import Container from "@/components/Container";
import { Button } from "@/components/Button";

function CountStat({ value, prefix = "", suffix = "", label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, motionValue, value]);

  return (
    <div ref={ref} className="rounded-2xl border border-[#d8e2f3] bg-white/88 p-4 shadow-card">
      <p className="text-[0.79rem] font-semibold uppercase tracking-[0.09em] text-[#6d7d9b]">{label}</p>
      <p className="mt-2 text-[1.55rem] font-extrabold leading-none text-brandDark">
        {prefix}
        <motion.span>{rounded}</motion.span>
        {suffix}
      </p>
    </div>
  );
}

function FloatingCard({ className = "", icon: Icon, title, body, color = "#2159d2", delay = 0 }) {
  return (
    <motion.article
      className={`absolute w-[190px] rounded-2xl border border-white/80 bg-white/96 p-3 shadow-card ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -4 }}
    >
      <motion.div
        className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1a`, color }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay }}
      >
        <Icon size={15} />
      </motion.div>
      <p className="text-[0.84rem] font-semibold text-brandDark">{title}</p>
      <p className="mt-1 text-[0.75rem] leading-relaxed text-[#6a7a97]">{body}</p>
    </motion.article>
  );
}

export default function HeroSection() {
  return (
    <section className="section-pad pb-8 pt-12 lg:pt-16">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <motion.p
              className="inline-flex items-center gap-2 rounded-full border border-[#d6e0f2] bg-white px-4 py-2 text-[0.79rem] font-semibold text-[#3f5f95]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, duration: 0.45 }}
            >
              <Sparkles size={14} className="text-accent" />
              Trusted by 4,000+ creators and small teams
            </motion.p>

            <h1 className="mt-5 max-w-[16ch] text-balance text-[clamp(2.2rem,5.6vw,4.8rem)] font-extrabold leading-[0.95] text-brandDark">
              Build pages that sell,
              <span className="text-brand"> launch products faster.</span>
            </h1>

            <p className="mt-5 max-w-[62ch] text-[clamp(1.01rem,1.55vw,1.2rem)] leading-relaxed text-[#5f6f8f]">
              MeetScheduling gives creators one polished workspace to design landing pages, capture leads, and turn traffic
              into revenue without juggling five tools.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button href="#cta" variant="primary" className="min-h-14 rounded-2xl px-7 text-[1rem]">
                Start free
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button href="#editor" variant="secondary" className="min-h-14 rounded-2xl px-7 text-[1rem]">
                Watch demo
              </Button>
            </div>

            <p className="mt-4 text-sm font-medium text-[#6780ad]">No coding · No credit card · Built for creators</p>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="pointer-events-none absolute -inset-7 rounded-[34px] bg-[radial-gradient(circle_at_40%_20%,rgba(35,180,255,0.30),transparent_56%),radial-gradient(circle_at_70%_75%,rgba(33,89,210,0.30),transparent_63%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[30px] border border-[#ccdaef] bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-[#e0e8f5] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#fc7f7f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffce66]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#63d594]" />
                </div>
                <p className="text-xs font-semibold text-[#7890b4]">Landing editor live preview</p>
              </div>

              <div className="grid grid-cols-[170px_1fr]">
                <div className="border-r border-[#e7edf8] bg-[#f9fbff] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#8093b2]">Sections</p>
                  <div className="mt-3 space-y-2">
                    {[
                      "Hero + lead form",
                      "Offer highlights",
                      "Testimonials",
                      "Checkout CTA",
                    ].map((item, index) => (
                      <div key={item} className={`rounded-lg border px-2 py-2 text-[0.75rem] font-medium ${index === 0 ? "border-[#a8c3ff] bg-[#eaf1ff] text-brandDark" : "border-[#dde8fb] bg-white text-[#6983ac]"}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="rounded-2xl border border-[#dde7f8] bg-gradient-to-r from-[#f5f9ff] to-[#edf6ff] p-4">
                    <p className="text-[0.69rem] font-semibold uppercase tracking-[0.08em] text-[#6f84aa]">Template Hero</p>
                    <h3 className="mt-2 text-[1.1rem] font-bold leading-tight text-brandDark">Launch your premium course in one week</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#607498]">Build trust, collect payments, and automate onboarding from one elegant page.</p>
                    <button className="mt-3 inline-flex h-8 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-white">Get instant access</button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#dce7f9] bg-white p-3">
                      <p className="text-[0.69rem] font-semibold uppercase tracking-[0.07em] text-[#7a8fad]">Conversion</p>
                      <p className="mt-1 text-lg font-bold text-brandDark">9.4%</p>
                    </div>
                    <div className="rounded-xl border border-[#dce7f9] bg-white p-3">
                      <p className="text-[0.69rem] font-semibold uppercase tracking-[0.07em] text-[#7a8fad]">Leads today</p>
                      <p className="mt-1 text-lg font-bold text-brandDark">128</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FloatingCard
              className="-left-7 top-[15%] hidden lg:block"
              icon={BarChart3}
              title="Sales this week"
              body="+$12,430 from 94 transactions"
              delay={0.2}
            />
            <FloatingCard
              className="-right-7 top-[9%] hidden lg:block"
              icon={Globe}
              title="Website builder"
              body="12 sections published today"
              color="#23b4ff"
              delay={0.35}
            />
            <FloatingCard
              className="-left-6 bottom-[18%] hidden lg:block"
              icon={Mail}
              title="Email campaign"
              body="43% open rate on launch flow"
              color="#0f2d73"
              delay={0.5}
            />
            <FloatingCard
              className="-right-5 bottom-[9%] hidden lg:block"
              icon={Star}
              title="Creator review"
              body={'"The smoothest builder we have used."'}
              color="#2159d2"
              delay={0.7}
            />
          </motion.div>
        </div>

        <motion.div
          className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
        >
          <CountStat value={124} prefix="$" suffix="K" label="Revenue earned" />
          <CountStat value={3480} suffix="+" label="Transactions" />
          <CountStat value={9500} suffix="+" label="Active customers" />
          <CountStat value={42} suffix="K" label="Products created" />
        </motion.div>
      </Container>
    </section>
  );
}
