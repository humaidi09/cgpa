// Image helper — downscale an uploaded logo before it ever reaches the store.
// Logos live as data URLs in localStorage, so an un-resized 3MB photo would
// blow the quota and slow every render. We cap the longest side and re-encode.

const MAX_SIDE = 420

export function downscaleImage(file, maxSide = MAX_SIDE) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file (PNG, JPG, or SVG).'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const src = reader.result
      // SVGs are vector + tiny — keep them as-is (canvas would rasterise them).
      if (file.type === 'image/svg+xml') {
        resolve(src)
        return
      }
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be loaded.'))
      img.onload = () => {
        const { width, height } = img
        const scale = Math.min(1, maxSide / Math.max(width, height))
        const w = Math.max(1, Math.round(width * scale))
        const h = Math.max(1, Math.round(height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        // PNG keeps transparency (crests usually have it); it's lossless too.
        try {
          resolve(canvas.toDataURL('image/png'))
        } catch {
          resolve(src) // tainted canvas fallback — keep the original
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
