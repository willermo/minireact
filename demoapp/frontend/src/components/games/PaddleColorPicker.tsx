// ColorPicker.tsx
import { createElement } from "@minireact";

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  label?: string;
  className?: string;
}

export default function PaddleColorPicker({
  color,
  onColorChange,
  label = "Paddle Color",
  className = "",
}: ColorPickerProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={color}
          onInput={(e: Event) => {
            const target = e.target as HTMLInputElement;
            onColorChange(target.value);
          }}
          className="h-10 w-16 rounded border border-gray-600"
        />
        <span className="text-sm themed-text-secondary">Click to change</span>
      </div>
    </div>
  );
}
