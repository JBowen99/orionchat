import { useSettings } from "~/contexts/settings-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ALL_MODELS, DEFAULT_MODEL_ID, MODELS_BY_PROVIDER } from "~/lib/models";
import { useEffect, useState } from "react";
import { Star, StarOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

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

  const favoriteModels = preferences.favorite_models || [];

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

  const toggleFavorite = async (modelId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const currentFavorites = preferences.favorite_models || [];
    const isFavorite = currentFavorites.includes(modelId);

    let newFavorites: string[];
    if (isFavorite) {
      newFavorites = currentFavorites.filter((id) => id !== modelId);
    } else {
      newFavorites = [...currentFavorites, modelId];
    }

    await updatePreferences({ favorite_models: newFavorites });
  };

  const getFavoriteModels = () => {
    return ALL_MODELS.filter((model) => favoriteModels.includes(model.id));
  };

  const getModelsByProvider = () => {
    const modelsByProvider: Record<string, typeof ALL_MODELS> = {};

    // Group non-favorite models by provider
    ALL_MODELS.forEach((model) => {
      if (!favoriteModels.includes(model.id)) {
        const providerName =
          model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
        if (!modelsByProvider[providerName]) {
          modelsByProvider[providerName] = [];
        }
        modelsByProvider[providerName].push(model);
      }
    });

    return modelsByProvider;
  };

  const renderStarIcon = (modelId: string) => {
    const isFavorite = favoriteModels.includes(modelId);
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 mr-2 hover:bg-transparent"
        onClick={(e) => toggleFavorite(modelId, e)}
      >
        {isFavorite ? (
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="h-3 w-3 text-muted-foreground hover:text-yellow-400" />
        )}
      </Button>
    );
  };

  const truncateDescription = (description: string, maxLength: number = 50) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  };

  const getSelectedModelName = () => {
    const model = ALL_MODELS.find((m) => m.id === selectedModel);
    return model?.name || selectedModel;
  };

  return (
    <div className={className}>
      <Select value={selectedModel} onValueChange={handleValueChange}>
        <SelectTrigger className="border-none text-muted-foreground">
          <SelectValue placeholder="Select a model">
            {getSelectedModelName()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* Favorites Section */}
          {favoriteModels.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Favorites
              </div>
              {getFavoriteModels().map((model) => (
                <SelectItem key={`favorite-${model.id}`} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    {renderStarIcon(model.id)}
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.provider} •{" "}
                        {truncateDescription(model.description)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
              <Separator className="my-1" />
            </>
          )}

          {/* Models grouped by provider */}
          {Object.entries(getModelsByProvider()).map(
            ([providerName, models]) => (
              <div key={providerName}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {providerName}
                </div>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      {renderStarIcon(model.id)}
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {truncateDescription(model.description)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
