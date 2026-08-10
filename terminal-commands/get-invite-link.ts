import TerminalCommands from "../../../terminal-commands/index.js";
import Module from "../index.js";

export default () => {
	TerminalCommands.registerWithReadlineInterface("discord:getinvitelink", async(argv, rl) => {
		Module.data.checkRequiredFields();

		console.log("\nWaiting for connection...");
		Module.createClient();
		let result = "";
		try {
			result = await Module.client.login(Module.data.token);
		}
		catch(e) {
			result = e.code?.startsWith("UND_") ? e.name : e.code;
		}

		if (result === "TokenInvalid") {
			console.error("Token is invalid, maybe you forgot some symbols?");
			return true;
		}
		else if (result === "ConnectTimeoutError") {
			console.error("Can't connect to Discord, maybe Discord servers has problems right now?");
			return true;
		}
		else if (result !== Module.data.token) {
			console.error(`Connection error - ${result}`);
			return true;
		}

		Module.emit("addAuthorizationFields", Reflect.get(Module, "authorizationManager"));

		console.log(`Bot invite link:\n${Module.getInviteURL()}`);
		Module.client.destroy();

		return true;
	});
}