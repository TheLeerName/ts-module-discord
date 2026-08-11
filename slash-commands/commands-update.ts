import Core from "../../../index.js";
import Module from "../index.js";
import { SlashCommand } from "./index.js";

import { EmbedBuilder } from "discord.js";

export default () => new SlashCommand()
.setGlobal()
.setVersion(1)
.setCooldown(30000)
.setName("commands-update")
.setDescription("Updates slash commands of bot")
.setDescriptionLocalization("ru", "Обновляет слэш-команды бота")
.setChatInput(async(interaction) => {
	const start = Date.now();

	await interaction.deferReply();

	const args: any = {
		user: `${interaction.user.username} (${interaction.user.id})`
	};
	if (interaction.inCachedGuild()) {
		args.guild = `${interaction.guild.name} (${interaction.guild.id})`;
		await Module.slashCommands.resetGuild(interaction.guild);
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: Слэш-команды на этом сервере были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
		]});
	}
	else {
		await Module.slashCommands.resetGlobal();
		await interaction.editReply({embeds: [new EmbedBuilder()
			.setTitle(`:white_check_mark: Глобальные слэш-команды были успешно обновлены`)
			.setColor("#77b255")
			.setFooter({text: `Время обработки: ${Core.humanizeDuration(Date.now() - start)}`})
		]});
	}
	Core.log.info(`Command ${interaction.commandName} success`, {args});
});