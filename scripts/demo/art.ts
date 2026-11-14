/**
 * Clean, flat product illustrations for DEMO products (1000×1250, white background, product centred).
 * They stand in for photography so layouts, filters and the admin can be designed before real catalogues arrive.
 */

const W = 1000
const H = 1250
const frame = (inner: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="#ffffff"/>${inner}</svg>`

const shadow = (cx: number, cy: number, rx: number, ry = 26) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#0e1a33" opacity="0.07"/>`

/** Shade a hex colour: amount < 0 darkens, > 0 lightens. */
export function shade(hex: string, amount: number) {
  const n = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
  const out = c.map((v) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount))
  return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

export function perfume(color: string, cap = '#c9a45c', label = 'EAU DE PARFUM', tall = false) {
  const bw = tall ? 300 : 380
  const bh = tall ? 560 : 470
  const x = (W - bw) / 2
  const y = 1000 - bh
  return frame(
    `${shadow(500, 1010, bw * 0.62)}
    <rect x="${500 - 46}" y="${y - 70}" width="92" height="80" rx="10" fill="${shade(cap, -0.15)}"/>
    <rect x="${500 - 80}" y="${y - 210}" width="160" height="150" rx="28" fill="url(#cap)"/>
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="64" fill="url(#glass)"/>
    <rect x="${x + 26}" y="${y + 24}" width="${bw - 52}" height="${bh - 48}" rx="48" fill="url(#juice)" opacity="0.92"/>
    <rect x="${x + 44}" y="${y + 40}" width="34" height="${bh - 120}" rx="17" fill="#ffffff" opacity="0.35"/>
    <rect x="${500 - 120}" y="${y + bh / 2 - 60}" width="240" height="120" rx="10" fill="#ffffff" opacity="0.92"/>
    <text x="500" y="${y + bh / 2 - 6}" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-style="italic" fill="${shade(color, -0.55)}">Ceylon</text>
    <text x="500" y="${y + bh / 2 + 34}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="3" fill="${shade(color, -0.45)}">${label}</text>`,
    `<linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="${shade(color, 0.55)}"/><stop offset="1" stop-color="${shade(color, 0.25)}"/></linearGradient>
     <linearGradient id="juice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(color, 0.25)}"/><stop offset="1" stop-color="${color}"/></linearGradient>
     <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="${shade(cap, 0.3)}"/><stop offset="0.5" stop-color="${cap}"/><stop offset="1" stop-color="${shade(cap, -0.25)}"/></linearGradient>`,
  )
}

export function mist(color: string) {
  return frame(
    `${shadow(500, 1010, 170)}
    <rect x="455" y="250" width="90" height="60" rx="12" fill="#e9e4ef"/>
    <rect x="470" y="200" width="60" height="60" rx="14" fill="${shade(color, -0.3)}"/>
    <rect x="370" y="300" width="260" height="710" rx="70" fill="url(#b)"/>
    <rect x="395" y="330" width="26" height="600" rx="13" fill="#fff" opacity="0.4"/>
    <rect x="410" y="560" width="180" height="210" rx="14" fill="#ffffff" opacity="0.9"/>
    <text x="500" y="650" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-style="italic" fill="${shade(color, -0.6)}">Body</text>
    <text x="500" y="690" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-style="italic" fill="${shade(color, -0.6)}">Mist</text>
    <text x="500" y="735" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="3" fill="${shade(color, -0.45)}">CEYLON</text>`,
    `<linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="${shade(color, 0.35)}"/><stop offset="1" stop-color="${color}"/></linearGradient>`,
  )
}

export function sneaker(color: string, sole = '#ffffff', accent = '#ff5a1f', kids = false) {
  const s = kids ? 0.8 : 1
  const t = `translate(${500 - 415 * s} ${700 - 200 * s}) scale(${s})`
  const dark = shade(color, -0.18)
  return frame(
    `${shadow(500, 905, 390 * s, 30)}
    <g transform="${t}">
      <!-- upper -->
      <path d="M48 330 C 34 262, 40 190, 74 140 C 122 124, 172 124, 214 134 C 248 92, 288 58, 330 52 C 362 48, 384 70, 394 98 L 640 198 C 722 228, 792 262, 808 302 L 812 332 Z" fill="${color}"/>
      <!-- heel counter + collar -->
      <path d="M48 330 C 34 262, 40 190, 74 140 C 104 132, 132 130, 156 132 C 150 200, 160 268, 190 330 Z" fill="${dark}"/>
      <path d="M74 140 C 122 124, 172 124, 214 134" stroke="${shade(color, -0.35)}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <!-- tongue -->
      <path d="M300 60 C 330 20, 380 30, 392 96 L 360 110 C 350 80, 330 66, 300 60 Z" fill="${shade(color, 0.25)}"/>
      <!-- toe cap -->
      <path d="M640 198 C 722 228, 792 262, 808 302 L 812 332 L 620 332 C 640 290, 646 240, 640 198 Z" fill="${shade(color, 0.18)}"/>
      <!-- side panel accent -->
      <path d="M210 300 C 300 250, 420 230, 560 262" stroke="${accent}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <!-- eyelets + laces -->
      ${[0, 1, 2, 3, 4]
        .map((i) => {
          const x = 400 + i * 50
          const y = 110 + i * 20
          return `<circle cx="${x}" cy="${y}" r="7" fill="${shade(color, -0.4)}"/><path d="M${x - 16} ${y - 18} L ${x + 22} ${y + 6}" stroke="${shade(color, 0.6)}" stroke-width="9" stroke-linecap="round"/>`
        })
        .join('')}
      <!-- sole -->
      <path d="M30 326 L 818 326 C 830 346, 824 372, 800 380 L 66 382 C 36 382, 22 356, 30 326 Z" fill="${sole}" stroke="${shade(sole, -0.14)}" stroke-width="4"/>
      <path d="M40 356 L 812 358" stroke="${shade(sole, -0.2)}" stroke-width="6"/>
    </g>`,
  )
}

export function slide(color: string) {
  return frame(
    `${shadow(500, 905, 360, 30)}
    <path d="M150 820 C 150 760, 210 735, 300 730 L 760 715 C 850 712, 880 760, 870 815 C 860 860, 820 875, 760 875 L 250 878 C 190 878, 150 860, 150 820 Z" fill="${shade(color, -0.2)}"/>
    <path d="M160 805 C 165 760, 215 742, 300 738 L 760 722 C 840 720, 868 760, 860 800 C 852 835, 815 848, 760 848 L 250 852 C 195 852, 158 838, 160 805 Z" fill="${shade(color, 0.55)}"/>
    <path d="M330 760 C 340 600, 640 590, 700 750 L 650 752 C 610 650, 390 655, 380 758 Z" fill="${color}"/>
    <path d="M360 700 C 430 640, 590 640, 660 700" stroke="${shade(color, 0.35)}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  )
}

export function flat(color: string) {
  return frame(
    `${shadow(500, 900, 360, 28)}
    <path d="M140 820 C 120 760, 190 700, 300 690 L 740 680 C 850 680, 900 740, 880 800 C 865 845, 820 860, 760 860 L 230 862 C 180 862, 150 848, 140 820 Z" fill="${color}"/>
    <path d="M300 700 C 420 660, 640 655, 760 690 C 700 740, 360 745, 300 700 Z" fill="${shade(color, 0.6)}"/>
    <path d="M190 840 L 860 820" stroke="${shade(color, -0.3)}" stroke-width="10"/>
    <path d="M560 690 C 600 630, 700 630, 720 680" stroke="${shade(color, -0.25)}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <circle cx="640" cy="652" r="20" fill="#e8d3a8" stroke="#c9a45c" stroke-width="6"/>`,
  )
}

export function chocolateBox(color: string, ribbon = '#c9a45c', heart = false) {
  const lid = heart
    ? `<path d="M500 980 C 260 830, 170 700, 220 560 C 265 440, 420 430, 500 540 C 580 430, 735 440, 780 560 C 830 700, 740 830, 500 980 Z" fill="url(#lid)"/>
       <path d="M500 540 L 500 975" stroke="${ribbon}" stroke-width="22"/>`
    : `<rect x="210" y="430" width="580" height="520" rx="26" fill="${shade(color, -0.25)}"/>
       <rect x="195" y="400" width="610" height="470" rx="26" fill="url(#lid)"/>
       <rect x="470" y="400" width="60" height="470" fill="${ribbon}"/>
       <rect x="195" y="610" width="610" height="56" fill="${ribbon}"/>
       <rect x="300" y="485" width="400" height="90" rx="10" fill="#ffffff" opacity="0.9"/>
       <text x="500" y="542" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="${shade(color, -0.4)}">Kandy Cocoa</text>`
  return frame(
    `${shadow(500, 1000, 330, 30)}${lid}
    <path d="M500 400 C 420 300, 330 330, 380 400 Z M500 400 C 580 300, 670 330, 620 400 Z" fill="${shade(ribbon, -0.1)}" transform="${heart ? 'translate(0 140)' : ''}"/>
    <circle cx="500" cy="${heart ? 540 : 400}" r="26" fill="${shade(ribbon, -0.2)}"/>`,
    `<linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(color, 0.2)}"/><stop offset="1" stop-color="${color}"/></linearGradient>`,
  )
}

export function chocolateBar(color: string, wrapper = '#7a3f16') {
  return frame(
    `${shadow(500, 1010, 260, 26)}
    <g transform="rotate(-8 500 640)">
      <rect x="300" y="240" width="400" height="770" rx="22" fill="${wrapper}"/>
      <rect x="300" y="240" width="400" height="170" rx="22" fill="#d9dde3"/>
      <path d="M300 410 L 700 410 L 700 440 Q 650 470 600 440 Q 550 410 500 440 Q 450 470 400 440 Q 350 410 300 440 Z" fill="#c4c9d1"/>
      ${[0, 1, 2]
        .map((r) => [0, 1].map((c) => `<rect x="${335 + c * 170}" y="${270 + r * 46}" width="160" height="38" rx="6" fill="${shade(color, -0.1)}"/>`).join(''))
        .join('')}
      <rect x="340" y="560" width="320" height="250" rx="14" fill="${shade(wrapper, 0.75)}"/>
      <text x="500" y="650" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-style="italic" fill="${wrapper}">Kandy</text>
      <text x="500" y="700" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-style="italic" fill="${wrapper}">Cocoa</text>
      <text x="500" y="760" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="4" fill="${shade(wrapper, -0.2)}">CHOCOLATE</text>
    </g>`,
  )
}

export function hamper(color: string, deluxe = false) {
  const items = deluxe
    ? `<rect x="300" y="430" width="90" height="260" rx="14" fill="#7a3f16"/><rect x="420" y="380" width="80" height="310" rx="40" fill="#1d5fd1"/><rect x="525" y="450" width="120" height="240" rx="10" fill="#ff5a1f"/><circle cx="700" cy="560" r="80" fill="#ffd166"/>`
    : `<rect x="330" y="450" width="110" height="240" rx="10" fill="#0f7b55"/><rect x="470" y="410" width="90" height="280" rx="45" fill="#e0115a"/><circle cx="650" cy="580" r="85" fill="#ffd166"/>`
  return frame(
    `${shadow(500, 1015, 340, 30)}${items}
    <path d="M190 640 L 810 640 L 760 1000 L 240 1000 Z" fill="url(#bk)"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${215 + i * 4} ${700 + i * 80} L ${785 - i * 4} ${700 + i * 80}" stroke="${shade(color, -0.25)}" stroke-width="10"/>`).join('')}
    <path d="M240 640 C 240 400, 760 400, 760 640" stroke="${shade(color, -0.3)}" stroke-width="22" fill="none"/>
    <rect x="160" y="610" width="680" height="60" rx="18" fill="${shade(color, -0.12)}"/>
    <path d="M500 640 C 440 560, 380 600, 430 650 Z M500 640 C 560 560, 620 600, 570 650 Z" fill="#e0115a"/>`,
    `<linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.25)}"/></linearGradient>`,
  )
}

export function giftBox(color: string, ribbon = '#ffffff') {
  return frame(
    `${shadow(500, 1010, 320, 30)}
    <rect x="230" y="520" width="540" height="480" rx="20" fill="url(#gb)"/>
    <rect x="200" y="440" width="600" height="120" rx="20" fill="${shade(color, 0.15)}"/>
    <rect x="465" y="440" width="70" height="560" fill="${ribbon}"/>
    <path d="M500 440 C 400 300, 290 360, 360 440 Z M500 440 C 600 300, 710 360, 640 440 Z" fill="${ribbon}" stroke="${shade(ribbon, -0.15)}" stroke-width="6"/>
    <circle cx="500" cy="440" r="30" fill="${shade(ribbon, -0.1)}"/>`,
    `<linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.25)}"/></linearGradient>`,
  )
}

export function sweets(color: string) {
  const bites = Array.from({ length: 9 }, (_, i) => {
    const x = 330 + (i % 3) * 170
    const y = 480 + Math.floor(i / 3) * 150
    return `<circle cx="${x}" cy="${y}" r="62" fill="${i % 2 ? shade(color, -0.15) : color}"/><circle cx="${x - 18}" cy="${y - 20}" r="12" fill="#fff" opacity="0.35"/>`
  }).join('')
  return frame(
    `${shadow(500, 1000, 330, 30)}
    <rect x="190" y="380" width="620" height="600" rx="40" fill="#f6ede4" stroke="#e2cdb6" stroke-width="10"/>${bites}
    <rect x="300" y="250" width="400" height="100" rx="20" fill="#7a3f16"/>
    <text x="500" y="315" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-style="italic" fill="#f6ede4">Sweet Bites</text>`,
  )
}
