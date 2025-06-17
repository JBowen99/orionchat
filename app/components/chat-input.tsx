import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ArrowUp, Globe, Paperclip, SendIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";
export default function ChatInput() {
  return (
    <div className="chat-input-area flex flex-col items-center pt-2 px-2 justify-center w-1/2 rounded-t-xl">
      <div className="chat-input-area flex flex-col w-full py-2 px-2 rounded-t-lg gap-2">
        <div className="flex flex-row items-center justify-center w-full gap-2">
          <Textarea className="scrollbar-hide resize-none min-h-[1rem] max-h-52 py-2 px-3 text-sm md:text-base focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-border" />
        </div>
        <div className="flex flex-row items-center justify-start w-full gap-2">
          Model Select
          <Button variant="ghost" className="w-7 h-7">
            <Globe />
          </Button>
          <Button variant="ghost" className="w-7 h-7">
            <Paperclip />
          </Button>
          <Button
            size="icon"
            className="w-8 h-8 ml-auto  bg-primary hover:bg-primary/90"
          >
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  );
}
