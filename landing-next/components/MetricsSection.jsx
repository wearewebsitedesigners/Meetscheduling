import Container from "@/components/Container";
import { Button } from "@/components/Button";

const items = [
  { title: "AI Workflows", copy: "Automate repetitive scheduling tasks instantly." },
  { title: "Smart Routing", copy: "Send inbound leads to the right team in seconds." },
  { title: "Integrated CRM", copy: "Keep customer context attached to every booking." },
  { title: "Scalability", copy: "Grow from solo workflows to enterprise teams." },
  { title: "Insights", copy: "Track conversion, no-show patterns, and response time." },
  { title: "Automation", copy: "Trigger reminders, follow-ups, and handoffs automatically." },
];

export default function MetricsSection() {
  return (
    <section id="resources" className="section-pad">
      <Container>
        <div className="rounded-[30px] border border-[#1e3559] bg-[linear-gradient(135deg,#081226_0%,#0f1f3a_56%,#173159_100%)] p-[clamp(1.35rem,3.8vw,2.4rem)] text-center text-[#ecf6ff]">
          <h2 className="mx-auto max-w-[800px] text-[clamp(1.55rem,2.9vw,2.45rem)] leading-[1.12] tracking-[-0.02em]">
            Advanced analytics and insights to make your business smarter
          </h2>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[rgba(185,215,255,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                <strong className="block text-[1.04rem] font-bold leading-tight tracking-[-0.01em]">{item.title}</strong>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[#b8cfe6]">{item.copy}</p>
              </article>
            ))}
          </div>

          <Button href="/signup" variant="mint" className="mt-6">
            Get started
          </Button>
        </div>
      </Container>
    </section>
  );
}
