// Minimal React-like library for ft_transcendence
// Supports JSX/TSX, props, custom hooks, and component composition

const debug = false; //activates/deactivates HRm debugging messages

// --- Navigation Types and Context ---
type NavigationContextType = {
  currentPath: string;
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  goBack: () => void;
  goForward: () => void;
};

// Initialize with default values that will be overridden by Router
const NavigationContext = createContext<NavigationContextType>({
  currentPath: "/",
  navigate: () => {},
  goBack: () => {},
  goForward: () => {},
});

// Export NavigationContext and types for external use
export { NavigationContext, type NavigationContextType };

// Hook to access navigation functions
export function useNavigate() {
  const context = useContext(NavigationContext);
  return context.navigate;
}

// Router component to provide navigation context
export function Router({ children }: { children: any }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      resetHooks(); // clear state when browser nav changes
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    resetHooks(); // clear hooks before navigating to new page
    setCurrentPath(to);

    // Dispatch routechange event for compatibility with existing listeners
    window.dispatchEvent(
      new CustomEvent("routechange", { detail: { path: to } })
    );
  }, []);

  const contextValue: NavigationContextType = {
    currentPath,
    navigate,
    goBack: () => window.history.back(),
    goForward: () => window.history.forward(),
  };

  return createElement(
    NavigationContext.Provider,
    { value: contextValue },
    children
  );
}

// Link component for client-side navigation
type LinkProps = {
  to: string;
  children?: any;
  className?: string;
  [key: string]: any;
};

export function Link({
  to,
  children,
  onClick,
  className = "",
  ...props
}: LinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Call the passed onClick handler if it exists
    if (onClick) {
      onClick(e);
    }

    navigate(to);
  };

  return createElement(
    "a",
    {
      href: to,
      onClick: handleClick,
      className,
      ...props,
    },
    children
  );
}

// --- Context API ---
interface ContextType<T = any> {
  Provider: (props: { value: T; children?: any }) => any;
  _currentValue: T;
}

export function createContext<T>(defaultValue: T): ContextType<T> {
  const context: ContextType<T> = {
    _currentValue: defaultValue,
    Provider: ({ value, children }) => {
      context._currentValue = value;
      return children;
    },
  };
  return context;
}

export function useContext<T>(context: ContextType<T>): T {
  return context._currentValue;
}

// --- Core Types and Components ---

export type VNode = {
  type: string | Function;
  props: Record<string, any>;
  children: any[];
};

// Fragment component for JSX fragments
export function Fragment({ children }: { children?: any }): any {
  return children;
}

// Helper to identify source location objects (dev-only)
function isSourceLocObj(obj: any) {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    "fileName" in obj &&
    "lineNumber" in obj &&
    "columnNumber" in obj
  );
}

// Helper to identify renderable values
function isValidChild(child: any) {
  return (
    child !== undefined &&
    child !== null &&
    child !== false &&
    child !== true &&
    !isSourceLocObj(child)
  );
}

export function createElement(
  type: any,
  props: Record<string, any>,
  ...children: any[]
): VNode {
  // 1. Flatten the children array
  const flattenedChildren = children.flat();

  // 2. Filter out invalid children (null, undefined, booleans, source location objects)
  const validChildren = flattenedChildren.filter(isValidChild);

  // 3. Create the vnode with clean children
  return {
    type,
    props: props || {},
    children: validChildren,
  };
}

// --- Hooks Implementation ---

export function useSearchParams() {
  const search = window.location.search;
  const params = new URLSearchParams(search);

  // Return an object with a get method for better compatibility
  return {
    get: (key: string): string | null => {
      return params.get(key);
    },
    set: (newParams: URLSearchParams) => {
      const newSearch = newParams.toString();
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}?${newSearch}`
      );
    },
  };
}

export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const ref = useRef<{ callback: T; deps: any[] }>({ callback, deps });

  if (!areDepsEqual(ref.current.deps, deps)) {
    ref.current = { callback, deps };
  }

  return ref.current.callback;
}

export function useRef<T>(initialValue: T): { current: T } {
  // Use a ref to store the value across renders
  const ref = Object.seal({
    current: initialValue,
  });
  return ref;
}

/**
 * Internal state array for useState hook.
 * Each call to useState gets a unique slot per render.
 */
let state: any[] = [];
let stateOwner: string[] = []; // tracks which component owns each state slot
let stateIndex = 0;

let memos: Array<{ value: any; deps: any[] | undefined }> = [];
let memoIndex = 0;

// Track last rendered vnode and container for HMR
let lastVnode: VNode | null = null;
let lastContainer: HTMLElement | null = null;

/**
 * useState hook for functional components.
 * Supports functional updates: setState(fn) where fn receives previous state.
 * @param initial Initial state value
 * @returns [state, setState] tuple
 */
export function useState<T>(
  initial: T
): [T, (v: T | ((prev: T) => T)) => void] {
  const currentIndex = stateIndex;
  const owner = currentComponentId;
  if (stateOwner[currentIndex] !== owner) {
    // new component instance owns this slot, initialize
    state[currentIndex] = initial;
    stateOwner[currentIndex] = owner;
  }
  if (debug) {
    console.log(
      `useState called for component: ${
        currentComponentName || "unknown"
      }, index: ${currentIndex}, state array length: ${state.length}`
    );
  }
  const stateValue = state[currentIndex];
  const setState = (newVal: T | ((prev: T) => T)) => {
    if (debug) {
      console.log(
        `setState called at index: ${currentIndex}, new value:`,
        newVal
      );
    }
    if (typeof newVal === "function") {
      const updateFn = newVal as (prev: T) => T;
      state[currentIndex] = updateFn(state[currentIndex]);
    } else {
      state[currentIndex] = newVal;
    }
    if (debug) {
      console.log("State updated, triggering re-render");
    }
    if (lastVnode && lastContainer) {
      // Create a new vnode to ensure diff algorithm recognizes the change
      const newVnode = { ...lastVnode };
      render(newVnode, lastContainer);
    }
  };
  stateIndex++;
  return [stateValue, setState];
}

// --- useEffect implementation ---
/**
 * Internal effect array for useEffect hook.
 * Each call to useEffect gets a unique slot per render.
 */
let effects: Array<{
  deps: any[] | undefined;
  cleanup: (() => void) | void;
  effect: () => void | (() => void);
  hasRun: boolean;
  componentId: string; // Track which component owns this effect
}> = [];
let effectIndex = 0;
let isRenderingComponent = false;
let pendingEffects: Array<(typeof effects)[0]> = [];

/**
 * Compare two dependency arrays for equality (shallow)
 * @param oldDeps Previous dependencies array
 * @param newDeps New dependencies array
 * @returns True if dependencies are equal
 */
function areDepsEqual(
  oldDeps: any[] | undefined,
  newDeps: any[] | undefined
): boolean {
  // If either is undefined, they're only equal if both are undefined
  if (oldDeps === undefined || newDeps === undefined) {
    return oldDeps === newDeps;
  }

  // Different lengths means not equal
  if (oldDeps.length !== newDeps.length) {
    return false;
  }

  // Compare each item
  for (let i = 0; i < newDeps.length; i++) {
    // Using Object.is for proper equality check (like React)
    if (!Object.is(oldDeps[i], newDeps[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Run all pending effects that were collected during rendering
 */
function runPendingEffects(): void {
  // Clean up and run all pending effects
  for (const effect of pendingEffects) {
    // Run cleanup from previous render if it exists
    if (effect.cleanup && typeof effect.cleanup === "function") {
      try {
        effect.cleanup();
      } catch (error) {
        console.error("[minireact] Error in useEffect cleanup:", error);
      }
    }

    // Run the effect and store any returned cleanup function
    try {
      effect.cleanup = effect.effect();
      effect.hasRun = true;
    } catch (error) {
      console.error("[minireact] Error in useEffect:", error);
    }
  }

  // Clear the pending effects after running them
  pendingEffects = [];
}

/**
 * React-like useEffect hook
 * Runs side effects after render and handles cleanup
 * @param effect Effect callback (optionally returns cleanup)
 * @param deps Dependency array
 */
export function useEffect(effect: () => void | (() => void), deps?: any[]) {
  if (!isRenderingComponent) {
    console.warn(
      "[minireact] useEffect called outside of component render function"
    );
    return;
  }

  const currentEffectIndex = effectIndex++;

  // If we don't have this effect slot yet, initialize it
  if (!effects[currentEffectIndex]) {
    if (debug)
      console.log(
        "[minireact] Creating new effect for component:",
        currentComponentId
      );
    effects[currentEffectIndex] = {
      deps: undefined,
      cleanup: undefined,
      effect,
      hasRun: false,
      componentId: currentComponentId,
    };
  }

  const currentEffect = effects[currentEffectIndex];
  const oldDeps = currentEffect.deps;

  // Update effect and deps
  currentEffect.effect = effect;
  currentEffect.deps = deps;

  // Determine if we need to run this effect
  const shouldRunEffect =
    // Always run if it hasn't run before
    !currentEffect.hasRun ||
    // No deps means run every time
    deps === undefined ||
    // Run if deps changed
    !areDepsEqual(oldDeps, deps);

  if (shouldRunEffect) {
    // Queue the effect to run after the render is complete
    pendingEffects.push(currentEffect);

    // Register the effect's cleanup with the component cleanup system
    registerComponentCleanup(() => {
      if (
        currentEffect.cleanup &&
        typeof currentEffect.cleanup === "function"
      ) {
        if (debug)
          console.log(
            "[minireact] Running cleanup for effect in component:",
            currentComponentId
          );
        currentEffect.cleanup();
      }
    });
  }
}

// Helper to run cleanup functions for all existing effects
function cleanupAllEffects() {
  for (const eff of effects) {
    if (eff && typeof eff.cleanup === "function") {
      try {
        eff.cleanup();
      } catch (error) {
        console.error("[minireact] Error during effect cleanup:", error);
      }
    }
  }
}

// Utility to clear all hook data – useful when navigating to entirely new page
export function resetHooks() {
  // Ensure any active effects are cleaned up before resetting
  cleanupAllEffects();

  state = [];
  stateOwner = [];
  effects = [];
  memos = [];
  stateIndex = 0;
  effectIndex = 0;
  memoIndex = 0;
}

// --- Additional didactic hooks ---
export function useMemo<T>(factory: () => T, deps?: any[]): T {
  const index = memoIndex++;
  if (!memos[index]) {
    memos[index] = { value: factory(), deps };
    return memos[index].value as T;
  }
  const memo = memos[index];
  if (!areDepsEqual(memo.deps, deps)) {
    memo.value = factory();
    memo.deps = deps;
  }
  return memo.value as T;
}

export function useReducer<R, A>(
  reducer: (state: R, action: A) => R,
  initialState: R
): [R, (action: A) => void] {
  const [stateValue, setStateValue] = useState<R>(initialState);
  const dispatch = (action: A) => {
    setStateValue(prev => reducer(prev, action));
  };
  return [stateValue, dispatch];
}

export function useImperativeHandle<T>(
  ref: { current: T | null },
  create: () => T,
  deps?: any[]
) {
  useEffect(() => {
    ref.current = create();
    return () => {
      // cleanup: clear the reference on unmount
      ref.current = null;
    };
  }, deps);
}

// Simple array helper hook
export function useArray<T>(initial: T[] = []): [
  T[],
  {
    push: (item: T) => void;
    remove: (index: number) => void;
    set: (arr: T[]) => void;
  }
] {
  const [arr, setArr] = useState<T[]>(initial);
  return [
    arr,
    {
      push: item => setArr(prev => [...prev, item]),
      remove: index => setArr(prev => prev.filter((_, i) => i !== index)),
      set: setArr,
    },
  ];
}

export function useFetch<T = any>(
  url: string,
  options?: RequestInit,
  deps: any[] = []
): { data: T | null; error: any; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(url, options)
      .then(r => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then(json => {
        if (isMounted) setData(json as T);
      })
      .catch(err => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      // component unmount
      isMounted = false;
    };
  }, [url, ...deps]);

  return { data, error, loading };
}

let globalIdCounter = 0;
export function useId(prefix = "id"): string {
  const idRef = useRef<string>(`${prefix}-${++globalIdCounter}`);
  return idRef.current;
}

// --- Simple Component-Based Cleanup System ---
// Track cleanup functions by component ID instead of DOM nodes
const componentCleanups = new Map<string, Set<() => void>>();
// Track which component ID is associated with each DOM node
const nodeToComponentId = new WeakMap<Node, string>();

/**
 * Register a cleanup function for the current component
 */
export function registerComponentCleanup(cleanup: () => void) {
  if (!currentComponentId) {
    console.warn(
      "[minireact] registerComponentCleanup called outside component render"
    );
    return;
  }

  if (!componentCleanups.has(currentComponentId)) {
    componentCleanups.set(currentComponentId, new Set());
  }

  componentCleanups.get(currentComponentId)!.add(cleanup);
  if (debug)
    console.log(
      "[minireact] Registered cleanup for component:",
      currentComponentId
    );
}

/**
 * Associate a DOM node with a component ID
 */
export function associateNodeWithComponent(node: Node, componentId: string) {
  nodeToComponentId.set(node, componentId);
  if (debug)
    console.log(
      "[minireact] Associated node",
      node.nodeName,
      "with component:",
      componentId
    );
}

/**
 * Clean up all functions for a component associated with a DOM node
 */
export function cleanupNodeComponent(node: Node) {
  const componentId = nodeToComponentId.get(node);
  if (debug)
    console.log(
      "[minireact] cleanupNodeComponent called for node:",
      node.nodeName,
      "componentId:",
      componentId
    );
  if (componentId) {
    cleanupComponent(componentId);
    // Also recursively check child nodes
    if (node.childNodes) {
      node.childNodes.forEach(child => cleanupNodeComponent(child));
    }
  }
}

/**
 * Clean up all functions for a specific component
 */
export function cleanupComponent(componentId: string) {
  const cleanups = componentCleanups.get(componentId);
  if (cleanups) {
    if (debug)
      console.log(
        "[minireact] Cleaning up component:",
        componentId,
        "with",
        cleanups.size,
        "cleanup functions"
      );
    cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error("[minireact] Error during component cleanup:", error);
      }
    });
    componentCleanups.delete(componentId);
  }
}

// --- Rendering ---
// Import diffing system
import { initRenderer, diff, commitRoot } from "./diff";

// Global render function reference
let _renderFn: (vnode: any, depth?: number) => Node = _render; // Default to _render

// Make diffing system available globally for HMR
if (typeof window !== "undefined") {
  (window as any).__minireact_diff__ = { initRenderer, diff, commitRoot };
}

// Track the current root vnode
let _currentRoot: any = null;

// Initialize the diffing system with the base render function
initRenderer(_render);

export function render(vnode: VNode, container: HTMLElement) {
  if (debug) console.log("[minireact] Rendering vnode:", vnode);

  // Store the current vnode and container for HMR updates
  lastVnode = vnode;
  lastContainer = container;

  // Reset hook indices before rendering
  stateIndex = 0;
  effectIndex = 0;
  memoIndex = 0;

  // Clear pending effects
  pendingEffects = [];

  // Mark that we're rendering a component
  isRenderingComponent = true;

  // Initialize render function if not already set
  if (!_renderFn) {
    _renderFn = (vnode: any, depth: number = 0): Node => {
      if (depth > 100) {
        throw new Error(`Max recursion depth reached: ${depth}`);
      }

      // Handle primitive types
      if (vnode === null || vnode === undefined || typeof vnode === "boolean") {
        return document.createTextNode("");
      }

      if (typeof vnode === "string" || typeof vnode === "number") {
        return document.createTextNode(String(vnode));
      }

      // Handle arrays
      if (Array.isArray(vnode)) {
        const frag = document.createDocumentFragment();
        for (const child of vnode) {
          if (!isRenderable(child)) continue;
          frag.appendChild(_render(child, depth + 1));
        }
        return frag;
      }

      // Handle vnode objects
      if (typeof vnode === "object") {
        if (vnode.type === undefined) {
          throw new Error("Invalid vnode: missing type property");
        }

        // Handle fragments
        if (vnode.type === Fragment) {
          const frag = document.createDocumentFragment();
          if (Array.isArray(vnode.children)) {
            for (const child of vnode.children) {
              if (!isRenderable(child)) continue;
              frag.appendChild(_render(child, depth + 1));
            }
          }
          return frag;
        }

        // Handle function components
        if (typeof vnode.type === "function") {
          pushComponentId(vnode.type.name + "@d" + depth); // simple id using name+depth
          currentComponentName = vnode.type.name || "Anonymous";
          if (debug) {
            console.log(
              `Rendering function component with depth: ${depth}, component: ${currentComponentName}`
            );
          }
          // Note: Do NOT reset stateIndex/effectIndex here; they are managed globally per render cycle

          const componentProps = { ...vnode.props, children: vnode.children };
          const rendered = vnode.type(componentProps);
          const renderedDOM = _render(rendered, depth + 1);

          // Associate the rendered DOM with this component ID for cleanup
          if (renderedDOM && currentComponentId) {
            associateNodeWithComponent(renderedDOM, currentComponentId);
          }

          popComponentId();

          return renderedDOM;
        }

        // Handle DOM elements
        const SVG_NS = "http://www.w3.org/2000/svg";
        const SVG_TAGS = [
          "svg",
          "path",
          "circle",
          "rect",
          "line",
          "ellipse",
          "polygon",
          "polyline",
          "g",
          "text",
        ];
        const isSVG = SVG_TAGS.includes(vnode.type);
        const dom = isSVG
          ? document.createElementNS(SVG_NS, vnode.type as string)
          : document.createElement(vnode.type as string);

        // Set initial props
        const props = vnode.props || {};
        for (const [k, v] of Object.entries(props)) {
          if (k === "children") continue;

          if (k.startsWith("on") && typeof v === "function") {
            const eventName = k.toLowerCase().substring(2);
            dom.addEventListener(eventName, v as EventListener);
          } else if (k === "className") {
            (dom as HTMLElement).setAttribute("class", String(v));
          } else if (
            k === "style" &&
            v &&
            typeof v === "object" &&
            !Array.isArray(v)
          ) {
            Object.assign((dom as HTMLElement).style, v);
          } else if (
            k === "dangerouslySetInnerHTML" &&
            v &&
            typeof v === "object" &&
            v !== null &&
            "__html" in v
          ) {
            (dom as HTMLElement).innerHTML = String((v as any).__html);
          } else if (v === true) {
            (dom as HTMLElement).setAttribute(k, "");
          } else if (v !== false && v !== null && v !== undefined) {
            (dom as HTMLElement).setAttribute(k, String(v));
          }
        }

        // Render children
        if (props.children) {
          const children = Array.isArray(props.children)
            ? props.children
            : [props.children];
          for (const child of children) {
            if (!isRenderable(child)) continue;
            dom.appendChild(_render(child, depth + 1));
          }
        }

        // Associate the DOM node with the current component ID
        associateNodeWithComponent(dom, currentComponentId);

        return dom;
      }

      throw new Error("Invalid vnode: " + JSON.stringify(vnode));
    };

    // Initialize the renderer with our render function
    initRenderer(_renderFn);
  }

  // Use diffing for updates, direct render for initial render
  if (_currentRoot) {
    if (debug) console.log("[minireact] Using diff for update");
    diff(container, _currentRoot, vnode);
    commitRoot();
  } else {
    if (debug)
      console.log("[minireact] Using direct render (first time or reset)");
    // Clean up existing nodes before clearing container
    if (container.firstChild) {
      if (debug)
        console.log("[minireact] Cleaning up existing DOM before fresh render");
      const existingNodes = Array.from(container.childNodes);
      existingNodes.forEach(node => cleanupNodeComponent(node));
    }
    container.innerHTML = "";
    const dom = _renderFn(vnode);
    container.appendChild(dom);
  }

  // Update the current root
  _currentRoot = vnode;
  (_currentRoot as any)._dom = container.firstChild as Node;

  // Done rendering components
  isRenderingComponent = false;

  // Schedule effects to run asynchronously (React behavior)
  setTimeout(() => {
    runPendingEffects();
  }, 0);
}

// update function is just for enabling HMR for minireact in dev
export function update() {
  if (!lastVnode || !lastContainer) return;

  // Clear the container and re-render
  while (lastContainer.firstChild) {
    lastContainer.removeChild(lastContainer.firstChild);
  }

  // Clear the diffing state
  commitRoot();

  // Re-render with the last vnode
  render(lastVnode, lastContainer);
}

// HMR Support
if (typeof import.meta !== "undefined" && import.meta.hot) {
  const hot = import.meta.hot;

  hot.dispose(() => {
    if (debug) console.log("[minireact] Disposing module for HMR");
    // Clean up effects and state before HMR update
    cleanupAllEffects();
    resetHooks();
  });

  hot.accept(() => {
    if (debug) console.log("[minireact] HMR accepted, updating application");
    // Trigger a re-render with the current state
    if (lastVnode && lastContainer) {
      update();
    }
  });
}

// Utility function for checking renderable children in _render
function isRenderable(child: any) {
  return (
    typeof child === "string" ||
    typeof child === "number" ||
    (typeof child === "object" &&
      child &&
      ("type" in child || Array.isArray(child)))
  );
}

let currentComponentName: string | undefined;
let componentIdStack: string[] = [];
let currentComponentId = "";

function pushComponentId(id: string) {
  componentIdStack.push(currentComponentId);
  currentComponentId = id;
}

function popComponentId() {
  currentComponentId = componentIdStack.pop() || "";
}

function _render(vnode: any, depth: number = 0): Node {
  if (depth > 100) {
    throw new Error(`Max recursion depth reached: ${depth}`);
  }
  if (debug) {
    console.log(`Rendering vnode with depth: ${depth}, type: ${vnode.type}`);
  }
  if (vnode === null || vnode === undefined || typeof vnode === "boolean") {
    return document.createTextNode("");
  }
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }
  if (Array.isArray(vnode)) {
    const frag = document.createDocumentFragment();
    for (const child of vnode) {
      if (!isRenderable(child)) continue;
      frag.appendChild(_render(child, depth + 1));
    }
    return frag;
  }
  if (typeof vnode === "object") {
    if (vnode.type === undefined) {
      throw new Error(
        "Invalid vnode: missing type property. Vnode: " + JSON.stringify(vnode)
      );
    }

    // Handle fragments
    if (vnode.type === Fragment) {
      const frag = document.createDocumentFragment();
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          if (!isRenderable(child)) continue;
          frag.appendChild(_render(child, depth + 1));
        }
      }
      return frag;
    }

    // Handle function components
    if (typeof vnode.type === "function") {
      pushComponentId(vnode.type.name + "@d" + depth); // simple id using name+depth
      currentComponentName = vnode.type.name || "Anonymous";
      if (debug) {
        console.log(
          `Rendering function component with depth: ${depth}, component: ${currentComponentName}`
        );
      }
      // Note: Do NOT reset stateIndex/effectIndex here; they are managed globally per render cycle

      const componentProps = { ...vnode.props, children: vnode.children };
      const rendered = vnode.type(componentProps);
      const renderedDOM = _render(rendered, depth + 1);

      // Associate the rendered DOM with this component ID for cleanup
      if (renderedDOM && currentComponentId) {
        associateNodeWithComponent(renderedDOM, currentComponentId);
      }

      popComponentId();

      return renderedDOM;
    }

    // DOM element or SVG element
    const SVG_NS = "http://www.w3.org/2000/svg";
    const SVG_TAGS = [
      "svg",
      "path",
      "circle",
      "rect",
      "line",
      "ellipse",
      "polygon",
      "polyline",
      "g",
      "text",
    ];
    const el = SVG_TAGS.includes(vnode.type)
      ? document.createElementNS(SVG_NS, vnode.type as string)
      : document.createElement(vnode.type as string);

    for (const [k] of Object.entries(vnode.props || {})) {
      if (k === "children") continue;

      if (k.startsWith("on") && typeof vnode.props[k] === "function") {
        const eventName = k.toLowerCase().substring(2);
        el.addEventListener(eventName, vnode.props[k]);
      } else if (k === "className") {
        el.setAttribute("class", String(vnode.props[k]));
      } else if (typeof vnode.props[k] === "boolean") {
        if (vnode.props[k]) el.setAttribute(k, "");
        else el.removeAttribute(k);
      } else {
        const attrName =
          k === "viewBox"
            ? "viewBox"
            : k.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
        el.setAttribute(attrName, String(vnode.props[k]));
      }
    }

    const children = vnode.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (!isRenderable(child)) continue;
        el.appendChild(_render(child, depth + 1));
      }
    } else if (
      children !== undefined &&
      children !== null &&
      typeof children !== "boolean"
    ) {
      el.appendChild(_render(children, depth + 1));
    }

    // // Handle autoFocus after attributes applied
    // if (vnode.props && vnode.props.autoFocus) {
    //   setTimeout(() => {
    //     (el as HTMLElement).focus();
    //   }, 0);
    // }

    // Associate the DOM node with the current component ID
    associateNodeWithComponent(el, currentComponentId);

    return el;
  }

  throw new Error("Invalid vnode: " + JSON.stringify(vnode));
}

// --- For SSR/SSG: renderToString (WIP) ---
export function renderToString(vnode: any): string {
  if (typeof vnode === "string" || typeof vnode === "number") {
    return String(vnode);
  }
  if (typeof vnode.type === "function") {
    return renderToString(
      vnode.type({ ...vnode.props, children: vnode.children })
    );
  }
  const props = vnode.props || {};
  const attrs = Object.entries(props)
    .filter(([k]) => !k.startsWith("on") && k !== "children")
    .map(([k]) => ` ${k}="${String(props[k])}"`)
    .join("");
  const children = vnode.children.flat().map(renderToString).join("");
  return `<${vnode.type}${attrs}>${children}</${vnode.type}>`;
}

// --- Usage ---
// import { createElement, useState, render } from './lib/minireact.ts';
// function App() { ... }
// render(<App />, document.getElementById('root'));

/**
 * Hook for cleanup that runs when component unmounts or when dependencies change
 * This is a workaround for proper component lifecycle management
 */
export function useUnmountEffect(cleanup: () => void, deps?: any[]) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current = cleanup;

    // Return cleanup function that will be called when effect is cleaned up
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, deps);

  // Also provide a manual cleanup method for edge cases
  return () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  };
}

/**
 * Hook that detects when a component might be unmounting
 * Components can use this to trigger their own cleanup
 */
export function useComponentWillUnmount(callback: () => void) {
  const callbackRef = useRef(callback);
  const hasCleanedUp = useRef(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Set up cleanup detection
  useEffect(() => {
    return () => {
      if (!hasCleanedUp.current) {
        hasCleanedUp.current = true;
        callbackRef.current();
      }
    };
  }, []);
}
