import React from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Loader2 } from "lucide-react";

interface ShareExpirationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExpiration: string;
  onExpirationChange: (value: string) => void;
  onConfirm: () => void;
  isSharing: boolean;
}

export function ShareExpirationModal({
  open,
  onOpenChange,
  selectedExpiration,
  onExpirationChange,
  onConfirm,
  isSharing,
}: ShareExpirationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Choose how long you want this shared conversation to be accessible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <Label htmlFor="expiration">Expiration Time</Label>
            <RadioGroup
              value={selectedExpiration}
              onValueChange={onExpirationChange}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="1day" />
                <Label htmlFor="1day" className="cursor-pointer">
                  1 day
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="7days" />
                <Label htmlFor="7days" className="cursor-pointer">
                  7 days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="30days" />
                <Label htmlFor="30days" className="cursor-pointer">
                  30 days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="never" />
                <Label htmlFor="never" className="cursor-pointer">
                  Never expires
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSharing}>
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Link...
              </>
            ) : (
              "Create Share Link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 