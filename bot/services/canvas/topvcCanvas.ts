import { createCanvas, loadImage, Image } from '@napi-rs/canvas';
import * as path from 'path';
import * as fs from 'fs';
import { initGlobalFonts } from './fontLoader';

export interface LeaderboardUser {
    rank: number;
    userId: string;
    username: string;
    globalName: string;
    avatar: string | null;
    totalVoiceSeconds: number;
    voiceTimeFormatted: string;
    messagesCount: number;
    inVoiceNow: boolean;
    server?: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
}

export interface VoiceLeaderboardData {
    guildId?: string | null;
    guildName?: string | null;
    guildIcon?: string | null;
    totalTrackedUsers: number;
    leaderboard: LeaderboardUser[];
}

export async function buildTopVoiceCanvas(
    data: VoiceLeaderboardData
): Promise<Buffer> {
    initGlobalFonts();

    const scale = 2.0;
    const width = 1250;
    const topUsers = data.leaderboard.slice(0, 10);
    const topPodium = topUsers.slice(0, 3);
    const listUsers = topUsers.slice(3);

    const topPodiumH = 295;
    const listCardH = 92;
    const height = 110 + (topPodium.length ? topPodiumH + 25 : 0) + (listUsers.length * (listCardH + 14)) + 40;

    const canvas = createCanvas(width * scale, height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    const bgPath = path.join(process.cwd(), 'bot/assets/topvc_bg.jpg');
    let bgImg: Image | null = null;
    try {
        if (fs.existsSync(bgPath)) {
            bgImg = await loadImage(bgPath);
        }
    } catch (_) {}

    if (bgImg) {
        ctx.save();
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.restore();
    }

    ctx.save();
    const lightVeil = ctx.createLinearGradient(0, 0, 0, height);
    lightVeil.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
    lightVeil.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)');
    lightVeil.addColorStop(1, 'rgba(0, 0, 0, 0.50)');
    ctx.fillStyle = lightVeil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    const titleCenter = width / 2;
    const titleY = 48;

    const titleText = 'TOP VOICE CHANNELS';
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

    let currentY = 95;

    if (topPodium.length > 0) {
        const podiumOrder = [
            { user: topPodium[1], rank: 2, x: 50, w: 360, color: 'rgba(255, 255, 255, 0.35)' },
            { user: topPodium[0], rank: 1, x: 435, w: 380, color: 'rgba(251, 191, 36, 0.7)' },
            { user: topPodium[2], rank: 3, x: 840, w: 360, color: 'rgba(249, 115, 22, 0.6)' },
        ];

        for (const podium of podiumOrder) {
            const u = podium.user;
            if (!u) continue;

            const x = podium.x;
            const y = podium.rank === 1 ? currentY : currentY + 18;
            const w = podium.w;
            const h = podium.rank === 1 ? topPodiumH : topPodiumH - 18;

            let img: Image | null = null;
            if (u.avatar) {
                try { img = await loadImage(u.avatar); } catch (_) {}
            }

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, w, h, 24);
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

            const avRadius = podium.rank === 1 ? 54 : 46;
            const avX = x + w / 2;
            const avY = y + 74;

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
            }
            ctx.restore();

            let nameStr = u.globalName || u.username;
            if (nameStr.length > 18) nameStr = nameStr.slice(0, 16) + '...';

            ctx.save();
            const textCenter = x + w / 2;
            const textY = y + 160;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 28px "Blackletter", "MetalGothic", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText(nameStr, textCenter, textY);
            ctx.restore();

            ctx.save();
            ctx.font = '14px "AprilFont", "Georgia", serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 6;
            ctx.fillText(`@${u.username}`, x + w / 2, y + 188);
            ctx.restore();

            const scoreStr = u.voiceTimeFormatted;
            ctx.font = 'bold 22px "AprilFont", "Georgia", serif';
            const textMetrics = ctx.measureText(scoreStr);
            const scoreBoxW = Math.max(90, textMetrics.width + 36);
            const scoreBoxH = 32;
            const scoreBoxX = x + w / 2 - scoreBoxW / 2;
            const scoreBoxY = y + 208;

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 12);
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

            ctx.save();
            ctx.font = '11px "AprilFont", "Georgia", serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 6;
            ctx.fillText('TOTAL TIME IN VC', x + w / 2, y + 254);
            ctx.restore();

            const badgeW = 92;
            const badgeH = 28;
            const badgeX = x + w - badgeW - 14;
            const badgeY = y + h - badgeH - 14;

            ctx.save();
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
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
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = podium.rank === 1 ? '#fbbf24' : (podium.rank === 2 ? '#ffffff' : '#fcd34d');
            ctx.font = 'bold 14px "AprilFont", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${podium.rank} RANK`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
            ctx.restore();
        }

        currentY += topPodiumH + 30;
    }

    for (let i = 0; i < listUsers.length; i++) {
        const u = listUsers[i];
        const rank = 4 + i;
        const y = currentY + i * (listCardH + 14);
        const x = 50;
        const w = width - 100;

        let rowImg: Image | null = null;
        if (u.avatar) {
            try { rowImg = await loadImage(u.avatar); } catch (_) {}
        }

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, listCardH, 20);
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
        if (rowImg) {
            ctx.drawImage(rowImg, avX - avR, avY - avR, avR * 2, avR * 2);
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
        }
        ctx.restore();

        let rowName = u.globalName || u.username;
        if (rowName.length > 24) rowName = rowName.slice(0, 22) + '...';

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
        ctx.fillText(`@${u.username}`, textStartX, avY + 14);
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "AprilFont", "Georgia", serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText(u.voiceTimeFormatted, x + w - 35, avY - 10);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px "AprilFont", "Georgia", serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 5;
        ctx.fillText('TIME IN VC', x + w - 35, avY + 14);
        ctx.restore();
    }

    return canvas.toBuffer('image/png');
}
