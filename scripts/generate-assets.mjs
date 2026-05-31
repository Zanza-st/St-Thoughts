import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Jimp } = require('jimp')

const BG = 0x0c0c0cff
const GOLD = 0xc4a882ff
const BROWN = 0x8a6840ff
const DARK = 0x141414ff
const BORDER = 0x2a2a2aff

async function drawRoundRect(img, x, y, w, h, r, fill) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dx = Math.min(px - x, x + w - 1 - px)
      const dy = Math.min(py - y, y + h - 1 - py)
      if (dx < r && dy < r) {
        const dist = Math.sqrt((r - dx) ** 2 + (r - dy) ** 2)
        if (dist > r) continue
      }
      img.setPixelColor(fill, px, py)
    }
  }
}

async function generateIcon() {
  const size = 1024
  const img = new Jimp({ width: size, height: size, color: BG })

  // Outer card
  await drawRoundRect(img, 120, 120, 784, 784, 80, DARK)

  // Gold border glow
  for (let i = 0; i < 4; i++) {
    await drawRoundRect(img, 118 - i, 118 - i, 788 + i * 2, 788 + i * 2, 82 + i, (BORDER & 0xffffff00) | Math.max(0, 0x20 - i * 6))
  }
  await drawRoundRect(img, 118, 118, 788, 788, 82, BORDER)

  // Top accent line
  for (let x = 200; x < 824; x++) {
    for (let y = 210; y < 216; y++) {
      img.setPixelColor(BROWN, x, y)
    }
  }

  // "ST" lettermark — draw thick block letters
  // S block
  const drawBlock = (img, x, y, w, h, color) => {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        img.setPixelColor(color, px, py)
  }

  // S shape
  drawBlock(img, 250, 320, 150, 30, GOLD)   // top bar
  drawBlock(img, 250, 320, 30, 100, GOLD)   // top-left
  drawBlock(img, 250, 415, 150, 30, GOLD)   // mid bar
  drawBlock(img, 370, 445, 30, 100, GOLD)   // bot-right
  drawBlock(img, 250, 540, 150, 30, GOLD)   // bot bar

  // T shape
  drawBlock(img, 450, 320, 180, 30, GOLD)   // top bar
  drawBlock(img, 520, 320, 40, 250, GOLD)   // stem

  // Tagline dots
  for (let i = 0; i < 5; i++) {
    const cx = 370 + i * 60
    const cy = 730
    for (let py = cy - 8; py <= cy + 8; py++) {
      for (let px = cx - 8; px <= cx + 8; px++) {
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        if (dist <= 8) img.setPixelColor(i === 2 ? GOLD : BROWN, px, py)
      }
    }
  }

  await img.write('./assets/icon.png')
  console.log('✓ icon.png')
}

async function generateAdaptiveIcon() {
  const size = 1024
  const img = new Jimp({ width: size, height: size, color: BG })

  // Centered ST on transparent-safe bg
  const drawBlock = (img, x, y, w, h, color) => {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        img.setPixelColor(color, px, py)
  }

  // S — centered, larger
  drawBlock(img, 240, 300, 170, 35, GOLD)
  drawBlock(img, 240, 300, 35, 115, GOLD)
  drawBlock(img, 240, 410, 170, 35, GOLD)
  drawBlock(img, 375, 445, 35, 115, GOLD)
  drawBlock(img, 240, 555, 170, 35, GOLD)

  // T
  drawBlock(img, 460, 300, 200, 35, GOLD)
  drawBlock(img, 535, 300, 45, 290, GOLD)

  await img.write('./assets/adaptive-icon.png')
  console.log('✓ adaptive-icon.png')
}

async function generateSplash() {
  const W = 1284
  const H = 2778
  const img = new Jimp({ width: W, height: H, color: BG })

  const drawBlock = (img, x, y, w, h, color) => {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        if (px >= 0 && px < W && py >= 0 && py < H)
          img.setPixelColor(color, px, py)
  }

  // Top accent
  drawBlock(img, 0, 0, W, 4, BROWN)

  // ST wordmark — vertically centered slightly above middle
  const cx = W / 2
  const cy = H / 2 - 200

  // S (large)
  const sw = 220, sh = 280, st = 38
  const sx = cx - sw - 20
  drawBlock(img, sx, cy, sw, st, GOLD)           // top
  drawBlock(img, sx, cy, st, sh / 2, GOLD)       // top-left
  drawBlock(img, sx, cy + sh / 2 - st / 2, sw, st, GOLD)  // mid
  drawBlock(img, sx + sw - st, cy + sh / 2, st, sh / 2, GOLD) // bot-right
  drawBlock(img, sx, cy + sh - st, sw, st, GOLD) // bot

  // T (large)
  const tx = cx + 20
  drawBlock(img, tx, cy, sw, st, GOLD)           // top bar
  drawBlock(img, tx + sw / 2 - st / 2, cy, st, sh, GOLD) // stem

  // "THOUGHTS" subtitle — pixel dots
  const subY = cy + sh + 60
  const subText = 'THOUGHTS'
  const dotSize = 6
  const dotGap = 14
  const totalW = subText.length * (dotSize * 5 + dotGap) - dotGap
  const startX = Math.round(cx - totalW / 2)

  // Simple 5x7 pixel font for each letter — just draw a rectangle per char for now
  for (let i = 0; i < subText.length; i++) {
    const charX = startX + i * (dotSize * 5 + dotGap)
    drawBlock(img, charX, subY, dotSize * 5, dotSize * 7, BROWN)
    // Cut out to make it look like letters (simplified)
    drawBlock(img, charX + dotSize, subY + dotSize, dotSize * 3, dotSize * 2, BG)
  }

  // "idea network" under
  for (let i = 0; i < 12; i++) {
    const dotX = Math.round(cx - 80 + i * 14)
    drawBlock(img, dotX, subY + 80, 4, 4, BORDER)
  }

  // Bottom accent
  drawBlock(img, 0, H - 4, W, 4, BROWN)

  await img.write('./assets/splash.png')
  console.log('✓ splash.png')
}

async function generateFavicon() {
  const size = 48
  const img = new Jimp({ width: size, height: size, color: BG })
  for (let y = 4; y < 44; y++)
    for (let x = 4; x < 44; x++)
      img.setPixelColor(GOLD, x, y)
  for (let y = 8; y < 40; y++)
    for (let x = 8; x < 40; x++)
      img.setPixelColor(BG, x, y)
  await img.write('./assets/favicon.png')
  console.log('✓ favicon.png')
}

await Promise.all([generateIcon(), generateAdaptiveIcon(), generateSplash(), generateFavicon()])
console.log('All assets generated.')
