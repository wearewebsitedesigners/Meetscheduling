import Image from "next/image";
import Container from "@/components/Container";
import { Button } from "@/components/Button";

const links = [
  { label: "Product", href: "#platform" },
  { label: "Editor", href: "#editor" },
  { label: "Customers", href: "#testimonials" },
  { label: "Pricing", href: "#cta" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-[rgba(247,250,255,0.86)] backdrop-blur-xl">
      <Container className="flex min-h-[82px] items-center gap-5">
        <a href="#top" aria-label="MeetScheduling" className="inline-flex items-center">
          <Image src="/assets/scheduling-logo.svg" alt="MeetScheduling" width={201} height={32} className="h-[30px] w-auto" />
        </a>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-xl px-4 py-2 text-[0.92rem] font-semibold text-[#355081] transition hover:bg-[#edf3ff] hover:text-brandDark"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-2 hidden items-center gap-2 sm:flex">
          <Button href="#" variant="ghost" className="min-h-10 rounded-xl px-4">
            Log in
          </Button>
          <Button href="#cta" variant="primary" className="min-h-10 rounded-xl px-5">
            Start free
          </Button>
        </div>

        <Button href="#cta" variant="primary" className="ml-auto min-h-10 rounded-xl px-4 sm:hidden">
          Start
        </Button>
      </Container>
    </header>
  );
}
