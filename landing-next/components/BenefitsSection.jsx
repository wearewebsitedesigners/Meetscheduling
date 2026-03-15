"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Container from "@/components/Container";

const benefits = [
  {
    title: "Launch faster",
    copy: "Move from idea to published page in hours, not weeks.",
  },
  {
    title: "Convert better",
    copy: "Use tested layouts and CTA patterns built to improve checkout rates.",
  },
  {
    title: "Own your data",
    copy: "Track customer events, orders, and journey insights in one dashboard.",
  },
  {
    title: "Reduce tool switching",
    copy: "Pages, email, checkout, automation, and analytics in one clean workflow.",
  },
  {
    title: "Sell globally",
    copy: "Multiple currencies, tax settings, and payment options for international buyers.",
  },
  {
    title: "Easy setup",
    copy: "No-code onboarding with prebuilt templates and guided launch checklist.",
  },
];

export default function BenefitsSection() {
  return (
    <section className="section-pad pb-8 pt-4">
      <Container>
        <motion.div
          className="mx-auto max-w-[760px] text-center"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
        >
          <p className="inline-flex rounded-full border border-[#d6e0f2] bg-white px-4 py-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-[#6d80a4]">
            Why teams switch
          </p>
          <h2 className="mt-4 text-[clamp(1.75rem,3.2vw,2.7rem)] leading-[1.08] text-brandDark">
            Built for teams that care about speed and conversion quality
          </h2>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.article
              key={benefit.title}
              className="rounded-2xl border border-[#dae6f8] bg-white p-5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.05, duration: 0.45 }}
              whileHover={{ y: -4 }}
            >
              <CheckCircle2 size={18} className="text-brand" />
              <h3 className="mt-3 text-[1.02rem] font-bold text-brandDark">{benefit.title}</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-[#5f7092]">{benefit.copy}</p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
