import "./globals.css";

export const metadata = {
  title: "MeetScheduling | Build high-converting pages faster",
  description: "Premium creator commerce platform for pages, products, and campaigns.",
  icons: {
    icon: "/assets/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-page text-ink antialiased">{children}</body>
    </html>
  );
}
