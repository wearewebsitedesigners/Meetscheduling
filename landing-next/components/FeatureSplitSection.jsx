import Image from "next/image";
import Container from "@/components/Container";

const bullets = [
  "Conversation timeline synced with meetings",
  "Context cards for each booking stage",
  "Automated reminders and summaries",
];

export default function FeatureSplitSection() {
  return (
    <section className="section-pad">
      <Container className="grid items-stretch gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-[clamp(1.8rem,3.2vw,2.75rem)] leading-[1.08] tracking-[-0.02em]">
            <mark className="rounded-lg bg-mintSoft px-1 text-inherit">Redefining</mark> Conversations and
            <mark className="ml-1 rounded-lg bg-mintSoft px-1 text-inherit">Enhancing</mark> User experience
          </h2>

          <p className="mt-4 max-w-[520px] text-base leading-relaxed text-muted">
            Align booking, reminders, and customer communication in one polished flow. Your team gets better context,
            and customers get faster responses.
          </p>

          <ul className="mt-4 grid gap-2">
            {bullets.map((item) => (
              <li key={item} className="relative pl-5 text-[0.92rem] text-[#49546d] before:absolute before:left-1 before:top-0 before:text-[#00c57a] before:content-['•']">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#afeecf] bg-[linear-gradient(180deg,#d7ffea_0%,#bcf7de_100%)] p-4 shadow-card">
          <Image src="/assets/chat-preview.svg" alt="Conversation preview" width={740} height={590} className="h-auto w-full" />
        </div>
      </Container>
    </section>
  );
}
