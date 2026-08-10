import Core from "../../index.js";
import DiscordModuleData from "./data.js";
import SlashCommands from "./slash-commands/index.js";
import RegisterTerminalCommandInit from "./terminal-commands/init.js";
import RegisterTerminalCommandGetInviteLink from "./terminal-commands/get-invite-link.js";

import * as Discord from "discord.js";
import EventEmitter from "node:events";

export interface DiscordClientEvents extends Discord.ClientEvents {
	shard0Ready: [unavailableGuilds: Set<string> | undefined];
	shard0Resume: [replayedEvents: number];
	shard0Reconnecting: [];
}

export class DiscordClient<Ready extends boolean = boolean> extends Discord.Client<Ready> {
	constructor(options: Discord.ClientOptions) {
		super(options);

		this.prependListener("shardReady", (shardId, unavailableGuilds) => {
			if (shardId === 0) this.emit("shard0Ready", unavailableGuilds);
		}).prependListener("shardResume", (shardId, replayedEvents) => {
			if (shardId === 0) this.emit("shard0Resume", replayedEvents);
		}).prependListener("shardReconnecting", (shardId) => {
			if (shardId === 0) this.emit("shard0Reconnecting");
		});
	}

	override once<Event extends keyof DiscordClientEvents>(event: Event, listener: (...args: DiscordClientEvents[Event]) => void) {
		return super.once(event as any, listener);
	}
	override prependOnceListener<Event extends keyof DiscordClientEvents>(event: Event, listener: (...args: DiscordClientEvents[Event]) => void) {
		return super.prependOnceListener(event as any, listener);
	}
	override on<Event extends keyof DiscordClientEvents>(event: Event, listener: (...args: DiscordClientEvents[Event]) => void) {
		return super.on(event as any, listener);
	}
	override prependListener<Event extends keyof DiscordClientEvents>(event: Event, listener: (...args: DiscordClientEvents[Event]) => void) {
		return super.prependListener(event as any, listener);
	}
	override off<Event extends keyof DiscordClientEvents>(event: Event, listener: (...args: DiscordClientEvents[Event]) => void) {
		return super.off(event as any, listener);
	}
	override emit<Event extends keyof DiscordClientEvents>(event: Event, ...args: DiscordClientEvents[Event]) {
		return super.emit(event as any, ...args);
	}
}

export class DiscordAuthorizationManager {
	readonly intents: Discord.GatewayIntentBits[] = [Discord.GatewayIntentBits.Guilds];
	addIntents(...intents: Discord.GatewayIntentBits[]) {
		for (const intent of intents) if (!this.intents.includes(intent)) this.intents.push(intent);
		return this;
	}

	readonly partials: Discord.Partials[] = [];
	addPartials(...partials: Discord.Partials[]) {
		for (const partial of partials) if (!this.partials.includes(partial)) this.partials.push(partial);
		return this;
	}

	readonly scopes: Discord.OAuth2Scopes[] = [Discord.OAuth2Scopes.Bot];
	addScopes(...scopes: Discord.OAuth2Scopes[]) {
		for (const scope of scopes) if (!this.scopes.includes(scope)) this.scopes.push(scope);
		return this;
	}

	readonly permissions: Discord.PermissionResolvable[] = [Discord.PermissionFlagsBits.UseApplicationCommands];
	addPermissions(...permissions: Discord.PermissionResolvable[]) {
		for (const permission of permissions) if (!this.permissions.includes(permission)) this.permissions.push(permission);
		return this;
	}
}

export interface DiscordModuleEvents {
	/** Put all your discord event listeners here! */
	afterClientCreation: () => void;
	afterClientConnection: () => void;
	/** Put all your needed intents, partials, scopes, permissions here! */
	addAuthorizationFields: (authorizationManager: DiscordAuthorizationManager) => void;
}

export class DiscordModule extends EventEmitter {
	readonly name = "discord" as const;
	readonly data: DiscordModuleData;
	readonly log = Core.log.makeFunctions(this.name);

	readonly client: DiscordClient<true>;
	readonly slashCommands = SlashCommands;

	private authorizationManager = new DiscordAuthorizationManager();

	protected onShard0Reconnecting() {
		this.log.info(`Discord bot is attempting to reconnect...`);
	}

	/** WARNING: when calling this method, all event listeners will be deleted */
	createClient() {
		(this.client as any) = new DiscordClient({failIfNotExists: false, intents: this.authorizationManager.intents, partials: this.authorizationManager.partials});
		return this;
	}

	constructor() {
		super();

		this.data = new DiscordModuleData(this).initialize();
		RegisterTerminalCommandInit();
		RegisterTerminalCommandGetInviteLink();

		Core.once("initialized", () => this.onCoreInitialized());
	}

	protected onCoreInitialized() {
		this.data.checkRequiredFields();

		this.emit("addAuthorizationFields", this.authorizationManager);
		this.createClient();
		this.slashCommands.initialize();

		this.client
			.on("debug", m => this.log.verbose(m))
			.on("warn", m => this.log.warn(m))
			.on("error", e => this.log.error(e))
			.on("shard0Resume", (replayedEvents) => {
				this.log.info(`Discord bot reconnected`, {args: {replayedEvents}});
				this.client.once("shard0Reconnecting", () => this.onShard0Reconnecting());
			}).on("shard0Ready", (unavailableGuilds) => {
				this.log.info(`Discord bot connected`, {args: {unavailableGuilds}});
				this.client.once("shard0Reconnecting", () => this.onShard0Reconnecting());
			}).rest.on("rateLimited", (info) => {
				this.log.warn(`Rate limit hit!`, {args: {info}});
			});

		this.emit("afterClientCreation");

		if (this.data.activity.length > 0)
			this.client.options.presence = {activities: [{
				type: Discord.ActivityType.Custom,
				name: this.data.activity.replaceAll("%version%", Core.version)
			}]};
		this.client.login(this.data.token).then(_ => {
			this.slashCommands.initialize2();
			this.emit("afterClientConnection");
		}).catch(e => {
			/*if (e instanceof Discord.HTTPError) {
				if (e.code === Discord.DiscordjsErrorCodes.TokenInvalid) {
					this.log.fatal(`Discord token is invalid, set it with "node index.js discord:init"`, {args: {
						originalErrorMessage: `${e.code}: ${e.message}`
					}});
				}
			}*/
			console.log(e);
			throw e;
		});
	}

	isNewsChannel(channel: Discord.Channel): channel is Discord.NewsChannel {
		return channel.type === Discord.ChannelType.GuildAnnouncement;
	}

	getInviteURL() {
		return this.client.generateInvite({scopes: this.authorizationManager.scopes, permissions: this.authorizationManager.permissions});
	}

	override once<EventName extends keyof DiscordModuleEvents>(eventName: EventName, listener: DiscordModuleEvents[EventName]) {
		return super.once(eventName, listener);
	}
	override prependOnceListener<EventName extends keyof DiscordModuleEvents>(eventName: EventName, listener: DiscordModuleEvents[EventName]) {
		return super.prependOnceListener(eventName, listener);
	}
	override on<EventName extends keyof DiscordModuleEvents>(eventName: EventName, listener: DiscordModuleEvents[EventName]) {
		return super.on(eventName, listener);
	}
	override prependListener<EventName extends keyof DiscordModuleEvents>(eventName: EventName, listener: DiscordModuleEvents[EventName]) {
		return super.prependListener(eventName, listener);
	}
	override off<EventName extends keyof DiscordModuleEvents>(eventName: EventName, listener: DiscordModuleEvents[EventName]) {
		return super.off(eventName, listener);
	}
	override emit<EventName extends keyof DiscordModuleEvents>(eventName: EventName, ...args: Parameters<DiscordModuleEvents[EventName]>) {
		return super.emit(eventName, ...args);
	}
}
export default new DiscordModule();

export * from "./slash-commands/index.js";