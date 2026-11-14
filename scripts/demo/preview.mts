/** Renders every demo illustration style to <outDir> as WebP for visual review. Usage: tsx scripts/demo/preview.mts <outDir> */
import sharp from 'sharp'

import * as art from './art'

const out = process.argv[2] ?? 'screenshots/demo-art'
const items: [string, string][] = [
  ['perfume', art.perfume('#e7a1b0')],
  ['perfume-tall', art.perfume('#2b2f3a', '#c9a45c', 'EAU DE PARFUM', true)],
  ['mist', art.mist('#f4a3c0')],
  ['sneaker', art.sneaker('#f3f1ee', '#ffffff', '#ff5a1f')],
  ['sneaker-black', art.sneaker('#23262e', '#f3f1ee', '#ff5a1f')],
  ['slide', art.slide('#c8a27a')],
  ['flat', art.flat('#f2c4c4')],
  ['box', art.chocolateBox('#5b2a1a')],
  ['heart', art.chocolateBox('#c8102e', '#f3d27a', true)],
  ['bar', art.chocolateBar('#5b2a1a')],
  ['hamper', art.hamper('#c99a5b')],
  ['giftbox', art.giftBox('#ff5a1f')],
  ['sweets', art.sweets('#8a4b20')],
]
for (const [n, svg] of items) await sharp(Buffer.from(svg)).resize(300).png().toFile(`${out}/${n}.png`)
console.log(`rendered ${items.length} to ${out}`)
