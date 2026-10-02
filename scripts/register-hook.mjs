// Registers the extension-appending resolve hook for Node runs.
import { register } from 'node:module'
register('./resolve-hook.mjs', import.meta.url)
