import { SidebarTrigger } from "./ui/sidebar";

import { cn } from "~/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { ThemeToggle } from "./ui/theme-toggle";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router";

export default function FloatingButtons() {
  const { state, isMobile, openMobile } = useSidebar();

  // On mobile, show when mobile sidebar is closed
  // On desktop, show when sidebar is collapsed
  const shouldShow = isMobile ? !openMobile : state === "collapsed";

  return (
    <div
      className={cn(
        "fixed top-3 left-4 z-50 flex items-center space-x-2 bg-background border rounded-lg p-1 shadow-lg transition-all duration-300 ease-in-out backdrop-blur-sm",
        shouldShow
          ? "opacity-100 translate-x-0 pointer-events-auto scale-100"
          : "opacity-0 translate-x-[-100%] pointer-events-none scale-95"
      )}
    >
      <div className="transition-transform duration-200 ease-in-out hover:scale-105">
        <SidebarTrigger />
      </div>
      <div className="transition-transform duration-200 ease-in-out hover:scale-105">
        <ThemeToggle />
      </div>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 transition-all duration-200 ease-in-out hover:scale-105"
      >
        <Link to="/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}
