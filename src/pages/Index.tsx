import { useRef } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import EmailCaptureSection from "@/components/EmailCaptureSection";
import { createLogger } from "@/lib/loggerFactory";

const log = createLogger('Index');

const Index = () => {
  log.info('Landing page loaded');
  const emailSectionRef = useRef<HTMLDivElement>(null);

  const scrollToEmailCapture = () => {
    log.logUserInteraction('scroll_to_email_capture', 'button_click');
    emailSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-[240px]">
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
