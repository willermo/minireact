import {
  VNode,
  createElement,
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
} from "./minireact";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element extends VNode {}
    interface ElementClass {}
    interface ElementAttributesProperty {}
  }
}

// Navigation types
export interface NavigationContextType {
  currentPath: string;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  goBack: () => void;
  goForward: () => void;
}

export function useNavigate(): (
  to: string,
  options?: { replace?: boolean; state?: any }
) => void;

export function Router(props: { children: any }): any;

export function Link(props: {
  to: string;
  children: any;
  className?: string;
  [key: string]: any;
}): any;

export function useSearchParams(): {
  get: (key: string) => string | null;
  set: (params: URLSearchParams) => void;
};
