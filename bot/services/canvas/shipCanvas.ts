import { createCanvas, Image } from '@napi-rs/canvas';
import { initGlobalFonts } from './fontLoader';

export interface ShipData {
    user1: {
        id: string;
        username: string;
        globalName: string;
        avatar: string | null;
        inVoice: boolean;
    };
    user2: {
        id: string;
        username: string;
        globalName: string;
        avatar: string | null;
        inVoice: boolean;
    };
    compatibility: number;
    statusTitle: string;
    statusPhrase: string;
    mutualServersCount: number;
    inSameVoice: boolean;
    sameVoiceChannel?: { guildName: string; channelName: string } | null;
    totalSharedSeconds: number;
    sharedTimeFormatted: string;
}

function extractDominantColor(img: Image | null): { r: number; g: number; b: number; hex: string } {
    if (!img) return { r: 140, g: 160, b: 200, hex: '#8ca0c8' };
    try {
        const miniCanvas = createCanvas(16, 16);
        const miniCtx = miniCanvas.getContext('2d');
        miniCtx.drawImage(img, 0, 0, 16, 16);
        const data = miniCtx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const pr = data[i];
            const pg = data[i + 1];
            const pb = data[i + 2];
            const brightness = (pr + pg + pb) / 3;
            if (brightness > 30 && brightness < 230) {
                r += pr;
                g += pg;
                b += pb;
                count++;
            }
        }
        if (count === 0) return { r: 160, g: 100, b: 200, hex: '#a064c8' };
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        return { r, g, b, hex };
    } catch {
        return { r: 180, g: 100, b: 160, hex: '#b464a0' };
    }
}

function drawRoundedRect(
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }
}

function drawVectorHeart(ctx: any, cx: number, cy: number, size: number, color1: string, color2: string) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    const d = size;
    ctx.moveTo(0, d * 0.35);
    ctx.bezierCurveTo(-d * 0.55, -d * 0.25, -d * 0.65, d * 0.45, 0, d * 0.95);
    ctx.bezierCurveTo(d * 0.65, d * 0.45, d * 0.55, -d * 0.25, 0, d * 0.35);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-d * 0.5, -d * 0.5, d * 0.5, d * 0.5);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.shadowColor = color1;
    ctx.shadowBlur = 22;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

export function buildShipCanvas(
    data: ShipData,
    avatar1Img: Image | null,
    avatar2Img: Image | null
): Buffer {
    initGlobalFonts();

    const W = 1100;
    const H = 640;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    const c1 = extractDominantColor(avatar1Img);
    const c2 = extractDominantColor(avatar2Img);

    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, W, H);

    if (avatar1Img) {
        const cLeft = createCanvas(W, H);
        const ctxLeft = cLeft.getContext('2d');
        ctxLeft.drawImage(avatar1Img, 0, 0, W * 0.65, H);

        const fadeLeft = ctxLeft.createLinearGradient(0, 0, W * 0.65, 0);
        fadeLeft.addColorStop(0, 'rgba(0, 0, 0, 1)');
        fadeLeft.addColorStop(0.55, 'rgba(0, 0, 0, 0.8)');
        fadeLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxLeft.globalCompositeOperation = 'destination-in';
        ctxLeft.fillStyle = fadeLeft;
        ctxLeft.fillRect(0, 0, W * 0.65, H);

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(cLeft, 0, 0);
        ctx.restore();
    }

    if (avatar2Img) {
        const cRight = createCanvas(W, H);
        const ctxRight = cRight.getContext('2d');
        ctxRight.drawImage(avatar2Img, W * 0.35, 0, W * 0.65, H);

        const fadeRight = ctxRight.createLinearGradient(W * 0.35, 0, W, 0);
        fadeRight.addColorStop(0, 'rgba(0, 0, 0, 0)');
        fadeRight.addColorStop(0.45, 'rgba(0, 0, 0, 0.8)');
        fadeRight.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctxRight.globalCompositeOperation = 'destination-in';
        ctxRight.fillStyle = fadeRight;
        ctxRight.fillRect(W * 0.35, 0, W * 0.65, H);

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(cRight, 0, 0);
        ctx.restore();
    }

    const smoothMix = ctx.createLinearGradient(0, 0, W, 0);
    smoothMix.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.35)`);
    smoothMix.addColorStop(0.3, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.18)`);
    smoothMix.addColorStop(0.5, `rgba(${Math.round((c1.r + c2.r) / 2)}, ${Math.round((c1.g + c2.g) / 2)}, ${Math.round((c1.b + c2.b) / 2)}, 0.28)`);
    smoothMix.addColorStop(0.7, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.18)`);
    smoothMix.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.35)`);
    ctx.fillStyle = smoothMix;
    ctx.fillRect(0, 0, W, H);

    const darkCover = ctx.createLinearGradient(0, 0, 0, H);
    darkCover.addColorStop(0, 'rgba(6, 7, 10, 0.70)');
    darkCover.addColorStop(0.5, 'rgba(10, 12, 18, 0.55)');
    darkCover.addColorStop(1, 'rgba(6, 7, 10, 0.80)');
    ctx.fillStyle = darkCover;
    ctx.fillRect(0, 0, W, H);

    const mainX = 35;
    const mainY = 35;
    const mainW = W - 70;
    const mainH = H - 70;

    drawRoundedRect(ctx, mainX, mainY, mainW, mainH, 28);
    const mainGlass = ctx.createLinearGradient(mainX, mainY, mainX + mainW, mainY + mainH);
    mainGlass.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.15)`);
    mainGlass.addColorStop(0.5, 'rgba(12, 15, 22, 0.55)');
    mainGlass.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.15)`);
    ctx.fillStyle = mainGlass;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 28px "Blackletter", "MetalGothic", "Georgia", serif';
    ctx.fillText('AFFINITY & CHEMISTRY RADAR', W / 2, mainY + 45);

    ctx.font = '12px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('100% REAL DISCORD VC OVERLAP & SOCIAL CONNECTION', W / 2, mainY + 75);
    ctx.restore();

    const u1CardX = 65;
    const u1CardY = 145;
    const u1CardW = 280;
    const u1CardH = 340;

    drawRoundedRect(ctx, u1CardX, u1CardY, u1CardW, u1CardH, 22);
    const u1Glass = ctx.createLinearGradient(u1CardX, u1CardY, u1CardX, u1CardY + u1CardH);
    u1Glass.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.32)`);
    u1Glass.addColorStop(1, 'rgba(5, 7, 12, 0.70)');
    ctx.fillStyle = u1Glass;
    ctx.fill();
    ctx.strokeStyle = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.65)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const avR = 64;
    const u1AvX = u1CardX + u1CardW / 2;
    const u1AvY = u1CardY + 95;

    ctx.save();
    ctx.shadowColor = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.85)`;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(u1AvX, u1AvY, avR + 3, 0, Math.PI * 2);
    ctx.fillStyle = c1.hex;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(u1AvX, u1AvY, avR, 0, Math.PI * 2);
    ctx.clip();
    if (avatar1Img) {
        ctx.drawImage(avatar1Img, u1AvX - avR, u1AvY - avR, avR * 2, avR * 2);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(u1AvX - avR, u1AvY - avR, avR * 2, avR * 2);
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 22px "Blackletter", "MetalGothic", "Georgia", serif';
    const u1Name = data.user1.globalName || data.user1.username;
    ctx.fillText(u1Name.length > 15 ? u1Name.slice(0, 13) + '...' : u1Name, u1AvX, u1CardY + 200);

    ctx.font = '13px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`@${data.user1.username}`, u1AvX, u1CardY + 230);

    const u1BadgeW = 220;
    const u1BadgeH = 32;
    const u1BadgeX = u1AvX - u1BadgeW / 2;
    const u1BadgeY = u1CardY + 265;
    drawRoundedRect(ctx, u1BadgeX, u1BadgeY, u1BadgeW, u1BadgeH, 12);
    ctx.fillStyle = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.18)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.50)`;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px "AprilFont", "Georgia", serif';
    ctx.fillText(data.user1.id, u1AvX, u1BadgeY + u1BadgeH / 2 + 1);
    ctx.restore();

    const u2CardX = W - 65 - 280;
    const u2CardY = 145;
    const u2CardW = 280;
    const u2CardH = 340;

    drawRoundedRect(ctx, u2CardX, u2CardY, u2CardW, u2CardH, 22);
    const u2Glass = ctx.createLinearGradient(u2CardX, u2CardY, u2CardX, u2CardY + u2CardH);
    u2Glass.addColorStop(0, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.28)`);
    u2Glass.addColorStop(1, 'rgba(5, 7, 12, 0.70)');
    ctx.fillStyle = u2Glass;
    ctx.fill();
    ctx.strokeStyle = `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.65)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const u2AvX = u2CardX + u2CardW / 2;
    const u2AvY = u2CardY + 95;

    ctx.save();
    ctx.shadowColor = `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.85)`;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(u2AvX, u2AvY, avR + 3, 0, Math.PI * 2);
    ctx.fillStyle = c2.hex;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(u2AvX, u2AvY, avR, 0, Math.PI * 2);
    ctx.clip();
    if (avatar2Img) {
        ctx.drawImage(avatar2Img, u2AvX - avR, u2AvY - avR, avR * 2, avR * 2);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(u2AvX - avR, u2AvY - avR, avR * 2, avR * 2);
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 22px "Blackletter", "MetalGothic", "Georgia", serif';
    const u2Name = data.user2.globalName || data.user2.username;
    ctx.fillText(u2Name.length > 15 ? u2Name.slice(0, 13) + '...' : u2Name, u2AvX, u2CardY + 200);

    ctx.font = '13px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`@${data.user2.username}`, u2AvX, u2CardY + 230);

    const u2BadgeW = 220;
    const u2BadgeH = 32;
    const u2BadgeX = u2AvX - u2BadgeW / 2;
    const u2BadgeY = u2CardY + 265;
    drawRoundedRect(ctx, u2BadgeX, u2BadgeY, u2BadgeW, u2BadgeH, 12);
    ctx.fillStyle = `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.18)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.50)`;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px "AprilFont", "Georgia", serif';
    ctx.fillText(data.user2.id, u2AvX, u2BadgeY + u2BadgeH / 2 + 1);
    ctx.restore();

    const cX = W / 2;

    drawVectorHeart(ctx, cX, 195, 46, c1.hex, c2.hex);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = `rgba(${Math.round((c1.r + c2.r) / 2)}, ${Math.round((c1.g + c2.g) / 2)}, ${Math.round((c1.b + c2.b) / 2)}, 0.9)`;
    ctx.shadowBlur = 22;
    ctx.font = 'bold 58px "AprilFont", "Georgia", serif';
    ctx.fillText(`${data.compatibility}%`, cX, 265);

    const barW = 280;
    const barH = 12;
    const barX = cX - barW / 2;
    const barY = 305;

    drawRoundedRect(ctx, barX, barY, barW, barH, 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    const fillW = Math.max(8, (barW * data.compatibility) / 100);
    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    barGrad.addColorStop(0, c1.hex);
    barGrad.addColorStop(1, c2.hex);

    drawRoundedRect(ctx, barX, barY, fillW, barH, 6);
    ctx.fillStyle = barGrad;
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 22px "Blackletter", "MetalGothic", "Georgia", serif';
    ctx.fillText(data.statusTitle.toUpperCase(), cX, 350);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px "AprilFont", "Georgia", serif';
    const phrase = data.statusPhrase;
    ctx.fillText(phrase.length > 38 ? phrase.slice(0, 36) + '...' : phrase, cX, 385);

    const sharedBoxW = 280;
    const sharedBoxH = 44;
    const sharedBoxX = cX - sharedBoxW / 2;
    const sharedBoxY = 422;

    drawRoundedRect(ctx, sharedBoxX, sharedBoxY, sharedBoxW, sharedBoxH, 14);
    const sharedGrad = ctx.createLinearGradient(sharedBoxX, 0, sharedBoxX + sharedBoxW, 0);
    sharedGrad.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.30)`);
    sharedGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
    sharedGrad.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.30)`);
    ctx.fillStyle = sharedGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "AprilFont", "Georgia", serif';
    ctx.fillText(`🎙️ ${data.sharedTimeFormatted} Together in VC`, cX, sharedBoxY + sharedBoxH / 2 + 1);
    ctx.restore();

    const botY = 515;
    const botH = 65;
    const botW = mainW - 60;
    const botX = mainX + 30;

    drawRoundedRect(ctx, botX, botY, botW, botH, 18);
    const botGlass = ctx.createLinearGradient(botX, botY, botX + botW, botY + botH);
    botGlass.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.15)`);
    botGlass.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
    botGlass.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.15)`);
    ctx.fillStyle = botGlass;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const colW = botW / 3;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "AprilFont", "Georgia", serif';
    ctx.fillText('MUTUAL GUILDS', botX + colW * 0.5, botY + 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
    ctx.fillText(`${data.mutualServersCount} Shared Servers`, botX + colW * 0.5, botY + 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "AprilFont", "Georgia", serif';
    ctx.fillText('CO-PRESENCE VC OVERLAP', botX + colW * 1.5, botY + 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
    ctx.fillText(data.sharedTimeFormatted, botX + colW * 1.5, botY + 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "AprilFont", "Georgia", serif';
    ctx.fillText('LIVE ROOM STATUS', botX + colW * 2.5, botY + 22);
    ctx.fillStyle = data.inSameVoice ? '#4ade80' : '#e2e8f0';
    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
    ctx.fillText(data.inSameVoice ? '🎙️ In Same Channel' : (data.user1.inVoice && data.user2.inVoice ? 'In Different Channels' : 'Not in Voice'), botX + colW * 2.5, botY + 45);

    ctx.restore();

    return canvas.toBuffer('image/png');
}
