import Module from "../index.js";
import { EmbedBuilder } from "discord.js";

export default () => Module.slashCommands.make("commands-update", c => c
.setGlobal()
.setVersion(1)
.setBannable(false)
.setCooldown(30000)
.setDescription("Updates slash commands of bot")
.setDescriptionLocalization("ru", "Обновляет слэш-команды бота")
.setChatInput(async(interaction) => {
	const start = Date.now();

	await interaction.deferReply();

	const args: any = {
		user: Module.getUserNameAndID(interaction.user),
	};
	if (interaction.inCachedGuild()) {
		args.guild = Module.getGuildNameAndID(interaction.guild);
		delete args.user;
		args.member = Module.getGuildMemberNameAndID(interaction.member);

		await Module.slashCommands.resetGlobal(false);
		await Module.slashCommands.resetGuild(interaction.guild, false);
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: Слэш-команды были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Время обработки: ${Module.core.humanizeDuration(Date.now() - start)}`})
		]});
	}
	else {
		await Module.slashCommands.resetGlobal(false);
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: Глобальные слэш-команды были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Время обработки: ${Module.core.humanizeDuration(Date.now() - start)}`})
		]});
	}
	Module.log.info(`Command ${interaction.commandName} success`, {args});
}));