"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Container from "@/components/Container";
import { Button } from "@/components/Button";

export default function FinalCtaSection() {
  return (
    <section id="cta" className="section-pad pt-6">
      <Container>
        <motion.div
          className="relative overflow-hidden rounded-[34px] border border-[#cbdcf8] bg-gradient-to-br from-[#eff5ff] via-white to-[#e8f8ff] p-8 shadow-soft sm:p-10 lg:p-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <div className="noise-layer pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(35,180,255,0.4),transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-20 -left-8 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(33,89,210,0.26),transparent_65%)]" />

          <div className="relative z-10 max-w-[740px]">
            <p className="inline-flex rounded-full border border-[#ccdef8] bg-white/70 px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#5f79a4]">
              Ready to launch?
            </p>
            <h2 className="mt-4 text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.03] text-brandDark">
              Build, customize, and publish your next high-converting page today
            </h2>
            <p className="mt-4 max-w-[60ch] text-[1.03rem] leading-relaxed text-[#556b93]">
              Start with a polished template, tailor every section visually, and go live with payment-ready pages in one
              platform.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="#" variant="primary" className="min-h-14 rounded-2xl px-8 text-base">
                Start free
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button href="#" variant="secondary" className="min-h-14 rounded-2xl px-8 text-base">
                Book a demo
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
