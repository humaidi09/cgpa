// Test-only ESM resolve hook: the app's sources use extensionless relative
// imports (Vite resolves them), which bare Node cannot. This appends the
// extension when the direct resolution fails, so verification scripts can import
// the real source modules unchanged.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      for (const ext of ['.js', '/index.js']) {
        try {
          return await next(specifier + ext, context)
        } catch {
          /* try the next candidate */
        }
      }
    }
    throw err
  }
}
