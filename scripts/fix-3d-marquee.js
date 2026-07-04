import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const fixMarquee = async () => {
  const inputPath = '/Users/ousin/.gemini/antigravity-ide/brain/d94da95f-8d84-4c10-856c-ba740573072f/rubi_marquee_v3_1783175719407.png';
  const outputPath = path.join(process.cwd(), 'public', 'marquee_1280x800_3d.png');
  
  if (!fs.existsSync(inputPath)) {
    console.error('Input image not found:', inputPath);
    return;
  }

  // 1. Crop the original 1024x1024 image to 1024x640 (16:10 ratio)
  const croppedBuffer = await sharp(inputPath)
    .extract({ left: 0, top: 200, width: 1024, height: 640 })
    .resize(1280, 800)
    .toBuffer();

  // 2. Add the correct text back using SVG
  // We use a completely opaque dark gradient block at the top to cover the original messed up text
  const svgOverlay = `
    <svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <!-- Completely opaque dark color at the top to cover the old text -->
          <stop offset="0%" stop-color="#0a0a14" stop-opacity="1.0" />
          <stop offset="50%" stop-color="#0a0a14" stop-opacity="1.0" />
          <stop offset="100%" stop-color="#0a0a14" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <!-- Draw the covering block -->
      <rect width="1280" height="350" fill="url(#topShadow)" />
      
      <!-- Draw the new, clean text on top -->
      <text x="640" y="100" font-family="sans-serif" font-weight="bold" font-size="72" fill="#FFFFFF" text-anchor="middle">Rubi (ルビ)</text>
      <text x="640" y="160" font-family="sans-serif" font-weight="normal" font-size="36" fill="#c4b5fd" text-anchor="middle">AI-Powered Japanese Furigana &amp; Translation</text>
    </svg>
  `;

  // 3. Composite
  await sharp(croppedBuffer)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
    
  console.log('✅ Successfully fixed and generated 3D Marquee: public/marquee_1280x800_3d.png');
};

fixMarquee().catch(console.error);
