import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const generateMarquee = async () => {
  const outputPath = path.join(process.cwd(), 'public', 'marquee_1280x800.png');
  const iconPath = path.join(process.cwd(), 'public', 'rubi_logo.svg');
  
  // 1. Create a 1280x800 background
  const svgBackground = `
    <svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a14" />
          <stop offset="50%" stop-color="#140a1e" />
          <stop offset="100%" stop-color="#2a0018" />
        </linearGradient>
      </defs>
      <rect width="1280" height="800" fill="url(#bg)" />
      <text x="500" y="350" font-family="sans-serif" font-weight="bold" font-size="96" fill="#FFFFFF">Rubi (ルビ)</text>
      <text x="500" y="440" font-family="sans-serif" font-weight="normal" font-size="48" fill="#FFFFFF">沉浸式 AI 日语振假名注音</text>
      <text x="500" y="500" font-family="sans-serif" font-weight="normal" font-size="32" fill="#c4b5fd">AI-Powered Japanese Furigana &amp; Translation</text>
      
      <!-- Feature Tags -->
      <rect x="500" y="560" width="200" height="50" rx="25" fill="#FFFFFF" fill-opacity="0.1" />
      <text x="600" y="594" font-family="sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">📖 振假名注音</text>

      <rect x="720" y="560" width="180" height="50" rx="25" fill="#FFFFFF" fill-opacity="0.1" />
      <text x="810" y="594" font-family="sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">🔍 悬浮查词</text>

      <rect x="920" y="560" width="220" height="50" rx="25" fill="#FFFFFF" fill-opacity="0.1" />
      <text x="1030" y="594" font-family="sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">🧠 AI 语境解释</text>
    </svg>
  `;

  // 2. Read and resize the logo to 320x320
  const iconBuffer = await sharp(iconPath)
    .resize(360, 360)
    .toBuffer();

  // 3. Composite the image
  await sharp(Buffer.from(svgBackground))
    .composite([
      { input: iconBuffer, top: 220, left: 80 }
    ])
    .png()
    .toFile(outputPath);
    
  console.log('✅ Generated Chrome Web Store Marquee: public/marquee_1280x800.png');
};

generateMarquee().catch(console.error);
