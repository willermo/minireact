# Minireact Guide: Custom React-like Framework

## Overview

Minireact is a custom, lightweight React-like framework built specifically for the transcendence project. It provides JSX support, functional components, hooks and virtual DOM diffing.

**Location:** `frontend/src/lib/minireact/`

**Core Files:**

- `minireact.ts` - Main framework implementation (1,139 lines)
- `diff.ts` - Virtual DOM diffing algorithm (670 lines)
- `store/index.ts` - Redux-like global state management (414 lines)

## TypeScript Configuration

Minireact requires specific TypeScript configuration to work with JSX:

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "./src/lib/minireact"
  }
}
```

## Basic Component Structure

```typescript
import { createElement, useState } from "../lib/minireact/minireact.ts";

function MyComponent({ title }: { title: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  );
}
```

## Hooks Implementation

### useState Hook - Deep Implementation Analysis

**Function Signature:**

```typescript
export function useState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void];
```

#### Global State Management Architecture (Lines 237-239)

```typescript
let state: any[] = [];
let stateOwner: string[] = []; // tracks which component owns each state slot
let stateIndex = 0;
```

**Critical Design Decisions:**

- **Global State Array**: All component state is stored in a single global array
- **Component Ownership**: `stateOwner` array tracks which component owns each state slot
- **Index-Based Access**: `stateIndex` provides deterministic slot allocation

#### useState Implementation Deep Dive (Lines 254-296)

**Phase 1: State Slot Allocation**

```typescript
const currentIndex = stateIndex;
const owner = currentComponentId;
if (stateOwner[currentIndex] !== owner) {
  // new component instance owns this slot, initialize
  state[currentIndex] = initial;
  stateOwner[currentIndex] = owner;
}
```

**Slot Ownership Logic:**

- **Index Capture**: Current `stateIndex` is captured before increment
- **Ownership Check**: Compares current component ID with slot owner
- **Initialization**: Only initializes state if component doesn't own the slot
- **Ownership Transfer**: New components can take over abandoned slots

**Critical Insight**: This design allows component instances to be destroyed and recreated while maintaining state continuity.

**Phase 2: State Value Retrieval**

```typescript
const stateValue = state[currentIndex];
```

**Simple but Crucial**: Direct array access provides O(1) state retrieval.

**Phase 3: setState Function Creation**

```typescript
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
```

**setState Advanced Features:**

1. **Functional Updates**:

   - Detects function vs. value updates using `typeof`
   - Functional updates receive previous state as argument
   - Prevents stale closure issues in async scenarios

2. **Re-render Triggering**:

   - Creates new vnode object to ensure diff algorithm detects changes
   - Uses cached `lastVnode` and `lastContainer` from render function
   - Shallow clone `{ ...lastVnode }` forces object identity change

3. **Closure Capture**:
   - `currentIndex` is captured in closure, maintaining reference to specific state slot
   - Each setState function is permanently bound to its state slot

**Phase 4: Index Increment and Return**

```typescript
stateIndex++;
return [stateValue, setState];
```

**Hook Order Enforcement**: Index increment ensures next useState call gets next slot.

#### useState Performance Characteristics

**Time Complexity:**

- **State Access**: O(1) - Direct array indexing
- **State Update**: O(n) - Triggers full re-render where n = component tree size
- **Functional Update**: O(1) - Single function call overhead

**Space Complexity:**

- **Per Component**: O(k) where k = number of useState calls
- **Global**: O(c\*k) where c = number of component instances

**Memory Management:**

- **State Persistence**: State survives component unmount/remount cycles
- **Cleanup**: No automatic cleanup - relies on component ownership transfer
- **Memory Leaks**: Possible if components are destroyed without ownership transfer

#### Critical useState Behaviors

**Hook Order Dependency:**

```typescript
// Correct - same order every render
function MyComponent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  return (
    <div>
      {count} - {name}
    </div>
  );
}

// Incorrect - conditional hooks break order
function BadComponent({ showName }) {
  const [count, setCount] = useState(0);
  if (showName) {
    const [name, setName] = useState(""); // Breaks hook order!
  }
  return <div>{count}</div>;
}
```

**State Batching Behavior:**

- **No Automatic Batching**: Each setState triggers immediate re-render
- **Synchronous Updates**: State updates are applied immediately
- **Re-render Timing**: Re-renders are synchronous, unlike React's async batching

**Functional Update Advantages:**

```typescript
// Safe from stale closures
const increment = () => setCount(prev => prev + 1);

// Potentially stale in async scenarios
const increment = () => setCount(count + 1);
```

#### useState vs React Differences

**Key Differences:**

1. **No Batching**: Minireact triggers immediate re-renders
2. **Global State Array**: React uses fiber-based state storage
3. **Component Ownership**: Minireact allows state slot reuse
4. **Synchronous Updates**: React batches updates asynchronously
5. **No Concurrent Features**: No time slicing or priority scheduling

### useEffect Hook - Deep Implementation Analysis

**Function Signature:**

```typescript
export function useEffect(effect: () => void | (() => void), deps?: any[]);
```

#### Effect Management Architecture (Lines 303-312)

```typescript
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
```

**Effect Storage Design:**

- **Global Effects Array**: All effects stored in single global array
- **Component Ownership**: Each effect tracks its owning component via `componentId`
- **Execution State**: `hasRun` flag prevents duplicate initial runs
- **Batching Queue**: `pendingEffects` collects effects to run after render

#### useEffect Implementation Deep Dive (Lines 379-440)

**Phase 1: Render Context Validation**

```typescript
if (!isRenderingComponent) {
  console.warn(
    "[minireact] useEffect called outside of component render function"
  );
  return;
}
```

**Critical Safety Check**: Prevents effects from being registered outside render cycles, maintaining hook order consistency.

**Phase 2: Effect Slot Allocation**

```typescript
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
```

**Effect Slot Management:**

- **Index-Based Allocation**: Similar to useState, uses global index for deterministic slots
- **Lazy Initialization**: Effect slots created only when first accessed
- **Component Association**: Each effect permanently linked to creating component
- **Initial State**: New effects start with `hasRun: false` and no dependencies

**Phase 3: Effect Update and Dependency Comparison**

```typescript
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
```

**Sophisticated Execution Logic:**

1. **First Run**: Effects always run on initial render (`!currentEffect.hasRun`)
2. **No Dependencies**: `deps === undefined` means run every render
3. **Dependency Change**: Deep comparison via `areDepsEqual()` function

**Phase 4: Effect Scheduling and Cleanup Registration**

```typescript
if (shouldRunEffect) {
  // Queue the effect to run after the render is complete
  pendingEffects.push(currentEffect);

  // Register the effect's cleanup with the component cleanup system
  registerComponentCleanup(() => {
    if (currentEffect.cleanup && typeof currentEffect.cleanup === "function") {
      if (debug)
        console.log(
          "[minireact] Running cleanup for effect in component:",
          currentComponentId
        );
      currentEffect.cleanup();
    }
  });
}
```

**Dual Cleanup System:**

- **Effect Batching**: Effects queued in `pendingEffects` for post-render execution
- **Component Cleanup**: Cleanup functions registered with component lifecycle system
- **Safety Checks**: Type checking ensures cleanup is callable before execution

#### Dependency Comparison Algorithm (Lines 320-343)

```typescript
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
```

**Advanced Equality Checking:**

- **Undefined Handling**: Distinguishes between no deps and empty deps array
- **Length Comparison**: Quick rejection for different array lengths
- **Object.is Comparison**: Uses same equality semantics as React
- **Shallow Comparison**: Only compares array elements, not deep object properties

#### Effect Execution System (Lines 348-371)

```typescript
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
```

**Effect Execution Pipeline:**

1. **Cleanup First**: Previous cleanup functions run before new effects
2. **Error Isolation**: Try-catch blocks prevent one effect from breaking others
3. **Cleanup Capture**: Return values from effects become cleanup functions
4. **State Tracking**: `hasRun` flag updated after successful execution
5. **Queue Clearing**: `pendingEffects` reset for next render cycle

#### useEffect Performance Characteristics

**Time Complexity:**

- **Registration**: O(1) - Direct array access and assignment
- **Dependency Comparison**: O(d) where d = dependency array length
- **Effect Execution**: O(e) where e = number of pending effects
- **Cleanup**: O(c) where c = number of cleanup functions

**Space Complexity:**

- **Per Effect**: O(d) for dependency array storage
- **Global**: O(n\*e) where n = components, e = effects per component

**Memory Management:**

- **Cleanup Tracking**: Automatic cleanup function storage and execution
- **Component Association**: Effects tied to component lifecycle
- **Error Recovery**: Graceful handling of effect and cleanup errors

#### Critical useEffect Behaviors

**Effect Timing:**

```typescript
// Effects run asynchronously after DOM updates
setTimeout(() => {
  runPendingEffects();
}, 0);
```

**Dependency Array Patterns:**

```typescript
// Run once on mount
useEffect(() => {
  console.log("Component mounted");
}, []);

// Run on every render
useEffect(() => {
  console.log("Every render");
}); // No dependency array

// Run when specific values change
useEffect(() => {
  console.log("Count changed:", count);
}, [count]);

// Cleanup pattern
useEffect(() => {
  const timer = setInterval(() => console.log("tick"), 1000);
  return () => clearInterval(timer); // Cleanup function
}, []);
```

**Common Pitfalls:**

```typescript
// ❌ Missing dependencies can cause stale closures
useEffect(() => {
  console.log(count); // May be stale if count not in deps
}, []); // Should include [count]

// ❌ Object/array dependencies need careful handling
const obj = { a: 1 };
useEffect(() => {
  // This will run every render because obj is recreated
}, [obj]); // Should use useMemo or move obj outside component

// ✅ Correct dependency management
useEffect(() => {
  console.log(count);
}, [count]); // Include all used values
```

#### useEffect vs React Differences

**Key Differences:**

1. **Synchronous Cleanup**: Minireact runs cleanup immediately before new effects
2. **Global Effect Storage**: React uses fiber-based effect storage
3. **No Effect Priorities**: React has different effect priorities (layout vs passive)
4. **Error Boundaries**: React has more sophisticated error handling
5. **Concurrent Features**: React can interrupt and resume effects

### useRef Hook

**Function Signature:**

```typescript
export function useRef<T>(initialValue: T): { current: T };
```

**Implementation (lines 225-231):**

```typescript
export function useRef<T>(initialValue: T): { current: T } {
  // Use a ref to store the value across renders
  const ref = Object.seal({
    current: initialValue,
  });
  return ref;
}
```

### useCallback Hook

**Function Signature:**

```typescript
export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T;
```

**Implementation (lines 212-223):**

```typescript
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
```

### useSearchParams Hook

**Function Signature:**

```typescript
export function useSearchParams(): {
  get: (key: string) => string | null;
  set: (newParams: URLSearchParams) => void;
};
```

**Implementation (lines 190-210):**

```typescript
export function useSearchParams() {
  const searchParams = new URLSearchParams(window.location.search);

  return {
    get: (key: string) => {
      return searchParams.get(key);
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
```

## Rendering System

### Core Render Function - Deep Dive

**Function Signature:**

```typescript
export function render(vnode: VNode, container: HTMLElement);
```

#### Render Function Flow (Lines 677-870)

The main `render` function orchestrates the entire rendering process through several critical phases:

**Phase 1: Setup and State Management**

```typescript
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
```

**Critical Details:**

- **Hook Index Reset**: Every render cycle resets `stateIndex`, `effectIndex`, and `memoIndex` to 0. This ensures hooks are called in the same order every render.
- **Effect Batching**: `pendingEffects` array is cleared to collect new effects that will run after DOM updates.
- **HMR Support**: `lastVnode` and `lastContainer` are cached for Hot Module Replacement during development.
- **Render Flag**: `isRenderingComponent` prevents hooks from being called outside render cycles.

**Phase 2: Render Strategy Decision**

```typescript
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
    const existingNodes = Array.from(container.childNodes);
    existingNodes.forEach(node => cleanupNodeComponent(node));
  }
  container.innerHTML = "";
  const dom = _renderFn(vnode);
  container.appendChild(dom);
}
```

**Critical Rendering Decision:**

- **First Render**: If `_currentRoot` is null, performs direct DOM creation via `_renderFn`
- **Subsequent Renders**: Uses virtual DOM diffing algorithm for efficient updates
- **Cleanup**: Before direct renders, existing DOM nodes are cleaned up to prevent memory leaks

**Phase 3: Post-Render Cleanup**

```typescript
// Update the current root
_currentRoot = vnode;
(_currentRoot as any)._dom = container.firstChild as Node;

// Done rendering components
isRenderingComponent = false;

// Schedule effects to run asynchronously (React behavior)
setTimeout(() => {
  runPendingEffects();
}, 0);
```

**Effect Scheduling**: Effects run asynchronously after DOM updates, matching React's behavior.

### Internal \_render Function - Complete Analysis (Lines 932-1063)

The `_render` function is the core DOM creation engine with sophisticated type handling:

#### Depth Protection and Debugging

```typescript
function _render(vnode: any, depth: number = 0): Node {
  if (depth > 100) {
    throw new Error(`Max recursion depth reached: ${depth}`);
  }
  if (debug) {
    console.log(`Rendering vnode with depth: ${depth}, type: ${vnode.type}`);
  }
```

**Recursion Safety**: Hard limit of 100 levels prevents infinite recursion from malformed component trees.

#### Primitive Value Handling

```typescript
if (vnode === null || vnode === undefined || typeof vnode === "boolean") {
  return document.createTextNode("");
}
if (typeof vnode === "string" || typeof vnode === "number") {
  return document.createTextNode(String(vnode));
}
```

**Text Node Creation**: All primitive values become text nodes. Booleans and null/undefined render as empty text nodes.

#### Array Processing (Fragment Behavior)

```typescript
if (Array.isArray(vnode)) {
  const frag = document.createDocumentFragment();
  for (const child of vnode) {
    if (!isRenderable(child)) continue;
    frag.appendChild(_render(child, depth + 1));
  }
  return frag;
}
```

**Fragment Creation**: Arrays are converted to DocumentFragments, allowing multiple children without wrapper elements.

**Renderability Check**: `isRenderable()` filters out invalid children:

```typescript
function isRenderable(child: any) {
  return (
    typeof child === "string" ||
    typeof child === "number" ||
    (typeof child === "object" &&
      child &&
      ("type" in child || Array.isArray(child)))
  );
}
```

#### Function Component Processing

```typescript
if (typeof vnode.type === "function") {
  pushComponentId(vnode.type.name + "@d" + depth);
  currentComponentName = vnode.type.name || "Anonymous";

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
```

**Component ID Management**:

- **Stack-based IDs**: `pushComponentId()` and `popComponentId()` maintain a stack for nested components
- **Unique Identification**: Component IDs use format `ComponentName@d{depth}` for uniqueness
- **Cleanup Association**: `associateNodeWithComponent()` links DOM nodes to components for lifecycle management

**Props Merging**: Component props and children are merged into a single props object before function invocation.

#### DOM Element Creation - Advanced Processing

```typescript
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
```

**SVG Support**: Automatic detection of SVG elements and creation with proper namespace.

#### Attribute and Event Handler Processing

```typescript
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
```

**Sophisticated Attribute Handling:**

- **Event Handlers**: Props starting with "on" become event listeners
- **className Mapping**: React-style className becomes HTML class attribute
- **Boolean Attributes**: True values create empty attributes, false removes them
- **Attribute Name Conversion**: camelCase props convert to kebab-case attributes
- **Special Cases**: viewBox maintains exact casing for SVG compatibility

#### Children Rendering

```typescript
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
```

**Recursive Child Processing**:

- **Array Children**: Each child is recursively rendered and appended
- **Single Child**: Non-array children are handled individually
- **Filtering**: Invalid children (undefined, null, boolean) are skipped

#### Component Association and Cleanup

```typescript
// Associate the DOM node with the current component ID
associateNodeWithComponent(el, currentComponentId);
return el;
```

**Memory Management**: Every DOM node is associated with its creating component for proper cleanup during unmounting.

### Render Function Performance Characteristics

**Time Complexity**: O(n) where n is the number of nodes in the virtual DOM tree
**Space Complexity**: O(d) where d is the maximum depth of the component tree (due to recursion stack)
**Memory Management**: Automatic cleanup association prevents memory leaks
**Error Handling**: Graceful degradation with detailed error messages for debugging

## Virtual DOM Diffing

The diffing algorithm in `diff.ts` implements efficient DOM updates:

### Diff Function

**Function Signature:**

```typescript
export function diff(
  oldVNode: VNode | null,
  newVNode: VNode | null,
  container: Element,
  index: number = 0
): void;
```

### Effect Types

**From `diff.ts`:**

```typescript
interface Effect {
  type: "PLACEMENT" | "UPDATE" | "DELETION";
  vnode?: VNode;
  domNode?: Node;
  container: Element;
  index?: number;
  propsToUpdate?: Record<string, any>;
  propsToRemove?: string[];
}
```

### Props Diffing

**Function Signature:**

```typescript
function diffProps(
  oldProps: any,
  newProps: any
): {
  propsToUpdate: Record<string, any>;
  propsToRemove: string[];
};
```

## Routing System

### Router Component

**From `minireact.ts`:**

```typescript
export function Router({ children }: { children: any }) {
  // Provides NavigationContext to child components
  // Handles route changes and history management
}
```

### Navigation

**useNavigate Hook:**

```typescript
export function useNavigate(): (path: string) => void;
```

**Link Component:**

```typescript
export function Link({ to, children, ...props }: LinkProps) {
  // Renders anchor tag with client-side navigation
  // Prevents default browser navigation
  // Uses useNavigate internally
}
```

## Component Lifecycle Management

### Mounted Components Tracking

**From `minireact.ts`:**

```typescript
const mountedComponents = new Set<string>();

export function registerMountedComponent(componentId: string): void;
export function unregisterMountedComponent(componentId: string): void;
export function cleanupUnmountedComponentsEffects(): void;
```

### Effect Cleanup System

**Cleanup Registry (WeakMap-based):**

```typescript
const cleanupRegistry = new WeakMap<Node, (() => void)[]>();

export function registerCleanupForNode(node: Node, cleanup: () => void): void;
export function cleanupNodeAndSubtree(node: Node): void;
```

**Component-Level Hooks:**

```typescript
export function useComponentWillUnmount(callback: () => void): void;
export function useUnmountEffect(cleanup: () => void, deps?: any[]): void;
```

## Server-Side Rendering

**renderToString Function:**

```typescript
export function renderToString(vnode: VNode): string;
```

**Implementation (from `minireact.ts`):**

```typescript
export function renderToString(vnode: VNode): string {
  // Handle primitives
  if (typeof vnode === "string" || typeof vnode === "number") {
    return String(vnode);
  }

  // Handle function components
  if (typeof vnode === "function") {
    const rendered = vnode({});
    return renderToString(rendered);
  }

  // Handle DOM elements with attributes and children
  // Returns HTML string
}
```

## Global State Management

The store system (`store/index.ts`) provides Redux-like state management:

### Store API

**Core Functions:**

```typescript
export function getState(): AppState;
export function dispatch(action: Action): void;
export function subscribe(listener: () => void): () => void;
export function useSelector<T>(selector: (state: AppState) => T): T;
```

**Async Actions:**

```typescript
export const userActions = {
  fetchProfile: () => Promise<void>,
  updateProfile: (data: Partial<UserProfile>) => Promise<void>,
  logout: () => Promise<void>,
};
```

## Best Practices

### Form Handling Pattern

**Critical: Use `useRef` for form data, `useState` only for UI states**

```typescript
// ✅ Correct approach
function MyForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Use useState only for UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const formData = {
      name: nameRef.current?.value,
      email: emailRef.current?.value,
    };
    // Process form data
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} type="text" />
      <input ref={emailRef} type="email" />
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

**Why this pattern is necessary:**

- Form inputs using `useState` can cause component re-renders that reset form values
- Select dropdowns may not maintain selected values due to re-rendering issues
- `useRef` provides stable references that persist across renders

## Usage in the Transcendence Project

Minireact is used throughout the frontend for:

- All page components (`frontend/src/pages/`)
- UI components and layouts
- Form handling with the ref-based pattern
- Global state management via the store
- Client-side routing for the single-page application

The framework integrates with:

- Vite for development and building
- TypeScript for type safety
- Tailwind CSS for styling
- The custom store for state management
