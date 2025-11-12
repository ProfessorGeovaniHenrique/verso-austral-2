import logoUfrgs from "@/assets/logo-ufrgs.png";
import logoPpglet from "@/assets/logo-ppglet.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="h-12 w-auto">
          <img 
            src={logoUfrgs} 
            alt="UFRGS Logo" 
            className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="h-12 w-auto">
          <img 
            src={logoPpglet} 
            alt="PPGLET Logo" 
            className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
