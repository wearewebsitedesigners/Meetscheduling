import Container from "@/components/Container";
import { Button } from "@/components/Button";

export default function AutomationSection() {
  return (
    <section className="section-pad">
      <Container className="grid items-center gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#e0e4ed] bg-white p-5 shadow-card lg:order-2">
          <p className="inline-flex min-h-[26px] items-center rounded-full bg-[#e5fff1] px-3 text-[0.72rem] font-extrabold uppercase tracking-[0.04em] text-[#0b6a47]">
            Automation
          </p>
          <h3 className="mt-3 text-[clamp(1.45rem,2.4vw,2.1rem)] leading-[1.12] tracking-[-0.02em]">
            A single dashboard for meetings, tasks, and customer context.
          </h3>
          <p className="mt-3 max-w-[520px] text-base leading-relaxed text-muted">
            Create clean handoff workflows between sales and support, with all records attached to each meeting.
          </p>
          <Button href="/pricing" variant="dark" className="mt-4">
            Explore plans
          </Button>
        </div>

        <div>
          <h2 className="text-[clamp(1.55rem,2.9vw,2.35rem)] leading-[1.12] tracking-[-0.02em]">
            Intelligent scheduling workflows for modern revenue teams
          </h2>
          <p className="mt-3 max-w-[540px] text-base leading-relaxed text-muted">
            Replace disconnected tools with one operational layer that covers scheduling, follow-ups, and conversion
            insights.
          </p>
          <Button href="/pricing" variant="ghost" className="mt-4">
            See how it works
          </Button>
        </div>
      </Container>
    </section>
  );
}
