/** Temporary CAM-67 debug helper. Do not ship. */
export function debugTutorialLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  const payload = {
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  console.log("[tutorial-coach-debug]", payload);
  try {
    void fetch("/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export function inspectJoyrideDom(): Record<string, unknown> {
  const portal = document.getElementById("react-joyride-portal");
  const styleOf = (el: Element | null) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: el instanceof HTMLElement ? el.className : "",
      opacity: cs.opacity,
      zIndex: cs.zIndex,
      transform: cs.transform,
      display: cs.display,
      visibility: cs.visibility,
      position: cs.position,
      pointerEvents: cs.pointerEvents,
      width: cs.width,
      height: cs.height,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
  };
  const floater =
    portal?.querySelector("[data-joyride-floater], .react-joyride__floater, [class*='floater']") ??
    document.querySelector("[class*='react-joyride']");
  const overlay = portal?.querySelector("svg") ?? portal?.querySelector("[class*='overlay']");
  const tooltip = portal?.querySelector("[role='dialog'], [class*='tooltip']");
  return {
    portalExists: !!portal,
    portalChildCount: portal?.childElementCount ?? 0,
    portal: styleOf(portal),
    floater: styleOf(floater),
    overlay: styleOf(overlay),
    tooltip: styleOf(tooltip),
    portalInnerHTMLLength: portal?.innerHTML.length ?? 0,
  };
}

export function inspectTutorialTargets(): Record<string, unknown> {
  const keys = ["own-hand", "deck", "discard", "call-cambio"] as const;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const el = document.querySelector(`[data-tutorial="${key}"]`);
    if (!(el instanceof HTMLElement)) {
      out[key] = { found: false };
      continue;
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out[key] = {
      found: true,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
  }
  return out;
}
