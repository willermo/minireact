/**
 * Core diffing algorithm for minireact
 *
 * This module implements a virtual DOM diffing algorithm that efficiently updates the actual DOM
 * by comparing the previous and next virtual DOM trees and applying minimal changes.
 */

import type { VNode } from "./minireact";
import { cleanupNodeComponent } from "./minireact";

const debug = false;

/**
 * Key type for identifying nodes in lists
 */
type Key = string | number | null | undefined;

/**
 * Effect tags for tracking changes in the virtual DOM
 */
export const PLACEMENT = 1;
export const UPDATE = 2;
export const DELETION = 3;

type EffectTag = typeof PLACEMENT | typeof UPDATE | typeof DELETION;

/**
 * Extended VNode with internal properties used during diffing
 */
interface ExtendedVNode extends VNode {
  /** Reference to the actual DOM node */
  _dom?: Node;
  /** Index in the parent's children array */
  _index?: number;
  /** Reference to the component instance (for class components) */
  _component?: any;
  /** Key for efficient list updates */
  _key?: Key;
  /** Component ID for function components */
  _componentId?: string;
}

/**
 * Effect entry for batching DOM operations
 */
interface Effect {
  /** Type of effect (PLACEMENT, UPDATE, or DELETION) */
  type: EffectTag;
  /** The DOM node this effect applies to */
  node: Node;
  /** Parent DOM node */
  parent: Node;
  /** Reference node for insertion */
  beforeNode?: Node | null;
  /** New virtual node (for PLACEMENT/UPDATE) */
  newVNode?: ExtendedVNode;
  /** Old virtual node (for UPDATE/DELETION) */
  oldVNode?: ExtendedVNode;
}

// Global state for the diffing system
let deletions: Effect[] = [];
let effects: Effect[] = [];

// Internal render function reference
let _internalRender: (vnode: any, depth?: number) => Node;

// Check if two nodes are the same type
function isSameNodeType(
  oldVNode: ExtendedVNode,
  newVNode: ExtendedVNode
): boolean {
  return (
    oldVNode.type === newVNode.type &&
    (typeof oldVNode.type === "string" || oldVNode.type === newVNode.type)
  );
}

// Get the key from a vnode
function getKey(vnode: ExtendedVNode): Key {
  return vnode.props?.key;
}

// Create a map of keys to vnodes for efficient lookups
const createKeyMap = (children: ExtendedVNode[]): Map<Key, ExtendedVNode> => {
  const map = new Map<Key, ExtendedVNode>();
  children.forEach((child, index) => {
    if (!child) return;
    const key = getKey(child) ?? index;
    map.set(key, child);
  });
  return map;
};

export { createKeyMap }; // Export to avoid unused warning

// Diff the attributes/props of two vnodes
function diffProps(
  oldProps: any,
  newProps: any,
  dom: HTMLElement | SVGElement
) {
  // Remove old props
  Object.keys(oldProps).forEach(name => {
    if (name === "children") return;
    if (!(name in newProps)) {
      // Remove attribute
      if (name.startsWith("on")) {
        const eventName = name.toLowerCase().substring(2);
        dom.removeEventListener(eventName, oldProps[name]);
      } else if (name === "className") {
        dom.removeAttribute("class");
      } else {
        dom.removeAttribute(name);
      }
    }
  });

  // Add new/changed props
  Object.keys(newProps).forEach(name => {
    if (name === "children") return;
    const newValue = newProps[name];
    const oldValue = oldProps[name];

    if (name === "value" || name === "checked") {
      // Special handling for form elements
      (dom as any)[name] = newValue;
    } else if (name === "style") {
      // Handle style object
      const style = dom.style as any;
      if (typeof newValue === "string") {
        style.cssText = newValue;
      } else {
        if (typeof oldValue === "string") {
          style.cssText = "";
        }
        if (typeof newValue === "object") {
          Object.assign(style, newValue);
        }
      }
    } else if (name.startsWith("on")) {
      // Handle events
      const eventName = name.toLowerCase().substring(2);
      if (oldValue) {
        dom.removeEventListener(eventName, oldValue);
      }
      dom.addEventListener(eventName, newValue);
    } else if (name === "dangerouslySetInnerHTML") {
      // Handle raw HTML
      if (newValue && newValue.__html != null) {
        dom.innerHTML = newValue.__html;
      }
    } else if (name === "className") {
      dom.setAttribute("class", newValue);
    } else if (name === "ref") {
      // Handle refs
      if (typeof newValue === "function") {
        newValue(dom);
      } else if (newValue && typeof newValue === "object") {
        newValue.current = dom;
      }
    } else if (newValue == null || newValue === false) {
      // Remove attribute if value is null, undefined, or false
      dom.removeAttribute(name);
    } else {
      // Set regular attribute
      dom.setAttribute(name, newValue);
    }
  });
}

/**
 * Reconciles the children of a vnode by comparing old and new children and updating the DOM
 * @param parent The parent DOM element
 * @param oldChildren Array of old child vnodes
 * @param newChildren Array of new child vnodes
 * @throws {Error} If reconciliation fails or invalid nodes are encountered
 */
const reconcileChildren = (
  parent: HTMLElement | SVGElement,
  oldChildren: (ExtendedVNode | null | undefined)[] = [],
  newChildren: (ExtendedVNode | null | undefined)[] = []
): void => {
  if (!parent) {
    throw new Error("Parent element is required for reconciling children");
  }

  const oldKeyMap = new Map<Key, ExtendedVNode>();
  const newKeyMap = new Map<Key, ExtendedVNode>();
  const newIndexMap = new Map<Key, number>();

  // Filter out null/undefined children and validate
  const oldNodes = oldChildren.filter((child): child is ExtendedVNode => {
    if (child === null || child === undefined) return false;
    if (process.env.NODE_ENV !== "production" && !child.type) {
      console.warn("Encountered invalid vnode in old children:", child);
    }
    return true;
  });

  const currentNewNodes = newChildren.filter(
    (child): child is ExtendedVNode => {
      if (child === null || child === undefined) return false;
      if (process.env.NODE_ENV !== "production" && !child.type) {
        console.warn("Encountered invalid vnode in new children:", child);
      }
      return true;
    }
  );

  // Build key maps for efficient lookups
  oldNodes.forEach((child, index) => {
    const key = getKey(child) ?? index;
    oldKeyMap.set(key, child);
  });

  currentNewNodes.forEach((child, index) => {
    const key = getKey(child) ?? index;
    newKeyMap.set(key, child);
    newIndexMap.set(key, index);
  });

  // First pass: remove old children that are no longer present
  oldNodes.forEach(oldChild => {
    try {
      const key = getKey(oldChild) ?? oldNodes.indexOf(oldChild);
      if (!newKeyMap.has(key) && oldChild._dom) {
        if (process.env.NODE_ENV !== "production" && debug) {
          console.log(`Removing old child with key: ${key}`, oldChild);
        }

        const effect: Effect = {
          type: DELETION,
          parent: oldChild._dom?.parentNode as Node,
          node: oldChild._dom,
          oldVNode: oldChild,
        };
        deletions.push(effect);
      }
    } catch (error) {
      console.error("Error removing old child:", { oldChild, error });
      if (process.env.NODE_ENV !== "production") {
        throw error;
      }
    }
  });

  // Second pass: update and reorder existing children
  currentNewNodes.forEach((newChild, newIndex) => {
    try {
      if (!newChild) return;

      const key = getKey(newChild) ?? newIndex;
      const oldChild = oldKeyMap.get(key);

      if (oldChild) {
        // Update existing node
        if (isSameNodeType(oldChild, newChild)) {
          // Reuse the DOM node
          newChild._dom = oldChild._dom;

          // Update props
          if (newChild._dom) {
            try {
              diffProps(
                oldChild.props || {},
                newChild.props || {},
                newChild._dom as HTMLElement
              );
            } catch (error) {
              console.error("Error updating props:", {
                oldChild,
                newChild,
                error,
              });
              throw error;
            }

            // Recurse into children if needed
            if (newChild.props?.children || oldChild.props?.children) {
              try {
                reconcileChildren(
                  newChild._dom as HTMLElement,
                  Array.isArray(oldChild.props?.children)
                    ? oldChild.props.children
                    : [],
                  Array.isArray(newChild.props?.children)
                    ? newChild.props.children
                    : []
                );
              } catch (error) {
                console.error("Error reconciling children:", {
                  oldChild,
                  newChild,
                  error,
                });
                throw error;
              }
            }

            // Reorder if necessary
            try {
              const nextChild = parent.childNodes[newIndex];
              if (nextChild && nextChild !== newChild._dom) {
                parent.insertBefore(newChild._dom as Node, nextChild);
              } else if (!nextChild && newChild._dom) {
                parent.appendChild(newChild._dom);
              }
            } catch (error) {
              console.error("Error reordering child:", {
                parent,
                newChild,
                newIndex,
                error,
              });
              throw error;
            }
          }
        } else {
          // Different type, replace the node
          try {
            if (oldChild._dom) {
              const newDom = _internalRender(newChild, 0);
              if (newDom) {
                parent.replaceChild(newDom, oldChild._dom);
                newChild._dom = newDom;
              }
            }
          } catch (error) {
            console.error("Error replacing node:", {
              oldChild,
              newChild,
              error,
            });
            throw error;
          }
        }
      } else {
        // New node
        try {
          const newDom = _internalRender(newChild, 0);
          if (newDom) {
            const nextChild = parent.childNodes[newIndex];
            if (nextChild) {
              parent.insertBefore(newDom, nextChild);
            } else {
              parent.appendChild(newDom);
            }
            newChild._dom = newDom;
          }
        } catch (error) {
          console.error("Error adding new child:", {
            newChild,
            newIndex,
            error,
          });
          throw error;
        }
      }
    } catch (error) {
      console.error("Error in reconcileChildren:", { newIndex, error });
      if (process.env.NODE_ENV !== "production") {
        throw error;
      }
      // In production, continue with the next child
    }
  });
};

/**
 * Main diffing function that compares old and new vnodes and updates the DOM
 * @param parent The parent DOM element
 * @param oldVNode The previous virtual node (or null for initial render)
 * @param newVNode The new virtual node to render
 * @param beforeNode The reference node for insertion (optional)
 * @throws {Error} If rendering fails or invalid vnodes are provided
 */
export const diff = (
  parent: HTMLElement | SVGElement,
  oldVNode: ExtendedVNode | null,
  newVNode: ExtendedVNode,
  beforeNode: Node | null = null
): void => {
  if (!parent) {
    throw new Error("Parent element is required for diffing");
  }

  if (!newVNode) {
    throw new Error("New vnode is required for diffing");
  }

  try {
    // Simple case: no old vnode, just render new
    if (!oldVNode) {
      const dom = _internalRender(newVNode, 0);
      if (!dom) {
        throw new Error(`Failed to render vnode: ${JSON.stringify(newVNode)}`);
      }

      newVNode._dom = dom;

      try {
        if (beforeNode) {
          parent.insertBefore(dom, beforeNode);
        } else {
          parent.appendChild(dom);
        }
      } catch (e) {
        console.error("Failed to insert node:", { parent, dom, beforeNode });
        throw e;
      }
      return;
    }

    // Simple case: different types, replace
    if (!isSameNodeType(oldVNode, newVNode)) {
      const dom = _internalRender(newVNode, 0);
      if (!dom) {
        throw new Error(
          `Failed to render replacement vnode: ${JSON.stringify(newVNode)}`
        );
      }

      newVNode._dom = dom;

      try {
        if (!oldVNode._dom) {
          throw new Error("Cannot replace: old vnode has no DOM reference");
        }
        parent.replaceChild(dom, oldVNode._dom);
      } catch (e) {
        console.error("Failed to replace node:", {
          parent,
          newDom: dom,
          oldDom: oldVNode._dom,
        });
        throw e;
      }
      return;
    }

    // Update the existing DOM node
    const dom = oldVNode._dom as HTMLElement | SVGElement | undefined;
    if (!dom) {
      throw new Error("Cannot update: old vnode has no DOM reference");
    }

    newVNode._dom = dom;

    // Special handling for functional components
    if (typeof newVNode.type === "function") {
      if (debug)
        console.log(
          "[diff] Handling functional component:",
          newVNode.type.name
        );

      // For functional component updates, we need to clean up the old rendered content
      // before creating the new one, since functional components can have completely different children
      if (oldVNode._dom) {
        if (debug)
          console.log("[diff] Cleaning up old functional component DOM");
        cleanupNodeComponent(oldVNode._dom);
      }

      // Re-execute the functional component to get the new rendered result
      const newChildVNode = _internalRender(newVNode, 0);

      // Replace the existing DOM with the new rendered result
      if (newChildVNode && parent && oldVNode._dom) {
        if (debug)
          console.log(
            "[diff] Replacing functional component DOM for:",
            newVNode.type.name
          );
        try {
          // Robust replacement: insert new node before old and remove old, avoiding replaceChild mismatches
          if (oldVNode._dom) {
            const oldDom = oldVNode._dom;
            const parentNode = oldDom.parentNode;
            if (parentNode) {
              parentNode.insertBefore(newChildVNode, oldDom);
              parentNode.removeChild(oldDom);
            }
          }
        } catch (e) {
          console.error("Failed to replace functional component DOM:", e);
        }
        newVNode._dom = newChildVNode;
      }
      return;
    }

    // Update props
    try {
      diffProps(oldVNode.props || {}, newVNode.props || {}, dom);
    } catch (e) {
      console.error("Failed to diff props:", {
        oldProps: oldVNode.props,
        newProps: newVNode.props,
      });
      throw e;
    }

    // Recurse into children
    const oldChildren = Array.isArray(oldVNode.props?.children)
      ? oldVNode.props.children
      : [];

    const newChildren = Array.isArray(newVNode.props?.children)
      ? newVNode.props.children
      : [];

    if (newChildren.length > 0 || oldChildren.length > 0) {
      try {
        reconcileChildren(dom, oldChildren, newChildren);
      } catch (e) {
        console.error("Failed to reconcile children:", {
          oldChildren,
          newChildren,
        });
        throw e;
      }
    }
  } catch (error) {
    console.error("Error in diff function:", {
      parent,
      oldVNode,
      newVNode,
      error: error instanceof Error ? error.message : String(error),
    });

    if (process.env.NODE_ENV !== "production") {
      // In development, rethrow the error to make it easier to debug
      throw error;
    }
    // In production, try to recover by rendering a new node
    try {
      const dom = _internalRender(newVNode, 0);
      if (dom) {
        parent.innerHTML = "";
        parent.appendChild(dom);
      }
    } catch (recoveryError) {
      console.error("Recovery render failed:", recoveryError);
    }
  }
};

// Apply all queued effects
export const commitRoot = (): void => {
  // Process deletions first
  deletions.forEach(commitWork);

  // Process other effects
  effects.forEach(commitWork);
};

/**
 * Process a single effect and apply it to the DOM
 * @param effect The effect to process
 * @throws {Error} If the effect type is invalid
 */
function commitWork(effect: Effect): void {
  if (!effect) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("commitWork called with null/undefined effect");
    }
    return;
  }

  try {
    switch (effect.type) {
      case PLACEMENT:
        if (!effect.parent) {
          throw new Error("PLACEMENT effect missing parent node");
        }
        if (!effect.node) {
          throw new Error("PLACEMENT effect missing node to insert");
        }

        if (effect.beforeNode) {
          effect.parent.insertBefore(effect.node, effect.beforeNode);
        } else {
          effect.parent.appendChild(effect.node);
        }
        break;

      case UPDATE:
        // Props are already updated in place during the diff phase
        if (process.env.NODE_ENV !== "production" && effect.newVNode && debug) {
          console.log(
            "Updating node:",
            effect.node,
            "with new vnode:",
            effect.newVNode
          );
        }
        break;

      case DELETION:
        if (debug)
          console.log(
            "[diff] DELETION effect for node:",
            effect.node?.nodeName
          );
        if (effect.node?.parentNode) {
          cleanupNodeComponent(effect.node);
          effect.node.parentNode.removeChild(effect.node);
        }
        break;

      default:
        if (process.env.NODE_ENV !== "production") {
          console.error("Unknown effect type:", effect.type);
        }
        break;
    }
  } catch (error) {
    console.error("Error in commitWork:", error);
    if (process.env.NODE_ENV !== "production") {
      // In development, rethrow the error to make it easier to debug
      throw error;
    }
    // In production, continue with the next effect
  }
}

/**
 * Initialize the renderer with a custom render function
 * @param renderFn The function that renders a vnode to a DOM node
 * @throws {Error} If renderFn is not a function
 */
export function initRenderer(
  renderFn: (vnode: any, depth?: number) => Node
): void {
  if (typeof renderFn !== "function") {
    throw new Error("Renderer must be a function");
  }
  _internalRender = renderFn;
}

/**
 * The public API of the diffing system
 */
export const diffing = {
  /**
   * The main diffing function that compares old and new vnodes and updates the DOM
   */
  diff,

  /**
   * Apply all queued effects to the DOM
   */
  commitRoot,

  /**
   * Initialize the renderer with a custom render function
   */
  initRenderer,

  // Effect tags
  PLACEMENT,
  UPDATE,
  DELETION,
} as const;

// Type for the diffing API
export type DiffingAPI = typeof diffing;
