import { User, Client, Guild, GuildMember, Collection } from "discord.js";
import { FastCache } from "../cache/fastCache";

const resolvedUserCache = new FastCache<User>(120000, 1000);

function cacheResolvedUser(user: User, searchKey?: string): void {
    if (!user?.id) return;
    resolvedUserCache.set(user.id, user);
    if (user.username) {
        resolvedUserCache.set(user.username.toLowerCase(), user);
    }
    if (user.tag) {
        resolvedUserCache.set(user.tag.toLowerCase(), user);
    }
    if (searchKey) {
        resolvedUserCache.set(searchKey.toLowerCase(), user);
    }
}

async function fetchUserById(client?: Client, guild?: Guild | null, id?: string): Promise<User | null> {
    if (!id || !/^\d{15,20}$/.test(id)) return null;

    const memoryHit = resolvedUserCache.get(id);
    if (memoryHit) return memoryHit;

    if (client?.users?.cache) {
        const cached = client.users.cache.get(id);
        if (cached) {
            cacheResolvedUser(cached, id);
            return cached;
        }
    }

    if (guild?.members?.cache) {
        const memberCached = guild.members.cache.get(id);
        if (memberCached?.user) {
            cacheResolvedUser(memberCached.user, id);
            return memberCached.user;
        }
    }

    if (client?.users?.fetch) {
        try {
            const fetched = await Promise.race([
                client.users.fetch(id),
                new Promise<null>((r) => setTimeout(() => r(null), 2000))
            ]);
            if (fetched) {
                cacheResolvedUser(fetched, id);
                return fetched;
            }
        } catch {}
    }

    return null;
}

export async function resolveUser(message: any, args: string[] = []): Promise<User | null> {
    const client: Client = message?.client;
    const guild: Guild | null = message?.guild;

    if (message?.isChatInputCommand?.()) {
        const targetOpt = message.options?.get?.("target_user") || message.options?.get?.("user");
        if (targetOpt?.user) return targetOpt.user;
        if (typeof targetOpt?.value === "string" && targetOpt.value.trim()) {
            args = [targetOpt.value.trim()];
        } else {
            return message.user || message.author || null;
        }
    }

    if (!args || args.length === 0 || !args[0]?.trim()) {
        if (message?.mentions?.users?.size > 0) {
            return message.mentions.users.first() || null;
        }
        return message?.author || message?.user || null;
    }

    const firstArg = args[0].trim();
    const mentionMatch = firstArg.match(/^<@!?(\d{15,20})>$/);
    if (mentionMatch) {
        const id = mentionMatch[1];
        if (message?.mentions?.users?.has(id)) {
            const u = message.mentions.users.get(id);
            if (u) {
                cacheResolvedUser(u, id);
                return u;
            }
        }
        return fetchUserById(client, guild, id);
    }

    if (/^\d{15,20}$/.test(firstArg)) {
        return fetchUserById(client, guild, firstArg);
    }

    const rawSingle = firstArg.replace(/^@+/, '').trim();
    const rawFull = args.join(' ').replace(/^@+/, '').trim();

    const searchCandidates: string[] = [rawSingle];
    if (rawFull && rawFull !== rawSingle) {
        searchCandidates.push(rawFull);
    }

    for (const query of searchCandidates) {
        if (!query) continue;
        const lower = query.toLowerCase();


        const memoryHit = resolvedUserCache.get(lower);
        if (memoryHit) return memoryHit;


        if (guild?.members?.cache) {
            const exactMember = guild.members.cache.find((m: GuildMember) =>
                m.user?.username?.toLowerCase() === lower ||
                m.user?.tag?.toLowerCase() === lower ||
                m.displayName?.toLowerCase() === lower ||
                m.nickname?.toLowerCase() === lower ||
                m.user?.globalName?.toLowerCase() === lower
            );
            if (exactMember?.user) {
                cacheResolvedUser(exactMember.user, lower);
                return exactMember.user;
            }
        }


        if (client?.users?.cache) {
            const exactUser = client.users.cache.find((u: User) =>
                u.username?.toLowerCase() === lower ||
                u.tag?.toLowerCase() === lower ||
                u.displayName?.toLowerCase() === lower ||
                u.globalName?.toLowerCase() === lower
            );
            if (exactUser) {
                cacheResolvedUser(exactUser, lower);
                return exactUser;
            }
        }


        if (guild?.members?.fetch) {
            try {
                const fetchedMembers = await Promise.race([
                    guild.members.fetch({ query, limit: 5 }),
                    new Promise<Collection<string, GuildMember>>((r) => setTimeout(() => r(new Collection()), 2000))
                ]);

                if (fetchedMembers && fetchedMembers.size > 0) {
                    const exact = fetchedMembers.find((m: GuildMember) =>
                        m.user?.username?.toLowerCase() === lower ||
                        m.user?.tag?.toLowerCase() === lower ||
                        m.displayName?.toLowerCase() === lower ||
                        m.nickname?.toLowerCase() === lower ||
                        m.user?.globalName?.toLowerCase() === lower
                    );
                    const chosen = exact || fetchedMembers.first();
                    if (chosen?.user) {
                        cacheResolvedUser(chosen.user, lower);
                        return chosen.user;
                    }
                }
            } catch {}
        }


        if (client?.guilds?.cache) {
            for (const g of client.guilds.cache.values()) {
                if (g.id === guild?.id) continue;
                const m = g.members?.cache?.find((gm: GuildMember) =>
                    gm.user?.username?.toLowerCase() === lower ||
                    gm.user?.tag?.toLowerCase() === lower ||
                    gm.displayName?.toLowerCase() === lower ||
                    gm.user?.globalName?.toLowerCase() === lower
                );
                if (m?.user) {
                    cacheResolvedUser(m.user, lower);
                    return m.user;
                }
            }
        }


        if (guild?.members?.cache) {
            const partialMember = guild.members.cache.find((m: GuildMember) =>
                m.user?.username?.toLowerCase().startsWith(lower) ||
                m.displayName?.toLowerCase().startsWith(lower) ||
                m.user?.globalName?.toLowerCase().startsWith(lower)
            );
            if (partialMember?.user) {
                cacheResolvedUser(partialMember.user, lower);
                return partialMember.user;
            }
        }


        if (client?.users?.cache) {
            const partialUser = client.users.cache.find((u: User) =>
                u.username?.toLowerCase().startsWith(lower) ||
                u.displayName?.toLowerCase().startsWith(lower) ||
                u.globalName?.toLowerCase().startsWith(lower)
            );
            if (partialUser) {
                cacheResolvedUser(partialUser, lower);
                return partialUser;
            }
        }
    }

    return null;
}
