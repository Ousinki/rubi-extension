import sharp from 'sharp';
import path from 'path';

const generatePremiumPromos = async () => {
  const smallPromoPath = path.join(process.cwd(), 'public', 'promo_small_440x280.jpg');
  const marqueePromoPath = path.join(process.cwd(), 'public', 'promo_marquee_1400x560.jpg');

  const rubyPolygons = `
    <polygon points="0,80 80,0 150,80" fill="#FF4D6D" />
    <polygon points="80,0 150,0 150,80" fill="#FF758F" />
    <polygon points="150,0 220,0 150,80" fill="#FFB3C1" />
    <polygon points="220,0 300,80 150,80" fill="#FF4D6D" />
    <polygon points="0,80 150,260 150,80" fill="#C9184A" />
    <polygon points="300,80 150,260 150,80" fill="#A4133C" />
  `;

  // Shared gradients for a premium mesh-gradient look
  const premiumGradients = `
        <radialGradient id="glow1" cx="10%" cy="0%" r="80%">
          <stop offset="0%" stop-color="#4a0b22" />
          <stop offset="100%" stop-color="#0f0b15" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glow2" cx="90%" cy="100%" r="80%">
          <stop offset="0%" stop-color="#181335" />
          <stop offset="100%" stop-color="#0f0b15" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowCenter" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#601030" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#0f0b15" stop-opacity="0" />
        </radialGradient>
  `;

  // 1. Small Promo Tile (440x280)
  const svgSmall = `
    <svg width="440" height="280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${premiumGradients}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
        </filter>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8" />
        </filter>
      </defs>
      <!-- Base color -->
      <rect width="440" height="280" fill="#0f0b15" />
      <!-- Mesh Glows -->
      <rect width="440" height="280" fill="url(#glow1)" />
      <rect width="440" height="280" fill="url(#glow2)" />
      <rect width="440" height="280" fill="url(#glowCenter)" />
      
      <g transform="translate(152, 45) scale(0.45)" filter="url(#shadow)">
        ${rubyPolygons}
      </g>
      
      <text x="220" y="210" font-family="Avenir, Montserrat, system-ui, sans-serif" font-weight="900" font-size="42" fill="#FFFFFF" text-anchor="middle" letter-spacing="-1" filter="url(#textShadow)">Ru<tspan fill="#FF758F">bi</tspan></text>
      <text x="220" y="240" font-family="Avenir, sans-serif" font-weight="normal" font-size="16" fill="#F1F5F9" text-anchor="middle">AI Japanese Furigana</text>
    </svg>
  `;

  await sharp(Buffer.from(svgSmall))
    .jpeg({ quality: 100 })
    .toFile(smallPromoPath);

  // 2. Marquee Promo Tile (1400x560)
  const svgMarquee = `
    <svg width="1400" height="560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${premiumGradients}
        <filter id="shadowWide" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="32" flood-color="#000000" flood-opacity="0.5" />
        </filter>
        <filter id="textShadowWide" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.8" />
        </filter>
      </defs>
      <!-- Base color -->
      <rect width="1400" height="560" fill="#0f0b15" />
      <!-- Mesh Glows -->
      <rect width="1400" height="560" fill="url(#glow1)" />
      <rect width="1400" height="560" fill="url(#glow2)" />
      <rect width="1400" height="560" fill="url(#glowCenter)" />
      
      <g transform="translate(550, 70)" filter="url(#shadowWide)">
        ${rubyPolygons}
      </g>
      
      <text x="700" y="440" font-family="Avenir, Montserrat, system-ui, sans-serif" font-weight="900" font-size="96" fill="#FFFFFF" text-anchor="middle" letter-spacing="-2" filter="url(#textShadowWide)">Ru<tspan fill="#FF758F">bi</tspan></text>
      <text x="700" y="500" font-family="Avenir, sans-serif" font-weight="normal" font-size="28" fill="#F1F5F9" text-anchor="middle">Immersive AI Japanese Furigana &amp; Translation</text>
    </svg>
  `;

  await sharp(Buffer.from(svgMarquee))
    .jpeg({ quality: 100 })
    .toFile(marqueePromoPath);

  console.log('✅ Generated PREMIUM MESH Promos:');
  console.log('   - public/promo_small_440x280.jpg');
  console.log('   - public/promo_marquee_1400x560.jpg');
};

generatePremiumPromos().catch(console.error);
