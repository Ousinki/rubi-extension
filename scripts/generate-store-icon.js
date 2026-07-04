import sharp from 'sharp';
import path from 'path';

const generateStoreIcon = async () => {
  const inputPath = path.join(process.cwd(), 'public', 'rubi_logo.svg');
  const outputPath = path.join(process.cwd(), 'store_assets', 'store_icon_128_with_text.png');
  
  await sharp(inputPath)
    .resize(128, 128)
    .png()
    .toFile(outputPath);
    
  console.log('✅ Generated Store Icon with text: store_assets/store_icon_128_with_text.png');
};

generateStoreIcon().catch(console.error);
