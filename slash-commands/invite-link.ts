import Module from "../index.js";
import { EmbedBuilder } from "discord.js";

export default () => Module.slashCommands.make("invite-link", c => c
.setVersion(1)
.setBannable(false)
.setForMasterGuild(true)
.setDescription("Sends invite link of bot for discord server")
.setDescriptionLocalization("ru", "Отправляет ссылку приглашения бота для Discord-сервера")
.setChatInput(async(interaction) => {
	const start = Date.now();

	await interaction.deferReply();

	const args: any = {
		user: Module.getUserNameAndID(interaction.user),
		inviteURL: Module.getInviteURL(),
	};
	if (interaction.inCachedGuild()) {
		args.guild = Module.getGuildNameAndID(interaction.guild);
		delete args.user;
		args.member = Module.getGuildMemberNameAndID(interaction.member);
	}
	await interaction.editReply({embeds: [new EmbedBuilder()
		.setTitle(`:white_check_mark: Успешно!`)
		.setColor("#77b255")
		.setFields({name: "Ссылка", value: args.inviteURL})
		.setFooter({text: `Время обработки: ${Module.core.humanizeDuration(Date.now() - start)}`})
	]});
	Module.log.info(`Command ${interaction.commandName} success`, {args});
}));