import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useApiKeys } from "~/contexts/api-keys-context";
import { getAvailableProviders } from "~/lib/models";
import type { Provider } from "~/contexts/api-keys-context";

interface AddApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddApiKeyModal({ open, onOpenChange }: AddApiKeyModalProps) {
  const [provider, setProvider] = useState<Provider | "">("");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setApiKey: saveApiKey } = useApiKeys();

  // Get available providers from models.ts
  const availableProviders = getAvailableProviders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !apiKey.trim()) return;

    setIsSubmitting(true);
    try {
      await saveApiKey(provider, apiKey.trim(), label.trim() || undefined);
      // Reset form
      setProvider("");
      setApiKey("");
      setLabel("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save API key:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setProvider("");
      setApiKey("");
      setLabel("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add API Key</DialogTitle>
          <DialogDescription>
            Add an API key for an AI provider to access their models.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as Provider)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.description} • {p.modelCount} model
                        {p.modelCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              type="text"
              placeholder="Custom label for this key..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !provider || !apiKey.trim()}
            >
              {isSubmitting ? "Adding..." : "Add API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
