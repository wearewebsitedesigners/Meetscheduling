import Container from "@/components/Container";

const footerColumns = [
  {
    title: "Product",
    links: ["Landing Builder", "Checkout", "Email Campaigns", "Automation"],
  },
  {
    title: "Features",
    links: ["Templates", "A/B Testing", "Analytics", "CRM Integrations"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Creator Guides", "API", "Help Center"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Partners"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies"],
  },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[#d7e2f4] bg-white/85 py-12">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-1">
            <p className="text-lg font-bold text-brandDark">MeetScheduling</p>
            <p className="mt-2 text-sm leading-relaxed text-[#5f7092]">
              Premium creator platform for building pages, offers, and campaigns.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-bold text-brandDark">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[0.88rem] text-[#61749c] transition hover:text-brandDark">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-[#e0e8f7] pt-5 text-sm text-[#7288b0]">
          © {new Date().getFullYear()} MeetScheduling. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
