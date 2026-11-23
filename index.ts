import * as Core from "../../index.js";
import Data from "./data.js";
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

export interface Events {
	/** Put all your needed intents, partials, scopes, permissions here! */
	beforeClientCreation: () => void;
	/** Put all your discord event listeners here! */
	afterClientCreation: () => void;
	afterClientConnection: () => void;
}

export class Module extends EventEmitter implements Core.IModule {
	readonly name = "discord" as const;
	readonly data: Data;
	readonly core: Core.Core;
	readonly log: Core.ModuleLogFunctions;
	readonly client: DiscordClient<true>;
	readonly slashCommands = SlashCommands;

	readonly intents: Discord.GatewayIntentBits[] = [];
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

	readonly permissions: Discord.PermissionResolvable[] = [];
	addPermissions(...permissions: Discord.PermissionResolvable[]) {
		for (const permission of permissions) if (!this.permissions.includes(permission)) this.permissions.push(permission);
		return this;
	}

	protected onShard0Reconnecting() {
		this.log.info(`Discord bot is attempting to reconnect...`);
	}

	/** **WARNING:** when calling this method, all event listeners will be deleted */
	createClient() {
		(this.client as any) = new DiscordClient({failIfNotExists: false, intents: this.intents, partials: this.partials});
		return this;
	}

	constructor() {
		super();
		//throw new Error("nope.");

		RegisterTerminalCommandInit();
		RegisterTerminalCommandGetInviteLink();
	}

	async load() {
		Core.default.modules.setReadonlyFields(this, {
			data: new Data(this),
			core: Core.default,
			log: Core.default.log.makeFunctions(this.name),
		});
		this.data.initialize();
	}

	async initialize() {
		await this.load();
		this.data.checkRequiredFields();

		this.emit("beforeClientCreation");
		this.createClient();
		this.slashCommands.initialize();

		this.client
			.on("debug", m => this.log.verbose(m))
			.on("warn", m => this.log.warn(m))
			.on("error", e => this.log.error(e))
			.on("shard0Resume", (replayedEvents) => {
				this.log.info(`Discord bot reconnected`, {args: {replayedEvents}});
				this.client.once("shard0Reconnecting", () => this.onShard0Reconnecting());
			})
			.on("shard0Ready", (unavailableGuilds) => {
				this.log.info(`Discord bot connected`, {args: {unavailableGuilds}});
				this.client.once("shard0Reconnecting", () => this.onShard0Reconnecting());
			})
			.on("guildCreate", guild => {
				this.log.info("Bot was invited to the guild", {args: {guild: this.getGuildNameAndID(guild)}});
			})
			.on("guildDelete", guild => {
				this.log.info("Bot was kicked from the guild or guild was deleted", {args: {guild: this.getGuildNameAndID(guild)}});
			})
			.rest.on("rateLimited", (info) => {
				this.log.warn(`Rate limit hit!`, {args: {info}});
			});

		this.emit("afterClientCreation");

		if (this.data.activity.length > 0)
			this.client.options.presence = {activities: [{
				type: Discord.ActivityType.Custom,
				name: this.data.activity.replaceAll("%version%", this.core.version)
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
			throw e;
		});
	}

	async fetchChannelWithNotFoundHandling(guild: Discord.Guild, id: Discord.Snowflake, options?: Discord.BaseFetchOptions) {
		try {
			return guild.channels.fetch(id, options);
		}
		catch(e) {
			if (e instanceof Discord.DiscordAPIError && e.code === 10003) {
				return null;
			}
			throw e;
		}
	}

	async fetchGuildMemberWithNotFoundHandling(guild: Discord.Guild, options: Discord.UserResolvable | Discord.FetchMemberOptions | (Discord.FetchMembersOptions & { user: Discord.UserResolvable })) {
		try {
			return guild.members.fetch(options);
		}
		catch(e) {
			if (e instanceof Discord.DiscordAPIError && e.code === 10013) {
				return null;
			}
			throw e;
		}
	}

	async fetchMessageWithNotFoundHandling(channel: Discord.SendableChannels, options: Discord.MessageResolvable | Discord.FetchMessageOptions) {
		try {
			return channel.messages.fetch(options);
		}
		catch(e) {
			if (e instanceof Discord.DiscordAPIError && e.code === 10008) {
				return null;
			}
			throw e;
		}
	}

	/** @returns `${guild.name} (${guild.id})` */
	getGuildNameAndID(guild: Discord.Guild): string {
		return `${guild.name} (${guild.id})`;
	}
	/** @returns `${channel.name} (${channel.id})` */
	getChannelNameAndID(channel: Exclude<Discord.Channel, Discord.DMChannel | Discord.PartialDMChannel>): string {
		return `${channel.type === Discord.ChannelType.GuildText ? "#" : ""}${channel.name} (${channel.id})`;
	}
	/** @returns `${user.name} (${user.id})` */
	getGuildMemberNameAndID(member: Discord.GuildMember): string {
		return `${member.nickname ?? member.user.username} (${member.user.id})`;
	}
	/** @returns `${user.name} (${user.id})` */
	getUserNameAndID(user: Discord.User): string {
		return `${user.username} (${user.id})`;
	}
	/** @returns `${role.name} (${role.id})` */
	getRoleNameAndID(role: Discord.Role): string {
		return `@${role.name} (${role.id})`;
	}

	isNewsChannel(channel: Discord.Channel): channel is Discord.NewsChannel {
		return channel.type === Discord.ChannelType.GuildAnnouncement;
	}

	getInviteURL() {
		return this.client.generateInvite({scopes: this.scopes, permissions: this.permissions});
	}

	override once<EventName extends keyof Events>(eventName: EventName, listener: Events[EventName]) {
		return super.once(eventName, listener);
	}
	override prependOnceListener<EventName extends keyof Events>(eventName: EventName, listener: Events[EventName]) {
		return super.prependOnceListener(eventName, listener);
	}
	override on<EventName extends keyof Events>(eventName: EventName, listener: Events[EventName]) {
		return super.on(eventName, listener);
	}
	override prependListener<EventName extends keyof Events>(eventName: EventName, listener: Events[EventName]) {
		return super.prependListener(eventName, listener);
	}
	override off<EventName extends keyof Events>(eventName: EventName, listener: Events[EventName]) {
		return super.off(eventName, listener);
	}
	override emit<EventName extends keyof Events>(eventName: EventName, ...args: Parameters<Events[EventName]>) {
		return super.emit(eventName, ...args);
	}
}
export default new Module();

export * from "./slash-commands/index.js";