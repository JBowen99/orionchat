import { useSettings } from "~/contexts/settings-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { ALL_MODELS, DEFAULT_MODEL_ID } from "~/lib/models";
import { useState } from "react";

export default function ModelSelector() {
  const { preferences, updatePreferences } = useSettings();
  const [selectedModel, setSelectedModel] = useState(
    preferences.default_model || DEFAULT_MODEL_ID
  );

  return (
    <div>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="border-none text-muted-foreground">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {ALL_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
