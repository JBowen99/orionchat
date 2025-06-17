import React, { useState, useRef, type KeyboardEvent } from "react";
import { Input } from "./input";
import { Badge } from "./badge";
import { Button } from "./button";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";

interface TraitInputProps {
  traits: string[];
  onTraitsChange: (traits: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  "concise",
  "detailed",
  "creative",
  "analytical",
  "friendly",
  "professional",
  "casual",
  "technical",
  "empathetic",
  "direct",
  "patient",
  "humorous",
  "formal",
  "supportive",
  "curious",
];

export function TraitInput({
  traits,
  onTraitsChange,
  placeholder = "Type a trait and press Enter or Tab...",
  suggestions = DEFAULT_SUGGESTIONS,
  className,
}: TraitInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !traits.includes(suggestion)
  );

  const addTrait = (trait: string) => {
    const trimmedTrait = trait.trim();
    if (trimmedTrait && !traits.includes(trimmedTrait)) {
      onTraitsChange([...traits, trimmedTrait]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTrait = (traitToRemove: string) => {
    onTraitsChange(traits.filter((trait) => trait !== traitToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTrait(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && traits.length > 0) {
      removeTrait(traits[traits.length - 1]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTrait(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2.5rem] bg-background">
        {traits.map((trait) => (
          <Badge
            key={trait}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {trait}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 w-4 h-4 hover:bg-transparent"
              onClick={() => removeTrait(trait)}
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={traits.length === 0 ? placeholder : ""}
          className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto flex-1 min-w-[120px]"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="border rounded-md bg-popover p-2 shadow-md">
          <div className="text-xs text-muted-foreground mb-2">Suggestions:</div>
          <div className="flex flex-wrap gap-1">
            {filteredSuggestions.slice(0, 10).map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
