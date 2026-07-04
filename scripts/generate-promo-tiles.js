import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const generatePromoTiles = async () => {
  const baseMarquee = path.join(process.cwd(), 'public', 'marquee_1280x800_3d.png');
  const smallPromoPath = path.join(process.cwd(), 'public', 'promo_small_440x280.jpg');
  const marqueePromoPath = path.join(process.cwd(), 'public', 'promo_marquee_1400x560.jpg');

  if (!fs.existsSync(baseMarquee)) {
    console.error('Base marquee image not found');
    return;
  }

  // 1. Generate Small promo tile (440x280 Canvas, no alpha -> save as JPG)
  await sharp(baseMarquee)
    .resize(440, 280, { fit: 'cover' })
    .jpeg({ quality: 95 })
    .toFile(smallPromoPath);
    
  // 2. Generate Marquee promo tile (1400x560 Canvas, no alpha -> save as JPG)
  // 1400x560 is very wide (2.5 aspect ratio). 
  // We'll take our 1280x800, crop a 1280x512 band from the center, and scale to 1400x560.
  await sharp(baseMarquee)
    .resize(1400, 560, { 
      fit: 'cover',
      position: 'center' // crops the top and bottom equally to make it wide
    })
    .jpeg({ quality: 95 })
    .toFile(marqueePromoPath);

  console.log('✅ Generated Promo Tiles:');
  console.log('   - public/promo_small_440x280.jpg');
  console.log('   - public/promo_marquee_1400x560.jpg');
};

generatePromoTiles().catch(console.error);
