import Core from "../../../index.js";
import Module from "../index.js";
import SlashCommands, { SlashCommand } from "./index.js";

import { EmbedBuilder } from "discord.js";

export default () => {
	const c = new SlashCommand()
	.setVersion(1)
	.setForMasterGuild(true)
	.setName("commands-guild-allow")
	.setDescription("Allows specified slash command for specified guild")
	.setDescriptionLocalization("ru", "Разрешает выбранную слэш-команду для выбранного сервера")
	.setAutocomplete(async(interaction) => {
		const focused = interaction.options.getFocused(true);
		if (focused.name === "guild-id")
			return await interaction.respond(interaction.client.guilds.cache.map(g => {return {name: g.name, value: g.id}}));
		if (focused.name === "slash-command-name")
			return await interaction.respond(SlashCommands.filter(s => !s.global).sort((a, b) => a.name.indexOf(focused.value) - b.name.indexOf(focused.value)).slice(0, 5).map(s => {return {name: s.name, value: s.name}}));
	})
	.setChatInput(async(interaction) => {
		if (!interaction.inCachedGuild()) return;

		const start = Date.now();
		await interaction.deferReply();

		const args: any = {
			guild: `${interaction.guild.name} (${interaction.guild.id})`,
			user: `${interaction.user.username} (${interaction.user.id})`
		};
		try {
			const guildID = interaction.options.getString("guild-id", true);
			if (guildID.length < 1)
				throw new Error("Параметр guild-id не указан");
			args.guildID = guildID;

			const slashCommandName = interaction.options.getString("slash-command-name", true);
			if (slashCommandName.length < 1)
				throw new Error("Параметр slash-command-name не указан");
			args.slashCommandName = slashCommandName;

			if (!Module.slashCommands.findByName(slashCommandName))
				throw new Error(`Я не нашёл у себя слэш-команды с названием "${slashCommandName}"!`);

			const guild = await interaction.client.guilds.fetch(guildID);
			args.guildName = guild.name;

			let dataGuilds = Module.data.slashCommandGuildAllowed.get(slashCommandName);
			if (dataGuilds) {
				if (dataGuilds.get(guild.id) == true)
					throw new Error(`Слэш-команда "${slashCommandName}" уже была разрешена на сервере ${guild.name}!`);
			}
			else {
				dataGuilds = new Map();
				Module.data.slashCommandGuildAllowed.set(slashCommandName, dataGuilds);
			}

			dataGuilds.set(guild.id, true);
			Module.data.save();

			await SlashCommands.resetGuild(guild);

			await interaction.editReply({embeds: [new EmbedBuilder()
				.setTitle(`:white_check_mark: Успешно!`)
				.setColor("#77b255")
				.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
			]});
			Module.log.info(`Command ${c.name} success`, {args});
		}
		catch(error) {
			await interaction.editReply({embeds: [new EmbedBuilder()
				.setTitle(`:x: Ошибка!`)
				.setDescription(`\`\`\`\n${error.message}\n\`\`\``)
				.setColor("#dd2e44")
				.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
			]});

			Module.log.error(`Command ${c.name} failed`, {error, args});
		}
	});
	c.addStringOption(option => option
		.setName("guild-id")
		.setRequired(true)
		.setAutocomplete(true)
	).addStringOption(option => option
		.setName("slash-command-name")
		.setRequired(true)
		.setAutocomplete(true)
	)
	return c;
};