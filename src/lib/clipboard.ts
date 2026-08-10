function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const scrollX = globalThis.scrollX;
  const scrollY = globalThis.scrollY;
  const activeElement = document.activeElement;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const selected =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);

  if (selected && selection) {
    selection.removeAllRanges();
    selection.addRange(selected);
  }

  if (activeElement instanceof HTMLElement) {
    activeElement.focus({ preventScroll: true });
  }
  globalThis.scrollTo(scrollX, scrollY);

  return copied;
}

/** Copy text to the clipboard. Tries a sync fallback first for mobile Safari. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (legacyCopy(text)) {
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
