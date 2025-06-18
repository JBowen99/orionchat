import { ArrowLeft, LogOut, User } from "lucide-react";
import { Link, Outlet, useNavigate, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { useUser } from "~/contexts/user-context";

export default function Settings() {
  const { user, loading: userLoading, signOut } = useUser();
  const navigate = useNavigate();
  const params = useParams();

  // Get current tab from URL params, default to 'account'
  const currentTab = params.category || "account";

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleTabChange = (value: string) => {
    navigate(`/settings/${value}`);
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-row items-center justify-center my-8 gap-2 w-full">
        <div className="flex flex-row items-center gap-2">
          <Link to="/chat">
            <Button variant="ghost" className="">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Chat</span>
            </Button>
          </Link>
        </div>
        <ThemeToggle className="ml-auto" />
        <Button variant="ghost" className="" onClick={handleSignOut}>
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>

      {/* Settings Container */}
      <div className="flex flex-row items-start justify-start gap-2 w-full">
        {/* Profile Info and Shortcuts Column */}
        <div className="w-1/4 flex flex-col items-center justify-center gap-12 px-2">
          <div className="flex flex-col items-center justify-center gap-2">
            <User className="w-24 h-24 mt-16" />
            <span className="text-sm">{user?.email}</span>
          </div>
          <div className="w-full flex flex-col items-start justify-center gap-4 bg-muted/50 p-4 rounded-lg">
            <h1 className="text-md font-bold">Message Usage</h1>
            <div className="flex flex-row items-start justify-between gap-2 w-full">
              <h2 className="text-xs">Standard Messages</h2>
              <span className="text-xs">0/20</span>
            </div>
            <Progress value={0} />
            <span className="text-xs">20 Messages Remaining</span>
          </div>
          <div className="w-full flex flex-col items-start justify-center gap-4 bg-muted/50 p-4 rounded-lg">
            <h1 className="text-md font-bold">Keyboard Shortcuts</h1>
            <div className="w-full flex flex-row items-center justify-between gap-2">
              <span className="text-xs">New Chat</span>
              <span className="text-xs text-foreground bg-muted-foreground/30 p-2 rounded-lg">
                Ctrl + K
              </span>
            </div>
            <div className="w-full flex flex-row items-center justify-between gap-2">
              <span className="text-xs">Search</span>
              <span className="text-xs text-foreground bg-muted-foreground/30 p-2 rounded-lg">
                Ctrl + Shift + O
              </span>
            </div>
            <div className="w-full flex flex-row items-center justify-between gap-2">
              <span className="text-xs">Toggle Sidebar</span>
              <span className="text-xs text-foreground bg-muted-foreground/30 p-2 rounded-lg">
                Ctrl + B
              </span>
            </div>
          </div>
        </div>

        {/* Settings Column */}
        <div className="w-3/4 flex flex-col items-start justify-center gap-2">
          <Tabs
            value={currentTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="customization">Customization</TabsTrigger>
              <TabsTrigger value="history">History & Sync</TabsTrigger>
              <TabsTrigger value="model">Models</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
            <Outlet />
          </Tabs>
        </div>
      </div>
    </div>
  );
}
