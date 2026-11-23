import Core from "../../index.js";
import { BaseData } from "../../data.js";

export default class Data extends BaseData {
	version: number = 1;
	token: string = "";
	activity: string = "";
	/** guild, where you can add slash commands to guilds and some other management things (tip: you can restrict these commands from using by everyone role) */
	masterGuildID: string = "";
	/** slash command name, version */
	//slashCommandVersions: Map<string, number> = new Map();
	/** slash command name, guild ids */
	slashCommandGuildAllowed: Map<string, Map<string, boolean>> = new Map();

	/** If this `true`, next call of {@link save()} will save data */
	needsSave = false;

	initialize() {
		const json = this.getSavedFields();
		this.needsSave = true;

		this.needsSave = !this.registerFieldString(json, "token");
		this.needsSave = !this.registerFieldString(json, "activity");
		this.needsSave = !this.registerFieldString(json, "masterGuildID");
		//needsSave = !this.registerFieldMap(json, "slashCommandVersions");
		this.needsSave = !this.registerFieldMap(json, "slashCommandGuildAllowed");

		this.save();
		return this;
	}

	async save(force?: boolean) {
		if (force || this.needsSave) {
			await super.save();
			this.needsSave = false;
		}
	}

	checkRequiredFields() {
		if (this.token.length < 1)
			Core.log.fatal(`Config parameter "token" is empty, please initialize app with "node index.js discord:init"`);
	}
}