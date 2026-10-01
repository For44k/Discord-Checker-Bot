import { createCanvas, loadImage, Image } from '@napi-rs/canvas';
import { initGlobalFonts } from './fontLoader';
import { FastCache } from '../../cache/fastCache';

export interface ActivityCanvasData {
    user: {
        username: string;
        displayName: string;
        avatarUrl: string;
        status: string;
    };
    activityType: 'spotify' | 'game' | 'streaming' | 'custom' | 'idle';
    title: string;
    subtitle?: string;
    extraDetails?: string;
    artworkUrl?: string | null;
    timestamps?: {
        start?: number | null;
        end?: number | null;
    } | null;
    clientDevices?: {
        desktop?: boolean;
        mobile?: boolean;
        web?: boolean;
    };
}


const imageMemoryCache = new FastCache<Image>(300000, 200);

async function fetchImageSafe(url?: string | null, timeoutMs = 1500): Promise<Image | null> {
    if (!url) return null;
    const cached = imageMemoryCache.get(url);
    if (cached) return cached;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        const img = await loadImage(Buffer.from(arrayBuf));
        imageMemoryCache.set(url, img);
        return img;
    } catch {
        return null;
    }
}

function drawCoverImage(ctx: any, img: Image, w: number, h: number): void {
    const imgRatio = (img.width || 1) / (img.height || 1);
    const canvasRatio = w / h;
    let renderW = w;
    let renderH = h;
    let renderX = 0;
    let renderY = 0;

    if (imgRatio > canvasRatio) {
        renderW = h * imgRatio;
        renderX = (w - renderW) / 2;
    } else {
        renderH = w / imgRatio;
        renderY = (h - renderH) / 2;
    }

    ctx.drawImage(img, renderX, renderY, renderW, renderH);
}

function formatDuration(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remMinutes = minutes % 60;
        return `${hours}:${remMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


function drawClockIcon(ctx: any, cx: number, cy: number, r: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.55);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + r * 0.45, cy);
    ctx.stroke();
    ctx.restore();
}

function drawDesktopIcon(ctx: any, cx: number, cy: number, size: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = size * 0.9;
    const h = size * 0.6;
    const x = cx - w / 2;
    const y = cy - h * 0.65;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, 2);
    } else {
        ctx.rect(x, y, w, h);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, y + h);
    ctx.lineTo(cx, y + h + size * 0.22);
    ctx.stroke();

    const baseW = size * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - baseW / 2, y + h + size * 0.22);
    ctx.lineTo(cx + baseW / 2, y + h + size * 0.22);
    ctx.stroke();
    ctx.restore();
}

function drawMobileIcon(ctx: any, cx: number, cy: number, size: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = size * 0.52;
    const h = size * 0.85;
    const x = cx - w / 2;
    const y = cy - h / 2;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, 3);
    } else {
        ctx.rect(x, y, w, h);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, y + h - 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGamepadBadgeIcon(ctx: any, cx: number, cy: number, size: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = size * 0.85;
    const h = size * 0.55;
    const x = cx - w / 2;
    const y = cy - h / 2;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, 4);
    } else {
        ctx.rect(x, y, w, h);
    }
    ctx.stroke();

    const dpadX = cx - w * 0.24;
    const dpadY = cy;
    const arm = size * 0.12;
    ctx.beginPath();
    ctx.moveTo(dpadX - arm, dpadY);
    ctx.lineTo(dpadX + arm, dpadY);
    ctx.moveTo(dpadX, dpadY - arm);
    ctx.lineTo(dpadX + arm, dpadY);
    ctx.stroke();

    const btnX = cx + w * 0.24;
    ctx.beginPath();
    ctx.arc(btnX, cy - arm * 0.6, 1.5, 0, Math.PI * 2);
    ctx.arc(btnX, cy + arm * 0.6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawVectorIcon(ctx: any, cx: number, cy: number, size: number, type: 'spotify' | 'game' | 'streaming' | 'custom' | 'idle', color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, size * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'spotify') {
        const r1 = size * 0.42;
        const r2 = size * 0.30;
        const r3 = size * 0.18;

        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.12, r1, -Math.PI * 0.82, -Math.PI * 0.18);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.16, r2, -Math.PI * 0.80, -Math.PI * 0.20);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.20, r3, -Math.PI * 0.78, -Math.PI * 0.22);
        ctx.stroke();
    } else if (type === 'game') {
        drawGamepadBadgeIcon(ctx, cx, cy, size * 0.9, color);
    } else if (type === 'streaming') {
        const s = size * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.6, cy - s);
        ctx.lineTo(cx + s, cy);
        ctx.lineTo(cx - s * 0.6, cy + s);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawStatusIndicator(ctx: any, x: number, y: number, radius: number, status: string): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0e17';
    ctx.fill();

    const s = (status || 'offline').toLowerCase();
    if (s === 'online') {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#23a55a';
        ctx.fill();
    } else if (s === 'idle') {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f0b232';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#0b0e17';
        ctx.fill();
    } else if (s === 'dnd') {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f23f43';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - radius * 0.65, y - radius * 0.2, radius * 1.3, radius * 0.4);
    } else {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#80848e';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0b0e17';
        ctx.fill();
    }
    ctx.restore();
}

function truncateText(ctx: any, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return truncated.trim() + '...';
}

export async function buildActivityCanvas(data: ActivityCanvasData): Promise<Buffer> {
    initGlobalFonts();

    const width = 1000;
    const height = 400;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');


    const [artworkImg, avatarImg] = await Promise.all([
        fetchImageSafe(data.artworkUrl),
        fetchImageSafe(data.user.avatarUrl)
    ]);


    const isSpotify = data.activityType === 'spotify';
    const isStreaming = data.activityType === 'streaming';
    const isGame = data.activityType === 'game';

    let primaryAccent = '#1DB954';
    let secondaryAccent = '#1ed760';
    let badgeText = 'SPOTIFY • NOW LISTENING';

    if (isStreaming) {
        primaryAccent = '#9146FF';
        secondaryAccent = '#bf94ff';
        badgeText = 'TWITCH • LIVE STREAMING';
    } else if (isGame) {
        primaryAccent = '#5865F2';
        secondaryAccent = '#7289da';
        badgeText = 'DISCORD • NOW PLAYING';
    } else if (data.activityType === 'custom') {
        primaryAccent = '#00F0FF';
        secondaryAccent = '#7000FF';
        badgeText = 'STATUS • USER PRESENCE';
    } else if (data.activityType === 'idle') {
        primaryAccent = '#64748b';
        secondaryAccent = '#94a3b8';
        badgeText = 'CLIENT • IDLE / ACTIVE';
    }


    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);


    const bgImage = artworkImg || avatarImg;
    if (bgImage) {
        ctx.save();
        try {
            ctx.filter = 'blur(3px)';
        } catch { }
        drawCoverImage(ctx, bgImage, width, height);
        ctx.restore();
    }


    ctx.save();
    const lightVeil = ctx.createLinearGradient(0, 0, 0, height);
    lightVeil.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    lightVeil.addColorStop(0.5, 'rgba(0, 0, 0, 0.48)');
    lightVeil.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = lightVeil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();


    const cardX = 22;
    const cardY = 20;
    const cardW = width - 44;
    const cardH = height - 40;
    const cardRadius = 18;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    } else {
        ctx.rect(cardX, cardY, cardW, cardH);
    }

    ctx.fillStyle = 'rgba(10, 14, 24, 0.45)';
    ctx.fill();


    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, `${primaryAccent}aa`);
    borderGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.28)');
    borderGrad.addColorStop(0.7, `${secondaryAccent}66`);
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();


    const artX = 48;
    const artY = 46;
    const artSize = 308;
    const artRadius = 14;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(artX, artY, artSize, artSize, artRadius);
    } else {
        ctx.rect(artX, artY, artSize, artSize);
    }
    ctx.clip();

    if (artworkImg) {
        ctx.drawImage(artworkImg, artX, artY, artSize, artSize);
    } else if (avatarImg) {
        ctx.drawImage(avatarImg, artX, artY, artSize, artSize);
    } else {
        const fallGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
        fallGrad.addColorStop(0, '#1a2234');
        fallGrad.addColorStop(1, '#0e1422');
        ctx.fillStyle = fallGrad;
        ctx.fillRect(artX, artY, artSize, artSize);

        drawVectorIcon(ctx, artX + artSize / 2, artY + artSize / 2, 60, data.activityType, primaryAccent);
    }


    const sheen = ctx.createLinearGradient(artX, artY, artX, artY + artSize);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.0)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
    ctx.fillStyle = sheen;
    ctx.fillRect(artX, artY, artSize, artSize);


    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();


    if (isSpotify || isGame || isStreaming) {
        const badgeIconSize = 38;
        const bx = artX + artSize - badgeIconSize - 8;
        const by = artY + artSize - badgeIconSize - 8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx + badgeIconSize / 2, by + badgeIconSize / 2, badgeIconSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0e18';
        ctx.fill();
        ctx.strokeStyle = primaryAccent;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        drawVectorIcon(ctx, bx + badgeIconSize / 2, by + badgeIconSize / 2, 18, data.activityType, primaryAccent);
        ctx.restore();
    }


    const contentX = artX + artSize + 32;
    const contentMaxW = cardX + cardW - contentX - 24;


    const topBadgeY = 50;
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    const badgeMetrics = ctx.measureText(badgeText);
    const pillW = badgeMetrics.width + 28;
    const pillH = 24;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(contentX, topBadgeY, pillW, pillH, 12);
    } else {
        ctx.rect(contentX, topBadgeY, pillW, pillH);
    }
    ctx.fillStyle = `${primaryAccent}26`;
    ctx.fill();
    ctx.strokeStyle = `${primaryAccent}88`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(contentX + 12, topBadgeY + pillH / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = primaryAccent;
    ctx.fill();

    ctx.fillStyle = primaryAccent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, contentX + 21, topBadgeY + pillH / 2 + 0.5);
    ctx.restore();


    if (avatarImg) {
        const uAvatarSize = 32;
        const uAvatarX = cardX + cardW - uAvatarSize - 24;
        const uAvatarY = topBadgeY - 4;

        ctx.save();
        ctx.beginPath();
        ctx.arc(uAvatarX + uAvatarSize / 2, uAvatarY + uAvatarSize / 2, uAvatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, uAvatarX, uAvatarY, uAvatarSize, uAvatarSize);
        ctx.restore();

        drawStatusIndicator(ctx, uAvatarX + uAvatarSize - 3, uAvatarY + uAvatarSize - 3, 5, data.user.status);

        ctx.save();
        ctx.font = '600 12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const userLabel = truncateText(ctx, `@${data.user.username}`, 160);
        ctx.fillText(userLabel, uAvatarX - 10, uAvatarY + uAvatarSize / 2);
        ctx.restore();
    }


    const titleY = topBadgeY + 48;
    ctx.save();
    ctx.font = 'bold 26px "Segoe UI", "Apple Color Emoji", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const cleanTitle = truncateText(ctx, data.title || 'Unknown Activity', contentMaxW);
    ctx.fillText(cleanTitle, contentX, titleY);
    ctx.restore();


    const subTitleY = titleY + 38;
    ctx.save();
    ctx.font = '600 17px "Segoe UI", sans-serif';
    ctx.fillStyle = primaryAccent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const cleanSub = truncateText(ctx, data.subtitle ? (isSpotify ? `by ${data.subtitle}` : data.subtitle) : (isSpotify ? 'Unknown Artist' : ''), contentMaxW);
    if (cleanSub) {
        ctx.fillText(cleanSub, contentX, subTitleY);
    }
    ctx.restore();


    const extraY = subTitleY + 28;
    if (data.extraDetails) {
        ctx.save();
        ctx.font = '500 14px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(200, 215, 240, 0.9)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 5;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const prefix = isSpotify ? 'on ' : '';
        const cleanExtra = truncateText(ctx, `${prefix}${data.extraDetails}`, contentMaxW);
        ctx.fillText(cleanExtra, contentX, extraY);
        ctx.restore();
    }


    if (isSpotify) {
        const eqX = cardX + cardW - 130;
        const eqY = extraY + 2;
        const barCount = 7;
        const heights = [12, 22, 16, 28, 20, 24, 14];

        ctx.save();
        for (let i = 0; i < barCount; i++) {
            const bx = eqX + i * 15;
            const bH = heights[i % heights.length];
            const by = eqY + (28 - bH);

            const barGrad = ctx.createLinearGradient(bx, by, bx, by + bH);
            barGrad.addColorStop(0, primaryAccent);
            barGrad.addColorStop(1, `${primaryAccent}44`);
            ctx.fillStyle = barGrad;

            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(bx, by, 5, bH, 2.5);
            } else {
                ctx.fillRect(bx, by, 5, bH);
            }
            ctx.fill();
        }
        ctx.restore();
    }


    const now = Date.now();

    if (isSpotify && data.timestamps?.start && data.timestamps?.end) {

        const start = data.timestamps.start;
        const end = data.timestamps.end;
        const totalMs = Math.max(1000, end - start);
        const currentMs = Math.max(0, Math.min(totalMs, now - start));
        const progressRatio = Math.max(0, Math.min(1, currentMs / totalMs));

        const progressY = cardY + cardH - 66;
        const progressH = 5;
        const progressW = contentMaxW;


        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(contentX, progressY, progressW, progressH, 2.5);
        } else {
            ctx.rect(contentX, progressY, progressW, progressH);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();


        const filledW = Math.max(5, Math.min(progressW, progressW * progressRatio));
        const fillGrad = ctx.createLinearGradient(contentX, progressY, contentX + filledW, progressY);
        fillGrad.addColorStop(0, primaryAccent);
        fillGrad.addColorStop(1, secondaryAccent);

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(contentX, progressY, filledW, progressH, 2.5);
        } else {
            ctx.rect(contentX, progressY, filledW, progressH);
        }
        ctx.fillStyle = fillGrad;
        ctx.fill();


        const knobX = contentX + filledW;
        const knobY = progressY + progressH / 2;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();


        const timeY = progressY + 14;
        ctx.save();
        ctx.font = '600 12px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.textBaseline = 'top';


        ctx.textAlign = 'left';
        ctx.fillText(formatDuration(currentMs), contentX, timeY);


        ctx.textAlign = 'center';
        ctx.fillStyle = primaryAccent;
        ctx.fillText(`${Math.round(progressRatio * 100)}%`, contentX + progressW / 2, timeY);


        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(formatDuration(totalMs), contentX + progressW, timeY);
        ctx.restore();
    } else {

        const bottomY = cardY + cardH - 56;
        let elapsedStr = 'Active';

        if (data.timestamps?.start) {
            const currentMs = Math.max(0, now - data.timestamps.start);
            elapsedStr = `Elapsed: ${formatDuration(currentMs)}`;
        }


        ctx.save();
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        const timerMetrics = ctx.measureText(elapsedStr);
        const pill1W = timerMetrics.width + 40;
        const pillH = 30;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(contentX, bottomY, pill1W, pillH, 7);
        } else {
            ctx.rect(contentX, bottomY, pill1W, pillH);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();
        ctx.strokeStyle = `${primaryAccent}77`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        drawClockIcon(ctx, contentX + 16, bottomY + pillH / 2, 6, primaryAccent);

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(elapsedStr, contentX + 28, bottomY + pillH / 2 + 0.5);
        ctx.restore();


        const pill2X = contentX + pill1W + 12;
        const isDesktop = data.clientDevices?.desktop;
        const isMobile = data.clientDevices?.mobile;
        const deviceText = isDesktop ? 'Desktop PC' : (isMobile ? 'Mobile Device' : (isGame ? 'In-Game Client' : 'Active Session'));

        ctx.save();
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        const devMetrics = ctx.measureText(deviceText);
        const pill2W = devMetrics.width + 40;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(pill2X, bottomY, pill2W, pillH, 7);
        } else {
            ctx.rect(pill2X, bottomY, pill2W, pillH);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (isDesktop) {
            drawDesktopIcon(ctx, pill2X + 16, bottomY + pillH / 2, 12, primaryAccent);
        } else if (isMobile) {
            drawMobileIcon(ctx, pill2X + 16, bottomY + pillH / 2, 12, primaryAccent);
        } else {
            drawGamepadBadgeIcon(ctx, pill2X + 16, bottomY + pillH / 2, 13, primaryAccent);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(deviceText, pill2X + 28, bottomY + pillH / 2 + 0.5);
        ctx.restore();


        const liveTagX = cardX + cardW - 120;
        ctx.save();
        ctx.beginPath();
        ctx.arc(liveTagX - 8, bottomY + pillH / 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#23a55a';
        ctx.fill();

        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#23a55a';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('LIVE TELEMETRY', liveTagX, bottomY + pillH / 2);
        ctx.restore();
    }

    return canvas.toBuffer('image/png');
}
