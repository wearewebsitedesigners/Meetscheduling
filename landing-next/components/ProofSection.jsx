import Container from "@/components/Container";

const items = [
  {
    quote: "We replaced scattered tools with one predictable CRM flow for meetings.",
    by: "Founder, Service Studio",
  },
  {
    quote: "The automation saved hours each week and improved response times.",
    by: "Ops Manager, Growth Team",
  },
  {
    quote: "Simple UI, reliable routing, and a cleaner client experience.",
    by: "Sales Lead, SaaS Company",
  },
];

export default function ProofSection() {
  return (
    <section id="about" className="section-pad border-y border-[#e2e4dd] bg-[#f1f5fb]">
      <Container>
        <h2 className="mx-auto max-w-[820px] text-center text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          Businesses love consistency around booking and follow-up
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.quote} className="grid gap-2 rounded-[18px] border border-[#e0e4ef] bg-white p-4">
              <p className="text-[0.9rem] tracking-[0.08em] text-[#00c57a]">★★★★★</p>
              <p className="text-[0.9rem] leading-relaxed text-[#303a50]">“{item.quote}”</p>
              <span className="text-[0.8rem] text-[#77839e]">{item.by}</span>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
