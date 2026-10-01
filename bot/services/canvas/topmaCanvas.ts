import { createCanvas, Image, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { initGlobalFonts } from './fontLoader';

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

export function buildPNGPageFrame(
    servers: any[],
    page: number,
    totalPages: number,
    totalVoice: number,
    iconMap: Map<string, Image>,
    bgIndex?: number
): Buffer {
    initGlobalFonts();

    const scale = 1.0;
    const width = 1100;
    const isFirstPage = page === 1;

    let height: number;
    let topServers: any[] = [];
    let listServers: any[] = [];

    if (isFirstPage) {
        topServers = servers.slice(0, 3);
        listServers = servers.slice(3);
        const topPodiumH = 265;
        const listCardH = 80;
        height = 100 + (topServers.length ? topPodiumH + 20 : 0) + (listServers.length * (listCardH + 12)) + 35;
    } else {
        listServers = servers;
        const listCardH = 80;
        height = 100 + (listServers.length * (listCardH + 12)) + 35;
    }

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
    lightVeil.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
    lightVeil.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)');
    lightVeil.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = lightVeil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    const titleCenter = width / 2;
    const titleY = 48;

    const titleText = 'TOP SERVERS BY VOICE';
    ctx.font = 'bold 32px "Blackletter", "MetalGothic", "Georgia", serif';
    const tm = ctx.measureText(titleText);
    const pillW = tm.width + 48;
    const pillH = 40;
    const pillX = titleCenter - pillW / 2;
    const pillY = titleY - 25;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, 20);
    } else {
        ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, titleCenter, pillY + pillH / 2 + 1);
    ctx.restore();

    let currentY = 90;

    if (isFirstPage && topServers.length > 0) {
        const topPodiumH = 265;
        const podiumOrder = [
            { server: topServers[1], rank: 2, x: 40, w: 325, color: 'rgba(255, 255, 255, 0.35)' },
            { server: topServers[0], rank: 1, x: 385, w: 330, color: 'rgba(251, 191, 36, 0.7)' },
            { server: topServers[2], rank: 3, x: 735, w: 325, color: 'rgba(249, 115, 22, 0.6)' },
        ];

        podiumOrder.forEach(podium => {
            const s = podium.server;
            if (!s) return;

            const x = podium.x;
            const y = podium.rank === 1 ? currentY : currentY + 16;
            const w = podium.w;
            const h = podium.rank === 1 ? topPodiumH : topPodiumH - 16;
            const img = iconMap.get(s.id);

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, w, h, 20);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fill();

            const glassOverlay = ctx.createLinearGradient(x, y, x, y + h);
            glassOverlay.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            glassOverlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
            glassOverlay.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
            ctx.fillStyle = glassOverlay;
            ctx.fill();

            ctx.strokeStyle = podium.rank === 1 ? 'rgba(251, 191, 36, 0.75)' : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = podium.rank === 1 ? 2 : 1.2;
            ctx.stroke();
            ctx.restore();

            const avRadius = podium.rank === 1 ? 50 : 42;
            const avX = x + w / 2;
            const avY = y + 68;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
            ctx.clip();
            if (img) {
                ctx.drawImage(img, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
            } else {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 30px "Blackletter", "MetalGothic", "Georgia", serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText((s.name || 'S').charAt(0).toUpperCase(), avX, avY);
            }
            ctx.restore();

            let nameStr = s.name || 'Unknown Server';
            if (nameStr.length > 20) nameStr = nameStr.slice(0, 18) + '...';

            ctx.save();
            const textCenter = x + w / 2;
            const textY = y + 146;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 26px "Blackletter", "MetalGothic", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText(nameStr, textCenter, textY);
            ctx.restore();

            ctx.save();
            ctx.font = '13px "AprilFont", "Georgia", serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 6;
            ctx.fillText(`👥 ${(s.membersCount || 0).toLocaleString()} Members`, x + w / 2, y + 172);
            ctx.restore();

            const scoreStr = (s.score || 0).toLocaleString();
            ctx.font = 'bold 20px "AprilFont", "Georgia", serif';
            const textMetrics = ctx.measureText(scoreStr);
            const scoreBoxW = Math.max(85, textMetrics.width + 30);
            const scoreBoxH = 30;
            const scoreBoxX = x + w / 2 - scoreBoxW / 2;
            const scoreBoxY = y + 190;

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 10);
            } else {
                ctx.rect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(scoreStr, x + w / 2, scoreBoxY + scoreBoxH / 2 + 1);
            ctx.restore();

            const badgeW = 86;
            const badgeH = 26;
            const badgeX = x + w - badgeW - 12;
            const badgeY = y + h - badgeH - 12;

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
            } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            const badgeGrad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW, 0);
            if (podium.rank === 1) {
                badgeGrad.addColorStop(0, 'rgba(234, 179, 8, 0.45)');
                badgeGrad.addColorStop(1, 'rgba(245, 158, 11, 0.7)');
                ctx.strokeStyle = '#f59e0b';
            } else if (podium.rank === 2) {
                badgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                badgeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            } else {
                badgeGrad.addColorStop(0, 'rgba(180, 83, 9, 0.45)');
                badgeGrad.addColorStop(1, 'rgba(146, 64, 14, 0.7)');
                ctx.strokeStyle = '#b45309';
            }
            ctx.fillStyle = badgeGrad;
            ctx.fill();
            ctx.lineWidth = 1.4;
            ctx.stroke();

            ctx.fillStyle = podium.rank === 1 ? '#fbbf24' : (podium.rank === 2 ? '#ffffff' : '#fcd34d');
            ctx.font = 'bold 13px "AprilFont", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${podium.rank} RANK`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
            ctx.restore();
        });

        currentY += topPodiumH + 20;
    }

    const listCardH = 80;
    for (let i = 0; i < listServers.length; i++) {
        const server = listServers[i];
        const rank = isFirstPage ? (4 + i) : ((page - 1) * 10 + i + 1);
        const y = currentY + i * (listCardH + 12);
        const x = 40;
        const w = width - 80;

        const img = iconMap.get(server.id);

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, listCardH, 16);
        } else {
            ctx.rect(x, y, w, listCardH);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fill();

        const rowGlass = ctx.createLinearGradient(x, y, x, y + listCardH);
        rowGlass.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        rowGlass.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        rowGlass.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = rowGlass;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        const badgeW = 75;
        const badgeH = 34;
        const badgeX = x + 16;
        const badgeY = y + listCardH / 2 - badgeH / 2;

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
        } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "AprilFont", "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${rank}`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
        ctx.restore();

        const avX = badgeX + badgeW + 36;
        const avY = y + listCardH / 2;
        const avR = 26;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2);
        ctx.clip();
        if (img) {
            ctx.drawImage(img, avX - avR, avY - avR, avR * 2, avR * 2);
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 26px "Blackletter", "MetalGothic", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((server.name || 'S').charAt(0).toUpperCase(), avX, avY);
        }
        ctx.restore();

        let rowName = server.name || 'Unknown Server';
        if (rowName.length > 28) rowName = rowName.slice(0, 26) + '...';

        const textStartX = avX + avR + 20;
        ctx.save();
        const textStartY = avY - 14;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 26px "Blackletter", "MetalGothic", "Georgia", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(rowName, textStartX, textStartY);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '15px "AprilFont", "Georgia", serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 5;
        ctx.fillText(`👥 ${(server.membersCount || 0).toLocaleString()} Members`, textStartX, avY + 14);
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "AprilFont", "Georgia", serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText((server.score || 0).toLocaleString(), x + w - 35, avY - 10);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px "AprilFont", "Georgia", serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 5;
        ctx.fillText('VOICE SCORE', x + w - 35, avY + 14);
        ctx.restore();
    }

    return canvas.toBuffer('image/png');
}
