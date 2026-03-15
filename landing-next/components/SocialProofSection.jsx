"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Container from "@/components/Container";

const logos = ["CreatorHub", "Flowcart", "LaunchGrid", "PixelMakers", "Mentorstack"];
const avatars = ["AL", "JM", "SR", "RK", "DP", "TN"];

export default function SocialProofSection() {
  return (
    <section className="pb-6 pt-4">
      <Container>
        <motion.div
          className="rounded-3xl border border-[#d7e3f5] bg-white/90 p-6 shadow-card sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex -space-x-2">
                  {avatars.map((name, index) => (
                    <span
                      key={name}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#dce8ff] to-[#b9d4ff] text-[0.73rem] font-bold text-brandDark"
                      style={{ zIndex: avatars.length - index }}
                    >
                      {name}
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-[0.9rem] font-semibold text-[#6078a1]">Loved by creator teams in 42 countries</p>
                  <p className="mt-1 text-[0.82rem] text-[#7890b4]">Trusted by coaches, agencies, and digital educators.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbe6f8] bg-[#f6f9ff] px-4 py-3">
              <p className="flex items-center gap-1 text-sm font-semibold text-brandDark">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={14} className="fill-[#fdbf38] text-[#fdbf38]" />
                ))}
                4.9/5 from 2,400+ reviews
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {logos.map((logo, index) => (
              <motion.div
                key={logo}
                className="rounded-xl border border-[#dbe7f9] bg-white px-4 py-3 text-center text-[0.85rem] font-semibold tracking-[0.03em] text-[#5474a3]"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                {logo}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
