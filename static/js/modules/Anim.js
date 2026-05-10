export function pulse(el, className = "pulse") {
  if (!el) return;
  el.classList.remove(className);
  // Force reflow to restart animation reliably.
  // eslint-disable-next-line no-unused-expressions
  el.offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), 180);
}

export function setTextWithPulse(el, nextText, className = "tick") {
  if (!el) return false;
  const prev = el.textContent;
  if (prev === nextText) return false;
  el.textContent = nextText;
  pulse(el, className);
  return true;
}

