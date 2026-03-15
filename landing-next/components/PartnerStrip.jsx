import Container from "@/components/Container";

const partners = ["CoLab", "Ada Lite", "SalesDesk", "Stride AI", "AppFlow"];

export default function PartnerStrip() {
  return (
    <section className="border-y border-[#dde5f2] bg-[#edf3fb]">
      <Container className="flex min-h-[92px] flex-wrap items-center justify-center gap-3 py-4 md:justify-between">
        {partners.map((item) => (
          <span
            key={item}
            className="inline-flex min-h-9 items-center rounded-full border border-[#d6dfed] bg-[rgba(255,255,255,0.82)] px-4 text-[0.86rem] font-extrabold tracking-[0.02em] text-[#71809b]"
          >
            {item}
          </span>
        ))}
      </Container>
    </section>
  );
}
