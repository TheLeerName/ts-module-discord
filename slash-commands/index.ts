import Core from "../../../index.js";
import Module from "../index.js";
import PingCommand from "./ping.js";
import InviteLinkCommand from "./invite-link.js";
import CommandsUpdateCommand from "./commands-update.js";
import GuildAllowCommand from "./commands-guild-allow.js";
import GuildBanCommand from "./commands-guild-ban.js";

import * as Discord from "discord.js";

const GUILD_SLASH_COMMAND_RESTRICT_BY_DEFAULT = true;

export class SlashCommand extends Discord.SlashCommandBuilder {
	version: number = 1;
	global: boolean = false;
	cooldown: number | null = null;
	forMasterGuild: boolean = false;
	chatInput: SlashCommandChatInput | null = null;
	autocomplete: SlashCommandAutocomplete | null = null;

	usersUsedTimestamps: Map<string, number> = new Map();
	subcommands: SlashSubcommand[] = [];

	setVersion(value: number) {
		this.version = value;
		return this;
	}
	setGlobal(value = true) {
		this.global = value;
		return this;
	}
	/** @param cooldown in milliseconds */
	setCooldown(cooldown: number | null) {
		this.cooldown = cooldown;
		return this;
	}
	setForMasterGuild(forMasterGuild: boolean) {
		this.forMasterGuild = forMasterGuild;
		return this;
	}
	setChatInput(chatInput: SlashCommandChatInput) {
		this.chatInput = chatInput;
		return this;
	}
	setAutocomplete(autocomplete: SlashCommandAutocomplete) {
		this.autocomplete = autocomplete;
		return this;
	}

	addSubcommands(...subcommands: SlashSubcommand[]) {
		for (let subcommand of subcommands) {
			this.addSubcommand(subcommand);
			this.subcommands.push(subcommand);
		}
		return this;
	}

	toJSON(): Discord.RESTPostAPIChatInputApplicationCommandsJSONBody {
		const json: any = super.toJSON();
		delete json.version;
		delete json.global;
		delete json.chatInput;
		delete json.autocomplete;
		delete json.subcommands;
		return json;
	}
}

export class SlashSubcommand extends Discord.SlashCommandSubcommandBuilder {
	usersUsedTimestamps: Map<string, number> = new Map();
	cooldown: number | null = null;
	chatInput: SlashCommandChatInput | null = null;
	autocomplete: SlashCommandAutocomplete | null = null;

	/** @param cooldown in milliseconds */
	setCooldown(cooldown: number | null) {
		this.cooldown = cooldown;
		return this;
	}
	setChatInput(chatInput: SlashCommandChatInput) {
		this.chatInput = chatInput;
		return this;
	}
	setAutocomplete(autocomplete: SlashCommandAutocomplete) {
		this.autocomplete = autocomplete;
		return this;
	}

	toJSON(): Discord.APIApplicationCommandSubcommandOption {
		const json: any = super.toJSON();
		delete json.chatInput;
		delete json.autocomplete;
		return json;
	}
}

export class ChatInputCommandInteraction<Cached extends Discord.CacheType = Discord.CacheType> extends Discord.ChatInputCommandInteraction<Cached> {
	static fromSuper<Cached extends Discord.CacheType = Discord.CacheType>(interaction: Discord.ChatInputCommandInteraction<Cached>): ChatInputCommandInteraction<Cached> {
		return interaction;
	}
}

export type SlashCommandChatInput = (interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>) => Promise<any | void>;
export type SlashCommandAutocomplete = (interaction: Discord.AutocompleteInteraction<Discord.CacheType>) => Promise<any | void>;

export class SlashCommands extends Array<SlashCommand> {
	initialize() {
		this.push(PingCommand(), CommandsUpdateCommand());

		Module.client
			.on("guildCreate", guild => this.resetGuild(guild))
			.on("interactionCreate", interaction => this.interactionCreate(interaction));
	}

	async initialize2() {
		if (Module.data.masterGuildID.length > 0) {
			const commandsToPush = [InviteLinkCommand(), GuildAllowCommand(), GuildBanCommand()];
			try {
				await Module.client.guilds.fetch(Module.data.masterGuildID);
				this.push(...commandsToPush);
			}
			catch(error) {
				Module.log.error(`Commands ${commandsToPush.map(c => c.name).join(", ")} were disabled`, {error, args: {guildID: Module.data.masterGuildID}});
			}
		}

		/*let globalReset = false;
		let guildsReset = false;
		let save = false;*/

		/*for (const command of this) {
			const version = Module.data.slashCommandVersions.get(command.name);
			if (!version || version != command.version) {
				if (command.global)
					globalReset = true;
				else
					guildsReset = true;

				const previousVersionDisplay = version ?? 0;
				Module.data.slashCommandVersions.set(command.name, command.version);
				save = true;
				Module.log.info(`Slash command ${command.name} was updated`, {args: {isGlobal: command.global, version: `${previousVersionDisplay} => ${command.version}`}});
			}
		}
		if (save)
			Module.data.save();
		if (globalReset)
			await this.resetGlobal(false);
		if (guildsReset)
			for (const guild of Module.client.guilds.cache.values())
				await this.resetGuild(guild, false);*/
	}

	private checkCooldown(interaction: Discord.Interaction, command: SlashCommand | SlashSubcommand) {
		if (command.cooldown) {
			//if (Module.data.botOwnerID.length > 0 && Module.data.botOwnerID === interaction.user.id)
				//return true;

			const now = Date.now();
			const lastUsed = command.usersUsedTimestamps.get(interaction.user.id);
			if (lastUsed) {
				const cooldownEnd = lastUsed + command.cooldown;
				const timeLeft = cooldownEnd - now;
				if (cooldownEnd > now) {
					if (interaction.isChatInputCommand())
						interaction.reply({embeds: [new Discord.EmbedBuilder()
							.setTitle(`:x: Ошибка!`)
							.setDescription(`\`\`\`\nСлишком частое использование данной команды! Попробуйте снова через ${Core.humanizeDuration(timeLeft)}.\n\`\`\``)
							.setColor("#dd2e44")
						], flags: "Ephemeral"});
					return false;
				}
			}
			command.usersUsedTimestamps.set(interaction.user.id, now);
		}
		return true;
	}

	isCommandInGuildAllowed(slashCommandName: string, guildID: string) {
		const guilds = Module.data.slashCommandGuildAllowed.get(slashCommandName);
		if (!guilds) return !GUILD_SLASH_COMMAND_RESTRICT_BY_DEFAULT;
		return guilds.get(guildID) ?? !GUILD_SLASH_COMMAND_RESTRICT_BY_DEFAULT;
	}

	private checkCommandInGuildAllowed(interaction: Discord.Interaction, command: SlashCommand | SlashSubcommand) {
		if ((command instanceof SlashCommand && command.global) || !interaction.inGuild())
			return true;
		if (!this.isCommandInGuildAllowed(command.name, interaction.guildId)) {
			if (interaction.isChatInputCommand())
				interaction.reply({embeds: [new Discord.EmbedBuilder()
					.setTitle(`:x: Ошибка!`)
					.setDescription(`\`\`\`\nЭта слэш-команда была запрещена разработчиком бота на этом сервере!\n\`\`\``)
					.setColor("#dd2e44")
				]});
			return false;
		}
		return true;
	}

	private async interactionCreate(interaction: Discord.Interaction) {
		const isChatInputCommand = interaction.isChatInputCommand();
		const isAutocomplete = interaction.isAutocomplete();
		if (!isChatInputCommand && !isAutocomplete) return;

		for (const command of this) if (command.name === interaction.commandName) {
			if (!this.checkCommandInGuildAllowed(interaction, command) || !this.checkCooldown(interaction, command)) continue;

			if (isChatInputCommand) command.chatInput?.(interaction);
			else if (isAutocomplete) command.autocomplete?.(interaction);

			const interactionSubcommandName = interaction.options.getSubcommand(false);
			if (interactionSubcommandName) for (const subcommand of command.subcommands) {
				if (!this.checkCommandInGuildAllowed(interaction, subcommand) || !this.checkCooldown(interaction, subcommand)) continue;

				if (subcommand.name === interactionSubcommandName) {
					if (isChatInputCommand && this.checkCooldown(interaction, command)) subcommand.chatInput?.(interaction);
					else if (isAutocomplete) subcommand.autocomplete?.(interaction);
				}
			}
		}
	}

	findByName(name: string): SlashCommand | null {
		for (const command of this) {
			if (command.name === name)
				return command;
		}
		return null;
	}

	async resetGlobal(log = true) {
		const array = this.filter(v => v.global).map(v => v.toJSON());
		await Module.client.application.commands.set(array);
		if (log) Module.log.info("Global slash commands were resetted", {args: {count: array.length}});
	}
	async clearGlobal(log = true) {
		await Module.client.application.commands.set([]);
		if (log) Module.log.info("Slash commands for guild were cleared");
	}

	async resetGuild(guild: Discord.Guild, log = true) {
		const array = this.filter(command => !command.global && this.isCommandInGuildAllowed(command.name, guild.id) && (command.forMasterGuild ? (Module.data.masterGuildID.length > 1 ? guild.id === Module.data.masterGuildID : true) : true)).map(v => v.toJSON());
		await guild.commands.set(array);
		if (log) Module.log.info("Slash commands for guild were resetted", {args: {guild: `${guild.name} (${guild.id})`, count: array.length}});
	}
	async clearGuild(guild: Discord.Guild, log = true) {
		await guild.commands.set([]);
		if (log) Module.log.info("Slash commands for guild were cleared");
	}
}
export default new SlashCommands();