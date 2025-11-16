import { useRef } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import EmailCaptureSection from "@/components/EmailCaptureSection";

const Index = () => {
  const emailSectionRef = useRef<HTMLDivElement>(null);

  const scrollToEmailCapture = () => {
    emailSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-[200px]">
        <HeroSection onCtaClick={scrollToEmailCapture} />
        <HowItWorksSection />
        <BenefitsSection />
        <div ref={emailSectionRef}>
          <EmailCaptureSection />
        </div>
      </main>
    </div>
  );
};

export default Index;
