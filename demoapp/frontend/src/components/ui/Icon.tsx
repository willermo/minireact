import { createElement } from "@minireact";
import type { VNode } from "@minireact";
import { icons } from "lucide";

interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
  [key: string]: any;
}

// Convert kebab-case (e.g. "trash-2") to PascalCase (e.g. "Trash2")
function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

/**
 * Dynamic Icon component built from lucide icons data.
 */
export function Icon({
  name,
  size = 24,
  color = "currentColor",
  className = "",
  ...props
}: IconProps): VNode | null {
  const key = toPascalCase(name);
  const def = (icons as Record<string, any>)[key] as Array<[string, Record<string, any>]>
  if (!Array.isArray(def)) {
    console.warn(`Icon "${name}" not found in lucide icons.`)
    return null
  }

  // Build SVG props merging default lucide attributes and overrides
  const svgProps: Record<string, any> = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    className,
    ...props,
  }

  // Create children VNodes
  const vnodes = def.map(([childTag, childAttrs]) =>
    createElement(childTag, childAttrs)
  )

  return createElement("svg", svgProps, ...vnodes)
}
