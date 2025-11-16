import logoUfrgs from "@/assets/logo-ufrgs.png";
import logoPpglet from "@/assets/logo-ppglet.png";
import logoVersoAustral from "@/assets/logo-versoaustral.png";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-2 border-primary bg-background shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-6">
        <div className="h-20 w-auto flex-shrink-0">
          <img 
            src={logoUfrgs} 
            alt="UFRGS Logo" 
            className="h-full w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
        
        <div className="h-24 w-auto flex-shrink-0">
          <img 
            src={logoVersoAustral} 
            alt="VersoAustral Logo" 
            className="h-full w-auto object-contain"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Link to="/dashboard-mvp">
              Ver Demonstração
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Link to="/devops-metrics">
              <BarChart3 className="h-4 w-4" />
              DevOps
            </Link>
          </Button>
        </div>

        <div className="h-20 w-auto flex-shrink-0">
          <img 
            src={logoPpglet} 
            alt="PPGLET Logo" 
            className="h-full w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
