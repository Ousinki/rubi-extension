import sharp from 'sharp';
import path from 'path';

const generateEduPromoTiles = async () => {
  const baseSmall = '/Users/ousin/.gemini/antigravity-ide/brain/d94da95f-8d84-4c10-856c-ba740573072f/edu_base_small_1783177550459.png';
  const baseWide = '/Users/ousin/.gemini/antigravity-ide/brain/d94da95f-8d84-4c10-856c-ba740573072f/edu_base_wide_1783177568056.png';
  
  const smallPromoPath = path.join(process.cwd(), 'public', 'promo_small_440x280.jpg');
  const marqueePromoPath = path.join(process.cwd(), 'public', 'promo_marquee_1400x560.jpg');

  // 1. Process Small promo tile (440x280 Canvas)
  const svgTextSmall = `
    <svg width="440" height="280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomShadow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#22222A" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#22222A" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <rect x="0" y="160" width="440" height="120" fill="url(#bottomShadow)" />
      <text x="220" y="225" font-family="Avenir, sans-serif" font-weight="bold" font-size="28" fill="#FFFFFF" text-anchor="middle">Rubi (ルビ)</text>
      <text x="220" y="255" font-family="Avenir, sans-serif" font-weight="normal" font-size="14" fill="#E2E8F0" text-anchor="middle">AI Japanese Learning Assistant</text>
    </svg>
  `;

  const smallCropped = await sharp(baseSmall)
    .extract({ left: 0, top: 150, width: 1024, height: 652 }) // roughly 440x280 aspect ratio
    .resize(440, 280)
    .toBuffer();

  await sharp(smallCropped)
    .composite([{ input: Buffer.from(svgTextSmall), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toFile(smallPromoPath);
    
  // 2. Process Marquee promo tile (1400x560 Canvas)
  const svgTextWide = `
    <svg width="1400" height="560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sideShadow" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#1A1A24" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#1A1A24" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <rect x="700" y="0" width="700" height="560" fill="url(#sideShadow)" />
      
      <text x="1050" y="260" font-family="Avenir, sans-serif" font-weight="bold" font-size="72" fill="#FFFFFF" text-anchor="middle">Rubi (ルビ)</text>
      <text x="1050" y="320" font-family="Avenir, sans-serif" font-weight="normal" font-size="32" fill="#E2E8F0" text-anchor="middle">Immersive Japanese Furigana</text>
      <text x="1050" y="370" font-family="Avenir, sans-serif" font-weight="normal" font-size="24" fill="#94A3B8" text-anchor="middle">&amp; Contextual Translation</text>
    </svg>
  `;

  const wideCropped = await sharp(baseWide)
    .extract({ left: 0, top: 300, width: 1024, height: 410 }) // 2.5 aspect ratio
    .resize(1400, 560)
    .toBuffer();

  await sharp(wideCropped)
    .composite([{ input: Buffer.from(svgTextWide), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toFile(marqueePromoPath);

  console.log('✅ Generated EDUCATIONAL Promo Tiles:');
  console.log('   - public/promo_small_440x280.jpg');
  console.log('   - public/promo_marquee_1400x560.jpg');
};

generateEduPromoTiles().catch(console.error);
