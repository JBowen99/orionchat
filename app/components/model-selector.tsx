import { useSettings } from "~/contexts/settings-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ALL_MODELS, DEFAULT_MODEL_ID } from "~/lib/models";
import { useEffect, useState } from "react";

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export default function ModelSelector({
  value,
  onValueChange,
  className,
}: ModelSelectorProps) {
  const { preferences, updatePreferences } = useSettings();
  const [selectedModel, setSelectedModel] = useState(
    value || preferences.default_model || DEFAULT_MODEL_ID
  );

  // Update local state when props change
  useEffect(() => {
    if (value && value !== selectedModel) {
      setSelectedModel(value);
    }
  }, [value]);

  // Update local state when preferences change
  useEffect(() => {
    if (
      !value &&
      preferences.default_model &&
      preferences.default_model !== selectedModel
    ) {
      setSelectedModel(preferences.default_model);
    }
  }, [preferences.default_model, value]);

  const handleValueChange = async (newValue: string) => {
    setSelectedModel(newValue);

    // Call parent's onValueChange if provided
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      // Otherwise, update the default model in preferences
      await updatePreferences({ default_model: newValue });
    }
  };

  return (
    <div className={className}>
      <Select value={selectedModel} onValueChange={handleValueChange}>
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
