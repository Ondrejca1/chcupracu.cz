"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PENDING_CLASS = "nav-click-pending";

function isInternalNavigation(link: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== "_self") return false;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
  return true;
}

export function NavigationFeedback() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll(`.${PENDING_CLASS}`).forEach((element) => element.classList.remove(PENDING_CLASS));
  }, [pathname]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || !isInternalNavigation(target, event)) return;

      document.querySelectorAll(`.${PENDING_CLASS}`).forEach((element) => element.classList.remove(PENDING_CLASS));
      target.classList.add(PENDING_CLASS);
      window.clearTimeout(timeout);
      timeout = setTimeout(() => target.classList.remove(PENDING_CLASS), 1600);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
