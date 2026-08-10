# Leer's TS module: Discord
Contains methods to use Discord bot API

## Features
1. Adds discord slash commands:
|Name|Description|
|---|---|
|`/ping`|Sends ping in milliseconds and uptime formatted with `HumanizeDuration.js` as embed message|
|`/commands-update`|Sended on guild: updates slash commands in that guild\Sended outside guild: updates global slash commands|
|`/commands-guild-allow`|Allows specified slash command on specified guild|
|`/commands-guild-ban`|Bans specified slash command on specified guild|
2. Slash command whitelist:
- If `GUILD_SLASH_COMMAND_RESTRICT_BY_DEFAULT` in `./slash-commands/index.ts` is `true`, slash command will be not added to guild without doing `/commands-guild-allow`
3. Adds terminal commands:
|Command|Description|
|---|---|
|`node index.js discord:init`|Sets some required parameters for module:\- bot token\- bot activity text\- master guild id|
|`node index.js discord:getinvitelink`|Outputs bot invite link to terminal|
4. Adding intents / partials / permissions / scopes of bot
5. `shard0Ready` callback to reload things on reconnect to discord

## How to use this module?
- Go to [parent repository](https://github.com/TheLeerName/ts-module-core) and read `README.md` file