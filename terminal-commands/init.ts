import { DiscordAPIError, DiscordjsError } from "discord.js";
import TerminalCommands, { ReadlineInterfaceAdvanced } from "../../../terminal-commands/index.js";
import Module from "../index.js";

async function tokenPart(rl: ReadlineInterfaceAdvanced) {
	console.log(`Enter Discord bot token here\nYou can get it from https://discord.com/developers/applications\n`);

	if (Module.data.token)
		rl.write(Module.data.token);
	const token = await rl.questionAsync("token: ");

	let date = Date.now();
	console.log("\nWaiting for connection...");

	Module.createClient();
	let result = "";
	try {
		result = await Module.client.login(token);
	}
	catch(e) {
		result = e.code?.startsWith("UND_") ? e.name : e.code;
	}
	Module.client.destroy();

	if (result === "TokenInvalid") {
		console.error("Token is invalid, maybe you forgot some symbols?");
		process.exit(1);
	}
	else if (result === "ConnectTimeoutError") {
		console.error("Can't connect to Discord, maybe Discord servers has problems right now?");
		process.exit(1);
	}
	else if (result !== token) {
		console.error(`Connection error - ${result}`);
		process.exit(1);
	}
	Module.data.token = token;
	Module.data.save();
	console.log(`Successfully verified and saved! (${Date.now() - date}ms elapsed)`);
}

async function activityPart(rl: ReadlineInterfaceAdvanced) {
	console.log(`Enter Discord bot activity status\nLeave empty to disable it\nPlaceholders:\n%version% - app version\n`);

	if (Module.data.activity)
		rl.write(Module.data.activity);
	const activity = await rl.questionAsync("activity: ");
	Module.data.activity = activity;
	Module.data.save();
	console.log("Saved!");
}

async function masterGuildIDPart(rl: ReadlineInterfaceAdvanced) {
	console.log(`Enter Discord master guild id\nMaster guild is discord server, where you can use some bot management things like: allowing/banning slash commands for specified guild\nBot must be in that server for getting info about it\nTo get it, firstly enable developer mode in Discord, and RMB on guild icon and copy ID\nLeave empty to disable it\n`);

	if (Module.data.masterGuildID)
		rl.write(Module.data.masterGuildID);
	const masterGuildID = await rl.questionAsync("masterGuildID: ");

	if (masterGuildID.length > 0) {
		let date = Date.now();
		console.log("\nWaiting for connection...");

		Module.createClient();
		let result: any = "";
		try {
			result = await Module.client.login(Module.data.token);
			console.log(`Connected to Discord (${Date.now() - date}ms elapsed)`);
			date = Date.now();
		}
		catch(e) {
			result = e.code?.startsWith("UND_") ? e.name : e.code;
		}
		if (result === "TokenInvalid") {
			console.error("Token is invalid, try to enter working token to config");
			process.exit(1);
		}
		else if (result === "ConnectTimeoutError") {
			console.error("Can't connect to Discord, maybe Discord servers has problems right now?");
			process.exit(1);
		}
		else if (result !== Module.data.token) {
			console.error(`Connection error - ${result}`);
			process.exit(1);
		}

		result = await new Promise(async(resolve) => {
			Module.client.once("clientReady", async(client) => {
				try {
					const guild = await client.guilds.fetch(masterGuildID);
					resolve(`Server name: ${guild.name}`);
				}
				catch(e) {
					resolve(e.code);
				}
			});
		});
		await Module.client.destroy();

		if (result === 10004) {
			console.error(`Guild wasn't found with that ID, maybe ID is wrong? (error code: 10004)`);
			process.exit(1);
		}
		else if (typeof result === "number") {
			console.error(`Guild getting failed! (error code: ${result})`);
			process.exit(1);
		}
		console.log(result);
	}

	Module.data.masterGuildID = masterGuildID;
	Module.data.save();
	console.log("Saved!");
}

export default () => {
	TerminalCommands.registerWithReadlineInterface("discord:init", async(argv, rl) => {
		console.log("");

		if (argv.length > 0) {
			if (argv.includes("token")) {
					await tokenPart(rl);
				console.log("");
			}
		} else {
			if (Module.data.token.length < 1)
				await tokenPart(rl);
			else {
				if ((await rl.questionAsync("Edit Discord bot token? (y/n): ")).toLowerCase() === "y")
					await tokenPart(rl);
			}
			console.log("");
		}

		if (argv.length > 0) {
			if (argv.includes("activity")) {
				await activityPart(rl);
				console.log("");
			}
		} else {
			if (Module.data.activity.length < 1)
				await activityPart(rl);
			else {
				if ((await rl.questionAsync("Edit Discord bot activity status? (y/n): ")).toLowerCase() === "y") {
					console.log("");
					await activityPart(rl);
				}
			}
			console.log("");
		}

		if (argv.length > 0) {
			if (argv.includes("masterGuildID")) {
				await masterGuildIDPart(rl);
				console.log("");
			}
		} else {
			if (Module.data.masterGuildID.length < 1)
				await masterGuildIDPart(rl);
			else {
				if ((await rl.questionAsync("Edit Discord master guild ID? (y/n): ")).toLowerCase() === "y") {
					console.log("");
					await masterGuildIDPart(rl);
				}
			}
			console.log("");
		}

		return true;
	});
}