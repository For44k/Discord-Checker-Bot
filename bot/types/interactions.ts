import {
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    ChatInputCommandInteraction,
    Message,
    User,
    Guild,
    Client
} from 'discord.js';

export interface CommandContext {
    message: Message | ChatInputCommandInteraction;
    args: string[];
    user: User;
    guild: Guild | null;
    client: Client;
    isSlash: boolean;
}

export interface ButtonHandler {
    id?: string;
    customId?: string | RegExp;
    execute(interaction: ButtonInteraction, client?: Client): Promise<unknown>;
}

export interface SelectMenuHandler {
    id?: string;
    customId?: string | RegExp;
    execute(interaction: StringSelectMenuInteraction, client?: Client): Promise<unknown>;
}

export interface ModalHandler {
    id?: string;
    customId?: string | RegExp;
    execute(interaction: ModalSubmitInteraction, client?: Client): Promise<unknown>;
}

export interface BotCommand {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    cooldown?: number;
    execute(message: Message | any, args: string[], client?: Client): Promise<unknown>;
}
