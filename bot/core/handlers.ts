import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { CheckerClient } from './client';
import { logger } from '../utils/logger/logger';

export class Handlers {
    public static async loadCommands(client: CheckerClient): Promise<void> {
        const files = await glob('bot/commands/**/*.{ts,js}');
        for (const file of files) {
            await this.loadSingleCommand(client, file);
        }
        logger.info(`Loaded ${client.commands.size} commands (${client.aliases.size} aliases)`);
    }

    public static async loadSingleCommand(client: CheckerClient, file: string): Promise<any> {
        const filePath = path.resolve(file);
        try {
            const fileUrl = `file://${filePath}?update=${Date.now()}`;
            const commandModule = await import(fileUrl);
            const command = commandModule.default || commandModule;

            if (command && command.name) {
                for (const [key, cmd] of client.commands.entries()) {
                    if (cmd.name === command.name) {
                        client.commands.delete(key);
                    }
                }
                for (const [alias, targetName] of client.aliases.entries()) {
                    if (targetName === command.name) {
                        client.aliases.delete(alias);
                    }
                }

                client.commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach((alias: string) => {
                        client.aliases.set(alias, command.name);
                    });
                }
                return command;
            }
        } catch (e: any) {
            logger.error(`Failed to load command from ${path.basename(file)}:`, e);
        }
        return null;
    }

    public static async loadEvents(client: CheckerClient): Promise<void> {
        const files = await glob('bot/events/**/*.{ts,js}');
        for (const file of files) {
            const filePath = path.resolve(file);
            const fileUrl = `file://${filePath}?update=${Date.now()}`;
            const eventModule = await import(fileUrl);
            const event = eventModule.default || eventModule;

            if (event && event.name && typeof event.execute === 'function') {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
            }
        }
        logger.info('Loaded event listeners');
    }

    public static async loadInteractions(client: CheckerClient): Promise<void> {
        const files = await glob('bot/interactions/**/*.{ts,js}');
        for (const file of files) {
            const filePath = path.resolve(file);
            const fileUrl = `file://${filePath}?update=${Date.now()}`;
            const interactionModule = await import(fileUrl);
            const interaction = interactionModule.default || interactionModule;

            if (interaction && (interaction.id || interaction.customId)) {
                const handlerId = interaction.id || interaction.customId;
                if (file.includes('buttons')) client.buttons.set(handlerId, interaction);
                if (file.includes('modals')) client.modals.set(handlerId, interaction);
                if (file.includes('selectMenus')) client.selectMenus.set(handlerId, interaction);
            }
        }
        logger.info(`Loaded ${client.buttons.size + client.modals.size + client.selectMenus.size} interaction handlers`);
    }

    public static startHotReload(client: CheckerClient): void {
        if (process.env.NODE_ENV === 'production') return;

        const commandsDir = path.resolve('bot/commands');
        if (!fs.existsSync(commandsDir)) return;

        const debounceMap = new Map<string, number>();

        fs.watch(commandsDir, { recursive: true }, async (_eventType, filename) => {
            if (!filename || (!filename.endsWith('.ts') && !filename.endsWith('.js'))) return;
            const now = Date.now();
            const last = debounceMap.get(filename) || 0;
            if (now - last < 500) return;
            debounceMap.set(filename, now);

            const fullPath = path.join(commandsDir, filename);
            if (fs.existsSync(fullPath)) {
                const cmd = await Handlers.loadSingleCommand(client, fullPath);
                if (cmd && cmd.name) {
                    console.log(`\x1b[34m[HOT-RELOAD]\x1b[0m \x1b[36mCommand \x1b[1m+${cmd.name}\x1b[0m \x1b[34mreloaded successfully\x1b[0m \x1b[90m(${filename})\x1b[0m`);
                }
            }
        });

        const interactionsDir = path.resolve('bot/interactions');
        if (fs.existsSync(interactionsDir)) {
            fs.watch(interactionsDir, { recursive: true }, async (_eventType, filename) => {
                if (!filename || (!filename.endsWith('.ts') && !filename.endsWith('.js'))) return;
                const now = Date.now();
                const last = debounceMap.get(filename) || 0;
                if (now - last < 500) return;
                debounceMap.set(filename, now);

                const fullPath = path.join(interactionsDir, filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        const fileUrl = `file://${fullPath}?update=${Date.now()}`;
                        const module = await import(fileUrl);
                        const interaction = module.default || module;
                        if (interaction && (interaction.id || interaction.customId)) {
                            const handlerId = interaction.id || interaction.customId;
                            if (fullPath.includes('buttons')) client.buttons.set(handlerId, interaction);
                            if (fullPath.includes('modals')) client.modals.set(handlerId, interaction);
                            if (fullPath.includes('selectMenus')) client.selectMenus.set(handlerId, interaction);
                            console.log(`\x1b[34m[HOT-RELOAD]\x1b[0m \x1b[36mInteraction \x1b[1m${handlerId}\x1b[0m \x1b[34mreloaded successfully\x1b[0m \x1b[90m(${filename})\x1b[0m`);
                        }
                    } catch { }
                }
            });
        }
    }

    public static async loadAll(client: CheckerClient): Promise<void> {
        await this.loadCommands(client);
        await this.loadEvents(client);
        await this.loadInteractions(client);
        this.startHotReload(client);
    }
}
