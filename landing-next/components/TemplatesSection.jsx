import Container from "@/components/Container";
import { Button } from "@/components/Button";

const templates = [
  { label: "Onboarding Call", title: "Ready template" },
  { label: "Quick Demo", title: "Sales template" },
  { label: "Client Review", title: "Success template" },
  { label: "Team Standup", title: "Internal template" },
];

export default function TemplatesSection() {
  return (
    <section id="product" className="section-pad">
      <Container className="grid items-start gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <h2 className="text-[clamp(2.1rem,4vw,3.35rem)] leading-[1.02] tracking-[-0.025em]">
            Use <mark className="rounded-lg bg-mintSoft px-1 text-inherit">templates</mark>
            <br />
            to get started
            <br />
            your project
          </h2>
          <p className="mt-3 max-w-[390px] text-base leading-relaxed text-muted">
            Pick pre-built workflows for onboarding, sales calls, and support handoffs.
          </p>
          <Button href="/signup" variant="dark" className="mt-5">
            Start now
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((item) => (
            <article
              key={item.title}
              className="grid min-h-[140px] gap-2 rounded-[16px] border border-[#dde3ef] bg-[#f8f9fd] p-4"
            >
              <p className="text-[0.82rem] font-semibold text-[#6b7590]">{item.label}</p>
              <strong className="text-[1.07rem] font-bold tracking-[-0.02em]">{item.title}</strong>
              <a
                href="/signup"
                className="mt-auto inline-flex min-h-9 items-center justify-center rounded-full bg-[#111827] text-[0.82rem] font-extrabold text-white"
              >
                Use this
              </a>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
