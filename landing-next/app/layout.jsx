import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["500", "700", "800"],
});

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
      <body className={`${manrope.variable} ${sora.variable} bg-page text-ink antialiased`}>{children}</body>
    </html>
  );
}
