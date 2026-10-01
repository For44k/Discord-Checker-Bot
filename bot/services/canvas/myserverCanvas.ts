import { createCanvas, Image, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { initGlobalFonts } from './fontLoader';
import { FastCache } from '../../cache/fastCache';

function loadAllBackgrounds(): Image[] {
    const bgDir = path.resolve(process.cwd(), 'bot/assets/images');
    const images: Image[] = [];
    if (fs.existsSync(bgDir)) {
        const files = fs.readdirSync(bgDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();
        for (const f of files) {
            try {
                const buf = fs.readFileSync(path.join(bgDir, f));
                const img = new Image();
                img.src = buf;
                images.push(img);
            } catch {}
        }
    }
    return images;
}

const loadedBackgrounds: Image[] = loadAllBackgrounds();

export function drawCoverImage(ctx: any, img: Image, w: number, h: number): void {
    const imgRatio = img.width / img.height;
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

export function resolveIconUrl(guildId?: string, icon?: string | null): string | null {
    if (!icon) return null;
    if (/^https?:\/\//i.test(icon)) return icon;
    if (!guildId) return null;
    const ext = icon.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=128`;
}

const serverIconCache = new FastCache<Image>(300000, 200);

export async function loadServerIcon(url?: string | null): Promise<Image | null> {
    if (!url) return null;
    const cached = serverIconCache.get(url);
    if (cached) return cached;
    try {
        const img = await Promise.race([
            loadImage(url).catch(() => null),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 350))
        ]);
        if (img) {
            serverIconCache.set(url, img);
        }
        return img;
    } catch {
        return null;
    }
}

export interface ServerPalette {
    primary: string;
    secondary: string;
    textAccent: string;
    glow: string;
    border: string;
    badgeBg: [string, string];
    badgeText: string;
    hexInt: number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

export function extractServerPalette(icon: Image | null, rank: number): ServerPalette {
    if (rank === 1) {
        return {
            primary: '#fbbf24',
            secondary: '#d97706',
            textAccent: '#fde68a',
            glow: 'rgba(251, 191, 36, 0.65)',
            border: 'rgba(251, 191, 36, 0.75)',
            badgeBg: ['rgba(234, 179, 8, 0.45)', 'rgba(245, 158, 11, 0.75)'],
            badgeText: '#fbbf24',
            hexInt: 0xFBBF24
        };
    }
    if (rank === 2) {
        return {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            textAccent: '#ffffff',
            glow: 'rgba(248, 250, 252, 0.55)',
            border: 'rgba(255, 255, 255, 0.6)',
            badgeBg: ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.5)'],
            badgeText: '#ffffff',
            hexInt: 0xF8FAFC
        };
    }
    if (rank === 3) {
        return {
            primary: '#f97316',
            secondary: '#c2410c',
            textAccent: '#fed7aa',
            glow: 'rgba(249, 115, 22, 0.6)',
            border: 'rgba(249, 115, 22, 0.65)',
            badgeBg: ['rgba(180, 83, 9, 0.45)', 'rgba(146, 64, 14, 0.75)'],
            badgeText: '#fcd34d',
            hexInt: 0xF97316
        };
    }

    let dominantH = 0.58;
    let dominantS = 0;
    let dominantL = 0.8;
    let hasColor = false;

    if (icon) {
        try {
            const canvas = createCanvas(32, 32);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(icon, 0, 0, 32, 32);
            const imgData = ctx.getImageData(0, 0, 32, 32).data;

            const hueBuckets = new Array(12).fill(0);
            const satSums = new Array(12).fill(0);
            const lightSums = new Array(12).fill(0);

            let totalColored = 0;
            let totalLum = 0;
            let sampleCount = 0;

            for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                const a = imgData[i + 3];

                if (a < 120) continue;
                const [h, s, l] = rgbToHsl(r, g, b);
                totalLum += l;
                sampleCount++;

                if (l < 0.1 || l > 0.9) continue;

                if (s > 0.16) {
                    const bucket = Math.floor(h * 12) % 12;
                    hueBuckets[bucket]++;
                    satSums[bucket] += s;
                    lightSums[bucket] += l;
                    totalColored++;
                }
            }

            if (totalColored > 15) {
                let maxCount = 0;
                let bestBucket = 0;
                for (let b = 0; b < 12; b++) {
                    if (hueBuckets[b] > maxCount) {
                        maxCount = hueBuckets[b];
                        bestBucket = b;
                    }
                }
                dominantH = (bestBucket + 0.5) / 12;
                dominantS = Math.min(0.85, Math.max(0.45, satSums[bestBucket] / maxCount));
                dominantL = Math.min(0.72, Math.max(0.55, lightSums[bestBucket] / maxCount));
                hasColor = true;
            } else if (sampleCount > 0) {
                dominantS = 0;
                dominantL = 0.85;
                hasColor = false;
            }
        } catch {}
    }

    if (!hasColor) {

        return {
            primary: '#e2e8f0',
            secondary: '#94a3b8',
            textAccent: '#f8fafc',
            glow: 'rgba(255, 255, 255, 0.4)',
            border: 'rgba(255, 255, 255, 0.3)',
            badgeBg: ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.35)'],
            badgeText: '#ffffff',
            hexInt: 0xE2E8F0
        };
    }

    const [pr, pg, pb] = hslToRgb(dominantH, dominantS, dominantL);
    const [sr, sg, sb] = hslToRgb(dominantH, dominantS * 0.85, Math.max(0.35, dominantL * 0.7));
    const [tr, tg, tb] = hslToRgb(dominantH, dominantS * 0.75, Math.min(0.92, dominantL + 0.18));

    const hexInt = ((pr & 0xff) << 16) | ((pg & 0xff) << 8) | (pb & 0xff);

    return {
        primary: `rgb(${pr}, ${pg}, ${pb})`,
        secondary: `rgb(${sr}, ${sg}, ${sb})`,
        textAccent: `rgb(${tr}, ${tg}, ${tb})`,
        glow: `rgba(${pr}, ${pg}, ${pb}, 0.55)`,
        border: `rgba(${pr}, ${pg}, ${pb}, 0.45)`,
        badgeBg: [`rgba(${pr}, ${pg}, ${pb}, 0.22)`, `rgba(${pr}, ${pg}, ${pb}, 0.52)`],
        badgeText: `rgb(${tr}, ${tg}, ${tb})`,
        hexInt
    };
}

export function buildServerStatsCard(
    server: any,
    rank: number,
    totalServers: number,
    totalVoice: number,
    maxScore: number,
    serverIcon?: Image | null,
    bgIndex?: number
): { buffer: Buffer; palette: ServerPalette } {
    initGlobalFonts();

    const palette = extractServerPalette(serverIcon || null, rank);

    const scale = 1.0;
    const width = 1100;
    const height = 440;

    const canvas = createCanvas(Math.round(width * scale), Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (scale !== 1.0) ctx.scale(scale, scale);


    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);


    if (loadedBackgrounds.length > 0) {
        const idx = typeof bgIndex === 'number'
            ? (bgIndex % loadedBackgrounds.length)
            : Math.floor(Math.random() * loadedBackgrounds.length);
        const bgImg = loadedBackgrounds[idx];
        ctx.save();
        drawCoverImage(ctx, bgImg, width, height);
        ctx.restore();
    }


    ctx.save();
    const lightVeil = ctx.createLinearGradient(0, 0, 0, height);
    lightVeil.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
    lightVeil.addColorStop(0.35, 'rgba(0, 0, 0, 0.28)');
    lightVeil.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = lightVeil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();


    ctx.save();
    const titleCenter = width / 2;
    const titleY = 44;
    const titleText = 'SERVER VOICE STATS';
    ctx.font = 'bold 30px "Blackletter", "MetalGothic", "Georgia", serif';
    const tm = ctx.measureText(titleText);
    const pillW = tm.width + 48;
    const pillH = 38;
    const pillX = titleCenter - pillW / 2;
    const pillY = titleY - 24;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, 20);
    } else {
        ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, titleCenter, pillY + pillH / 2 + 1);
    ctx.restore();


    const cardX = 50;
    const cardY = 82;
    const cardW = width - 100;
    const cardH = 320;

    const rankBadgeText = `#${rank} RANK`;


    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    } else {
        ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();

    const cardGlass = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGlass.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    cardGlass.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    cardGlass.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = cardGlass;
    ctx.fill();

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = rank <= 3 ? 2 : 1.2;
    ctx.stroke();
    ctx.restore();


    const avRadius = 60;
    const avX = cardX + 90;
    const avY = cardY + 115;


    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(avX, avY, avRadius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();


    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
    ctx.clip();
    if (serverIcon) {
        ctx.drawImage(serverIcon, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px "Blackletter", "MetalGothic", "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((server.name || server.tag || 'S').charAt(0).toUpperCase(), avX, avY);
    }
    ctx.restore();


    const badgeW = 120;
    const badgeH = 34;
    const badgeX = avX - badgeW / 2;
    const badgeY = avY + avRadius + 22;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
    } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    const badgeGrad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0);
    badgeGrad.addColorStop(0, palette.badgeBg[0]);
    badgeGrad.addColorStop(1, palette.badgeBg[1]);
    ctx.fillStyle = badgeGrad;
    ctx.fill();

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = palette.badgeText;
    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rankBadgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
    ctx.restore();


    const rightStartX = cardX + 195;


    let serverName = server.name || server.tag || server.guildName || 'Unknown Server';
    if (serverName.length > 28) serverName = serverName.slice(0, 26) + '...';

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 36px "Blackletter", "MetalGothic", "Georgia", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(serverName, rightStartX, cardY + 54);
    ctx.restore();


    const membersCount = server.membersCount || server.memberCount || 0;
    const serverId = server.id || server.guildId || 'N/A';
    ctx.save();
    ctx.font = '15px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(`👥 ${membersCount.toLocaleString()} Members   •   🆔 ${serverId}`, rightStartX, cardY + 82);
    ctx.restore();


    const scoreVal = server.score || server.voiceCount || 0;
    const shareVal = totalVoice > 0 ? `${(((scoreVal) / totalVoice) * 100).toFixed(1)}%` : '0.0%';

    const statBoxes = [
        {
            title: 'VOICE SCORE',
            value: scoreVal.toLocaleString(),
            color: '#ffffff',
            desc: 'Activity Score'
        },
        {
            title: 'GLOBAL RANK',
            value: `#${rank} / ${totalServers}`,
            color: palette.textAccent,
            desc: 'Voice Ranking'
        },
        {
            title: 'VOICE SHARE',
            value: shareVal,
            color: palette.textAccent,
            desc: 'Network Share'
        }
    ];

    const boxW = 240;
    const boxH = 92;
    const boxY = cardY + 110;
    const boxGap = 20;

    statBoxes.forEach((stat, idx) => {
        const bx = rightStartX + idx * (boxW + boxGap);

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bx, boxY, boxW, boxH, 16);
        } else {
            ctx.rect(bx, boxY, boxW, boxH);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        const boxGrad = ctx.createLinearGradient(bx, boxY, bx, boxY + boxH);
        boxGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        boxGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = boxGrad;
        ctx.fill();

        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1;
        ctx.stroke();


        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px "AprilFont", "Georgia", serif';
        ctx.textAlign = 'left';
        ctx.fillText(stat.title, bx + 16, boxY + 24);


        ctx.fillStyle = stat.color;
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 26px "AprilFont", "Georgia", serif';
        ctx.fillText(stat.value, bx + 16, boxY + 58);


        ctx.fillStyle = '#64748b';
        ctx.font = '11px "AprilFont", "Georgia", serif';
        ctx.fillText(stat.desc, bx + 16, boxY + 76);
        ctx.restore();
    });


    const barX = rightStartX;
    const barY = cardY + 235;
    const barW = cardW - 220;
    const barH = 12;

    const ratio = maxScore > 0 ? Math.min(1.0, scoreVal / maxScore) : 0;
    const fillW = Math.max(6, ratio * barW);


    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(barX, barY, barW, barH, 6);
    } else {
        ctx.rect(barX, barY, barW, barH);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();


    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    barGrad.addColorStop(0, palette.secondary);
    barGrad.addColorStop(1, palette.primary);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(barX, barY, fillW, barH, 6);
    } else {
        ctx.rect(barX, barY, fillW, barH);
    }
    ctx.fillStyle = barGrad;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();


    ctx.save();
    ctx.font = '12px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(`Relative Voice Strength: ${(ratio * 100).toFixed(1)}% of #1 Leader (${maxScore.toLocaleString()} score)`, barX, barY + 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Total Network Voice: ${totalVoice.toLocaleString()}`, barX + barW, barY + 28);
    ctx.restore();

    return {
        buffer: canvas.toBuffer('image/png'),
        palette
    };
}
