"use client";

import { motion } from "framer-motion";
import {
  BookOpenCheck,
  Bot,
  Globe,
  MessageSquareQuote,
  ShoppingBag,
} from "lucide-react";
import Container from "@/components/Container";

const features = [
  {
    icon: ShoppingBag,
    title: "Sell digital products",
    description: "Create checkout-ready offers with upsells, coupons, and global payment options.",
  },
  {
    icon: Globe,
    title: "Build websites",
    description: "Launch polished landing pages with drag-and-drop sections and conversion blocks.",
  },
  {
    icon: MessageSquareQuote,
    title: "Run email campaigns",
    description: "Automate welcome, nurture, and launch flows from one visual campaign builder.",
  },
  {
    icon: BookOpenCheck,
    title: "Publish courses",
    description: "Host lessons, gated resources, and member content in your branded creator hub.",
  },
  {
    icon: MessageSquareQuote,
    title: "Collect testimonials",
    description: "Request, approve, and publish social proof cards directly inside your workspace.",
  },
  {
    icon: Bot,
    title: "Analytics + automation",
    description: "Track conversion metrics and trigger actions based on behavior in real time.",
  },
];

export default function AllInOneSection() {
  return (
    <section id="platform" className="section-pad">
      <Container>
        <motion.div
          className="mx-auto max-w-[780px] text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
        >
          <p className="inline-flex items-center rounded-full border border-[#d6e0f2] bg-white px-4 py-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-[#6d80a4]">
            All-in-one platform
          </p>
          <h2 className="mt-4 text-[clamp(1.85rem,3.3vw,3rem)] leading-[1.06] text-brandDark">
            Everything you need to build, market, and sell from one workspace
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-[#5f7092]">
            Replace disconnected tools with one premium platform designed for creators who care about speed,
            conversion, and clean brand experience.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="group rounded-3xl border border-[#dbe6f8] bg-white/95 p-5 shadow-[0_12px_24px_rgba(15,45,115,0.08)]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              whileHover={{ y: -6 }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d2e1fb] bg-[#f0f5ff] text-brand">
                <feature.icon size={20} />
              </div>
              <h3 className="mt-4 text-[1.15rem] font-bold text-brandDark">{feature.title}</h3>
              <p className="mt-2 text-[0.93rem] leading-relaxed text-[#5e7093]">{feature.description}</p>

              <div className="mt-4 h-1.5 w-16 rounded-full bg-gradient-to-r from-brand to-accent opacity-35 transition group-hover:opacity-100" />
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
