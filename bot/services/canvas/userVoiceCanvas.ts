import { createCanvas, Image } from '@napi-rs/canvas';
import { initGlobalFonts } from './fontLoader';

function drawDiscordStatusBadge(ctx: any, x: number, y: number, radius: number, status: string): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#06080e';
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
        ctx.fillStyle = '#06080e';
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
        ctx.fillStyle = '#06080e';
        ctx.fill();
    }
    ctx.restore();
}

export function buildUserVoiceCanvas(
    userData: any,
    userAvatarImg: Image | null,
    companionImages: Map<string, Image>,
    serverIcons: Map<string, Image>
): Buffer {
    initGlobalFonts();

    const scale = 2.0;
    const width = 1200;
    const height = 550;

    const canvas = createCanvas(width * scale, height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, width, height);

    if (userAvatarImg) {
        ctx.save();
        const zoom = 1.35;
        const dw = width * zoom;
        const dh = height * zoom;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.globalAlpha = 0.28;
        ctx.drawImage(userAvatarImg, dx, dy, dw, dh);
        ctx.restore();
    }

    ctx.save();
    const darkVeil = ctx.createLinearGradient(0, 0, 0, height);
    darkVeil.addColorStop(0, 'rgba(5, 7, 12, 0.65)');
    darkVeil.addColorStop(0.45, 'rgba(6, 9, 16, 0.8)');
    darkVeil.addColorStop(1, 'rgba(3, 4, 8, 0.95)');
    ctx.fillStyle = darkVeil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const headerX = 40;
    const headerY = 35;
    const headerW = width - 80;
    const headerH = 135;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(headerX, headerY, headerW, headerH, 20);
    } else {
        ctx.rect(headerX, headerY, headerW, headerH);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    const avRadius = 48;
    const avX = headerX + 68;
    const avY = headerY + headerH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
    ctx.clip();
    if (userAvatarImg) {
        ctx.drawImage(userAvatarImg, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Blackletter", "MetalGothic", "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((userData.username || 'U').charAt(0).toUpperCase(), avX, avY);
    }
    ctx.restore();

    const statusX = avX + avRadius * 0.72;
    const statusY = avY + avRadius * 0.72;
    drawDiscordStatusBadge(ctx, statusX, statusY, 13, userData.status || 'offline');

    const nameStartX = avX + avRadius + 26;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 32px "Blackletter", "MetalGothic", "Georgia", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(userData.globalName || userData.username || 'Unknown User', nameStartX, avY - 16);

    ctx.font = '15px "AprilFont", "Georgia", serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`@${userData.username}  •  ID: ${userData.userId}  •  Status: ${(userData.status || 'offline').toUpperCase()}`, nameStartX, avY + 18);
    ctx.restore();

    const gridX = 40;
    const gridY = headerY + headerH + 24;
    const gap = 20;
    const cardW = (width - 80 - (gap * 2)) / 3;
    const cardH = 315;

    const sections = [
        {
            title: 'TOP VOICE SERVERS',
            description: 'Ranked by lifetime server voice duration',
            data: userData.topVoiceServers || [],
            type: 'server_voice',
            x: gridX
        },
        {
            title: 'TOP VOICE COMPANIONS',
            description: 'Ranked by voice co-presence duration',
            data: userData.topVoiceCompanions || [],
            type: 'companion',
            x: gridX + cardW + gap
        },
        {
            title: 'TOP CHAT SERVERS',
            description: 'Ranked by lifetime server messages',
            data: userData.topMessageServers || [],
            type: 'server_chat',
            x: gridX + (cardW + gap) * 2
        }
    ];

    sections.forEach(sec => {
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(sec.x, gridY, cardW, cardH, 20);
        } else {
            ctx.rect(sec.x, gridY, cardW, cardH);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 19px "Blackletter", "MetalGothic", "Georgia", serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'left';
        ctx.fillText(sec.title, sec.x + 18, gridY + 30);

        ctx.font = '12px "AprilFont", "Georgia", serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(sec.description, sec.x + 18, gridY + 50);
        ctx.restore();

        if (sec.data.length === 0) {
            ctx.save();
            ctx.fillStyle = '#64748b';
            ctx.font = 'italic 14px "AprilFont", "Georgia", serif';
            ctx.textAlign = 'center';
            ctx.fillText(sec.type === 'companion' ? 'No voice companions recorded yet.' : 'No activity recorded yet.', sec.x + cardW / 2, gridY + cardH / 2 + 15);
            ctx.restore();
            return;
        }

        const startY = gridY + 68;
        const rowH = 74;

        if (sec.type === 'server_voice' || sec.type === 'server_chat') {
            sec.data.slice(0, 3).forEach((srv: any, i: number) => {
                const rowY = startY + i * rowH;
                const sImg = serverIcons.get(srv.id);

                ctx.save();
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(sec.x + 12, rowY, cardW - 24, 62, 14);
                } else {
                    ctx.rect(sec.x + 12, rowY, cardW - 24, 62);
                }
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.stroke();

                const sAvX = sec.x + 44;
                const sAvY = rowY + 31;
                const sAvR = 20;

                ctx.save();
                ctx.beginPath();
                ctx.arc(sAvX, sAvY, sAvR, 0, Math.PI * 2);
                ctx.clip();
                if (sImg) {
                    ctx.drawImage(sImg, sAvX - sAvR, sAvY - sAvR, sAvR * 2, sAvR * 2);
                } else {
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(sAvX - sAvR, sAvY - sAvR, sAvR * 2, sAvR * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((srv.name || 'S').charAt(0).toUpperCase(), sAvX, sAvY);
                }
                ctx.restore();

                let sName = srv.name || 'Unknown Server';
                if (sName.length > 20) sName = sName.slice(0, 18) + '...';

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px "AprilFont", "Georgia", serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(sName, sAvX + sAvR + 12, sAvY - 10);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '12px "AprilFont", "Georgia", serif';
                if (sec.type === 'server_voice') {
                    ctx.fillText(`⏳ ${srv.voiceHours || '0m'} in Voice`, sAvX + sAvR + 12, sAvY + 11);
                } else {
                    ctx.fillText(`💬 ${srv.messagesCount || 0} Messages`, sAvX + sAvR + 12, sAvY + 11);
                }
                ctx.restore();
            });
        } else if (sec.type === 'companion') {
            sec.data.slice(0, 3).forEach((comp: any, i: number) => {
                const rowY = startY + i * rowH;
                const cImg = companionImages.get(comp.id);

                ctx.save();
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(sec.x + 12, rowY, cardW - 24, 62, 14);
                } else {
                    ctx.rect(sec.x + 12, rowY, cardW - 24, 62);
                }
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.stroke();

                const cAvX = sec.x + 44;
                const cAvY = rowY + 31;
                const cAvR = 20;

                ctx.save();
                ctx.beginPath();
                ctx.arc(cAvX, cAvY, cAvR, 0, Math.PI * 2);
                ctx.clip();
                if (cImg) {
                    ctx.drawImage(cImg, cAvX - cAvR, cAvY - cAvR, cAvR * 2, cAvR * 2);
                } else {
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(cAvX - cAvR, cAvY - cAvR, cAvR * 2, cAvR * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px "AprilFont", "Georgia", serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((comp.username || 'U').charAt(0).toUpperCase(), cAvX, cAvY);
                }
                ctx.restore();

                let cName = comp.username || comp.tag || 'Unknown User';
                if (cName.length > 20) cName = cName.slice(0, 18) + '...';

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px "AprilFont", "Georgia", serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(cName, cAvX + cAvR + 12, cAvY - 10);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '12px "AprilFont", "Georgia", serif';
                ctx.fillText(`🎙️ ${comp.sharedHours || '0m'} together`, cAvX + cAvR + 12, cAvY + 11);
                ctx.restore();
            });
        }
    });

    return canvas.toBuffer('image/png');
}
