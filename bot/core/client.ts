import { Client, ClientOptions, Collection } from 'discord.js';
import { Handlers } from './handlers';

export class CheckerClient extends Client {
    public commands: Collection<string, any> = new Collection();
    public aliases: Collection<string, string> = new Collection();
    public buttons: Collection<string, any> = new Collection();
    public modals: Collection<string, any> = new Collection();
    public selectMenus: Collection<string, any> = new Collection();

    constructor(options: ClientOptions) {
        super(options);
    }

    public async init(): Promise<void> {
        await Handlers.loadAll(this);
    }
}
