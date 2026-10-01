import { GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

let fontsLoaded = false;

export function initGlobalFonts(): void {
    if (fontsLoaded) return;

    const fontsDir = path.resolve(process.cwd(), 'bot/assets/fonts');
    const fontDefs = [
        { file: 'MetalGothic.ttf', family: 'MetalGothic' },
        { file: 'Blackletter.ttf', family: 'Blackletter' },
        { file: 'Cupid.ttf', family: 'Cupid' },
        { file: 'AprilFont.ttf', family: 'AprilFont' }
    ];

    for (const font of fontDefs) {
        const fullPath = path.join(fontsDir, font.file);
        if (fs.existsSync(fullPath)) {
            try {
                GlobalFonts.registerFromPath(fullPath, font.family);
            } catch {}
        }
    }

    fontsLoaded = true;
}
