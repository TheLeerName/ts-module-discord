import Core from "../../../index.js";
import Module from "../index.js";
import { SlashCommand } from "./index.js";

import { EmbedBuilder, InteractionContextType, ApplicationIntegrationType } from "discord.js";

export default () => new SlashCommand()
.setGlobal()
.setVersion(3)
.setName("ping")
.setDescription("Pings bot")
.setDescriptionLocalization("ru", "Пингует бота")
.setChatInput(async(interaction) => {
	await interaction.deferReply();

	const uptime = interaction.client.uptime;

	let message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: "*замеряю*"},
			{name: "Аптайм", value: Core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: "*замеряю ещё раз*"},
			{name: "Аптайм", value: Core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	const ping = Math.floor((message.createdTimestamp - interaction.createdTimestamp) / 2);
	message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: Core.humanizeDuration(ping)},
			{name: "Аптайм", value: Core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	const args: any = {
		user: `${interaction.user.username} (${interaction.user.id})`,
		ping: `${ping}ms`,
		uptime: `${uptime / 1000}s`
	};
	if (interaction.guild) args.guild = `${interaction.guild.name} (${interaction.guild.id})`;
	Module.log.info(`Command ${interaction.commandName} success`, {args});
});