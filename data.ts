import Core from "../../index.js";
import { BaseData } from "../../data.js";

export default class ModuleData extends BaseData {
	version: number = 1;
	token: string = "";
	activity: string = "";
	/** guild, where you can add slash commands to guilds and some other management things (tip: you can restrict these commands from using by everyone role) */
	masterGuildID: string = "";
	/** slash command name, version */
	//slashCommandVersions: Map<string, number> = new Map();
	/** slash command name, guild ids */
	slashCommandGuildAllowed: Map<string, Map<string, boolean>> = new Map();

	initialize() {
		const json = this.getSavedFields();
		let needsSave = true;

		needsSave = !this.registerFieldString(json, "token");
		needsSave = !this.registerFieldString(json, "activity");
		needsSave = !this.registerFieldString(json, "masterGuildID");
		//needsSave = !this.registerFieldMap(json, "slashCommandVersions");
		needsSave = !this.registerFieldMap(json, "slashCommandGuildAllowed");

		if (needsSave)
			this.save();
		return this;
	}

	checkRequiredFields() {
		if (this.token.length < 1)
			Core.log.fatal(`Config parameter "token" is empty, please initialize app with "node index.js discord:init"`);
	}
}