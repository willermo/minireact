import { useEffect, useRef } from "@minireact";

export const useNavigationGuard = (
  isActive: boolean,
  onConfirmLeave: () => Promise<void>
) => {
  const isUnloading = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    const message =
      "You have an active match in progress. Leaving will result in a forfeit. Are you sure you want to leave?";

    const confirmAndCleanup = (next: () => void) => {
      const confirmed = window.confirm(message);
      if (confirmed) {
        isUnloading.current = true;
        onConfirmLeave().finally(next);
      } else {
        history.go(1);
      }
    };
    const handlePopState = () => {
      if (isUnloading.current) return;
      confirmAndCleanup(() => {
        /* no-op, navigation already occurred */
      });
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnloading.current) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || anchor.target === "_blank" || e.ctrlKey || e.metaKey)
        return;

      e.preventDefault();
      confirmAndCleanup(() => {
        window.location.href = anchor.href;
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isActive, onConfirmLeave]);

  return { isUnloading };
};
