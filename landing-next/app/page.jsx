import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SocialProofSection from "@/components/SocialProofSection";
import AllInOneSection from "@/components/AllInOneSection";
import EditorDemoSection from "@/components/EditorDemoSection";
import BenefitsSection from "@/components/BenefitsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <div id="top" className="relative overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed -left-32 top-20 -z-10 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(33,89,210,0.22),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-28 top-[18%] -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(35,180,255,0.22),transparent_64%)]"
      />

      <Header />
      <main>
        <HeroSection />
        <SocialProofSection />
        <AllInOneSection />
        <EditorDemoSection />
        <BenefitsSection />
        <TestimonialsSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  );
}
