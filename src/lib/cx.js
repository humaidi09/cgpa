// Tiny classNames joiner — drops falsy values, joins the rest with a space.
// The whole app uses this instead of a clsx dependency.
export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}
