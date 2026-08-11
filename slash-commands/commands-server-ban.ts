import Core from "../../../index.js";
import Module from "../index.js";
import SlashCommands, { SlashCommand } from "./index.js";

import { EmbedBuilder } from "discord.js";

export default () => {
	const c = new SlashCommand()
	.setVersion(1)
	.setBannable(false)
	.setName("commands-server-ban")
	.setDescription("Bans specified slash commands for specified server")
	.setDescriptionLocalization("ru", "Запрещает выбранные слэш-команды для выбранного сервера")
	.setAutocomplete(async(interaction) => {
		const focused = interaction.options.getFocused(true);
		if (focused.name === "server-id")
			return interaction.respond(interaction.client.guilds.cache.map(g => {return {name: g.name, value: g.id}}).sort((a, b) => a.name.indexOf(focused.value) - b.name.indexOf(focused.value)).slice(0, 5));
		if (focused.name === "slash-command-names") {
			if (interaction.inCachedGuild()) {
				const index = focused.value.lastIndexOf(",");
				let beforeLastIndex = "";
				let afterLastIndex = focused.value;
				if (index > -1) {
					beforeLastIndex = focused.value.substring(0, index + 1);
					afterLastIndex = focused.value.substring(index + 1);
				}

				return interaction.respond(SlashCommands.filter(s => !s.global && s.bannable).sort((a, b) => b.name.indexOf(afterLastIndex) - a.name.indexOf(afterLastIndex)).slice(0, 10).map(s => beforeLastIndex + s.name + ",").map(s => {return {name: s, value: s}}));
			}
			return interaction.respond([]);
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
			const guildID = interaction.options.getString("server-id", true);
			if (guildID.length < 1)
				throw new Error("Параметр server-id не указан");
			args.guildID = guildID;

			let slashCommandNames = interaction.options.getString("slash-command-names", true);
			if (slashCommandNames.length < 1)
				throw new Error("Параметр slash-command-names не указан");
			args.slashCommandNames = slashCommandNames;

			const guild = await interaction.client.guilds.fetch(guildID);
			args.guildName = guild.name;

			try {
				for (const slashCommandName of slashCommandNames.split(",")) {
					const slashCommand = Module.slashCommands.findBannableByName(slashCommandName);
					if (!slashCommand)
						throw new Error(`Слэш-команда "${slashCommandName}" либо не существует либо её нельзя запретить на этом сервере!`);

					const result = slashCommand.setAllowedInGuild(guild.id, false);
					if (!result)
						throw new Error(`Слэш-команда "${slashCommandName}" уже была запрещена на этом сервере!`);
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
		.setName("server-id")
		.setDescription("Discord server id")
		.setRequired(true)
		.setAutocomplete(true)
	).addStringOption(option => option
		.setName("slash-command-names")
		.setDescription("Discord slash command names")
		.setRequired(true)
		.setAutocomplete(true)
	)
	return c;
};