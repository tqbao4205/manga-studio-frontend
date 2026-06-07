import { ChevronDown } from "lucide-react";
import { cn } from "../../../shared/utils";

export function TaskFilterDropdown({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
  active,
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
          active
            ? "border-primary/40 bg-primary/10 font-bold text-primary"
            : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
        )}
      >
        <span>
          {selectedOption ? `${label}: ${selectedOption.label}` : label}
        </span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[80] min-w-[220px] overflow-hidden rounded-xl border border-outline-variant/35 bg-surface-container shadow-2xl shadow-black/30">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-surface-container-highest text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      On
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
