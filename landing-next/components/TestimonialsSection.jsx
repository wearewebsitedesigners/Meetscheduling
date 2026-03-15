"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import Container from "@/components/Container";

const testimonials = [
  {
    quote:
      "We rebuilt our launch page in one afternoon and crossed six figures in digital sales within two weeks.",
    name: "Ariana Lane",
    role: "Course Creator",
  },
  {
    quote:
      "The editor feels like a premium product. We can test, iterate, and publish without waiting on dev cycles.",
    name: "Rohit Malhotra",
    role: "Growth Lead, MentorStudio",
  },
  {
    quote: "Our conversion jumped from 3.2% to 8.7% after moving to the new page and checkout workflow.",
    name: "Nina Charles",
    role: "Founder, SkillHatch",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-pad">
      <Container>
        <motion.div
          className="mx-auto max-w-[760px] text-center"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
        >
          <p className="inline-flex rounded-full border border-[#d6e0f2] bg-white px-4 py-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-[#6d80a4]">
            Testimonials
          </p>
          <h2 className="mt-4 text-[clamp(1.75rem,3.2vw,2.7rem)] leading-[1.08] text-brandDark">
            Teams trust MeetScheduling to run high-converting launches
          </h2>
        </motion.div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.article
              key={item.name}
              className="rounded-3xl border border-[#dbe7f9] bg-white p-6 shadow-[0_10px_24px_rgba(15,45,115,0.08)]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.48, delay: index * 0.06 }}
              whileHover={{ y: -5 }}
            >
              <Quote size={20} className="text-brand" />
              <p className="mt-4 text-[0.97rem] leading-relaxed text-[#415577]">“{item.quote}”</p>
              <div className="mt-5">
                <p className="text-[0.95rem] font-bold text-brandDark">{item.name}</p>
                <p className="text-[0.8rem] text-[#6e84ab]">{item.role}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
