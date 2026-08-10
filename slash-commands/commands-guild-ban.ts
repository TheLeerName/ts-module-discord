import Core from "../../../index.js";
import Module from "../index.js";
import SlashCommands, { SlashCommand } from "./index.js";

import { EmbedBuilder } from "discord.js";

export default () => {
	const c = new SlashCommand()
	.setVersion(1)
	.setForMasterGuild(true)
	.setName("commands-guild-ban")
	.setDescription("Bans specified slash commands for specified guild")
	.setDescriptionLocalization("ru", "Запрещает выбранные слэш-команды для выбранного сервера")
	.setAutocomplete(async(interaction) => {
		const focused = interaction.options.getFocused(true);
		if (focused.name === "guild-id")
			return await interaction.respond(interaction.client.guilds.cache.map(g => {return {name: g.name, value: g.id}}).sort((a, b) => a.name.indexOf(focused.value) - b.name.indexOf(focused.value)).slice(0, 5));
		if (focused.name === "slash-command-names") {
			const index = focused.value.indexOf(",");
			if (index > -1)
				focused.value = focused.value.substring(index + 1);

			return await interaction.respond(SlashCommands.filter(s => !s.global).sort((a, b) => a.name.indexOf(focused.value) - b.name.indexOf(focused.value)).slice(0, 5).map(s => {return {name: s.name, value: s.name}}));
		}
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

			let slashCommandNames = interaction.options.getString("slash-command-names", true);
			if (slashCommandNames.length < 1)
				throw new Error("Параметр slash-command-names не указан");
			args.slashCommandNames = slashCommandNames;

			const guild = await interaction.client.guilds.fetch(guildID);
			args.guildName = guild.name;

			try {
				for (const slashCommandName of slashCommandNames.split(",")) {
					if (!Module.slashCommands.findByName(slashCommandName))
						throw new Error(`Я не нашёл у себя слэш-команды с названием "${slashCommandName}"!`);

					let dataGuilds = Module.data.slashCommandGuildAllowed.get(slashCommandName);
					if (dataGuilds) {
						if (dataGuilds.get(guild.id) == false)
							throw new Error(`Слэш-команда "${slashCommandName}" уже была запрещена на сервере ${guild.name}!`);
					}
					else {
						dataGuilds = new Map();
						Module.data.slashCommandGuildAllowed.set(slashCommandName, dataGuilds);
					}

					dataGuilds.set(guild.id, false);
				}
			}
			finally {
				Module.data.save();
			}

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
		.setName("slash-command-names")
		.setRequired(true)
		.setAutocomplete(true)
	)
	return c;
};