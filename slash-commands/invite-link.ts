import Core from "../../../index.js";
import Module from "../index.js";
import { SlashCommand } from "./index.js";

import { EmbedBuilder } from "discord.js";

export default () => new SlashCommand()
.setVersion(1)
.setBannable(false)
.setForMasterGuild(true)
.setName("invite-link")
.setDescription("Sends invite link of bot for discord server")
.setDescriptionLocalization("ru", "Отправляет ссылку приглашения бота для Discord-сервера")
.setChatInput(async(interaction) => {
	const start = Date.now();

	await interaction.deferReply();

	const args: any = {
		user: `${interaction.user.username} (${interaction.user.id})`,
		inviteURL: Module.getInviteURL()
	};
	await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:white_check_mark: Успешно!`)
		.setColor("#77b255")
		.setFields({name: "Ссылка", value: args.inviteURL})
		.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
	]});
	Core.log.info(`Command ${interaction.commandName} success`, {args});
});