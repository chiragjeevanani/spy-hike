// Shared form-validation helpers: scroll to (and focus) the first invalid
// field on a failed submit, so an error on a field the user has scrolled
// past isn't silently invisible — used alongside a toast summarizing what's
// wrong.

// `refs` is an object of { fieldName: React ref }; `fieldOrder` is the
// on-screen top-to-bottom order of those field names. Scrolls/focuses the
// first one present in `errors`.
export function scrollToFirstError(refs, errors, fieldOrder) {
  const firstField = fieldOrder.find((f) => errors[f]);
  const el = firstField && refs[firstField]?.current;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // A container (e.g. a checkbox list) isn't focusable itself — fall back to
  // its first focusable descendant so keyboard/screen-reader users land
  // somewhere useful too.
  if (typeof el.focus === 'function' && el.tabIndex !== -1 && el instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) {
    el.focus({ preventScroll: true });
  } else {
    el.querySelector?.('input, select, textarea, button')?.focus?.({ preventScroll: true });
  }
}

// One error message per required field that's empty/blank — pass in a map
// of { fieldName: value } and which of those are required, get back
// { fieldName: message } for just the ones that failed.
export function requireNonEmpty(values, messages) {
  const errors = {};
  for (const [field, message] of Object.entries(messages)) {
    const v = values[field];
    const isEmpty = v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
    if (isEmpty) errors[field] = message;
  }
  return errors;
}
