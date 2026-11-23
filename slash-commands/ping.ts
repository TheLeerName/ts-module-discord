import Module from "../index.js";
import { EmbedBuilder } from "discord.js";

export default () => Module.slashCommands.make("ping", c => c
.setVersion(3)
.setType("global")
.setDescription("Pings bot")
.setDescriptionLocalization("ru", "Пингует бота")
.setChatInput(async(interaction) => {
	await interaction.deferReply();

	const uptime = interaction.client.uptime;

	let message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: "*замеряю*"},
			{name: "Аптайм", value: Module.core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: "*замеряю ещё раз*"},
			{name: "Аптайм", value: Module.core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	const ping = Math.floor((message.createdTimestamp - interaction.createdTimestamp) / 2);
	message = await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:ping_pong: Понг!`)
		.addFields(
			{name: "Пинг", value: Module.core.humanizeDuration(ping)},
			{name: "Аптайм", value: Module.core.humanizeDuration(uptime)},
		)
		.setColor("#77b255")
	]});

	const args: any = {
		user: Module.getUserNameAndID(interaction.user),
		ping: `${ping}ms`,
		uptime: `${uptime / 1000}s`
	};
	if (interaction.inCachedGuild()) {
		args.guild = Module.getGuildNameAndID(interaction.guild);
		delete args.user;
		args.member = Module.getGuildMemberNameAndID(interaction.member);
	}
	Module.log.info(`Command ${interaction.commandName} success`, {args});
}));