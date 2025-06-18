import { Link } from "react-router";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "./ui/sidebar";
import { Sidebar } from "./ui/sidebar";
import { Button } from "./ui/button";

export default function AiContextSidebar() {
  return (
    <Sidebar side="right">
      <SidebarTrigger />
      <SidebarHeader>
        <span>AI Context</span>
        <span>This is what the AI understands about this chat</span>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-2">
          <span>System Prompt</span>
          <span>Chat Traits</span>
          <span>Messages</span>
          <span>Summary</span>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <Button>Copy Full Context</Button>
      </SidebarFooter>
    </Sidebar>
  );
}
