import Module from "../index.js";
import { EmbedBuilder } from "discord.js";

export default () => Module.slashCommands.make("commands-server-ban", c => {c
.setVersion(1)
.setType("master_guild")
.setDescription("Bans specified slash commands for specified server")
.setDescriptionLocalization("ru", "Запрещает выбранные слэш-команды для выбранного сервера")
.setAutocomplete(async(interaction) => {
	const focused = interaction.options.getFocused(true);
	if (focused.name === "server-id") {
		let answer = interaction.client.guilds.cache;
		if (Module.data.masterGuildID.length > 0)
			answer = answer.filter(g => g.id !== Module.data.masterGuildID);
		return await interaction.respond(answer.map(g => {return {name: g.name, value: g.id}}));
	}
	if (focused.name === "slash-command-names") {
		const index = focused.value.lastIndexOf(",");
		let beforeLastIndex = "";
		let afterLastIndex = focused.value;
		if (index > -1) {
			beforeLastIndex = focused.value.substring(0, index + 1);
			afterLastIndex = focused.value.substring(index + 1);
		}

		return interaction.respond(Array.from(Module.slashCommands.values()).filter(s => s.type === "guild").sort((a, b) => b.name.indexOf(afterLastIndex) - a.name.indexOf(afterLastIndex)).slice(0, 10).map(s => beforeLastIndex + s.name + ",").map(s => {return {name: s, value: s}}));
	}
})
.setChatInput(async(interaction) => {
	const start = Date.now();
	await interaction.deferReply();

	const args: any = {
		member: Module.getGuildMemberNameAndID(interaction.member),
		user: Module.getUserNameAndID(interaction.user),
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
				const slashCommand = Module.slashCommands.get(slashCommandName);
				if (!slashCommand || slashCommand.type !== "guild")
					throw new Error(`Слэш-команда "${slashCommandName}" не может быть запрещена!`);

				const result = slashCommand.setAllowedInGuild(guild.id, false);
				if (!result)
					throw new Error(`Слэш-команда "${slashCommandName}" уже была запрещена на этом сервере!`);
			}
		}
		finally {
			await Module.data.save();
		}

		await Module.slashCommands.resetGuild(guild);

		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: Успешно!`)
			.setColor("#77b255")
			.setFooter({text: `Время обработки: ${Module.core.humanizeDuration(Date.now() - start)}`})
		]});
		Module.log.info(`Command ${interaction.commandName} success`, {args});
	}
	catch(error) {
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:x: Ошибка!`)
			.setDescription(`\`\`\`\n${error.message}\n\`\`\``)
			.setColor("#dd2e44")
			.setFooter({text: `Время обработки: ${Module.core.humanizeDuration(Date.now() - start)}`})
		]});

		Module.log.error(`Command ${interaction.commandName} failed`, {error, args});
	}
});
c
.addStringOption(option => option
	.setName("server-id")
	.setDescription("Discord server id")
	.setRequired(true)
	.setAutocomplete(true)
).addStringOption(option => option
	.setName("slash-command-names")
	.setDescription("Discord slash command names")
	.setRequired(true)
	.setAutocomplete(true)
);return c});