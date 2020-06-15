# ArkBot
ArkBot is a discord bot built on the Discord.js library. It uses the RCON library and the respective protocol to connect to an Ark Survival Evolved server and provide features such as player lists, server broadcasts, live game chat sync and admin command logging. The bot prefix is >.
## Commands
### playerlist
The player list command sends a playlist query to the ark server, parses the response and sends a discord embed message containing the name and ID of all the current online players.
### broadcast
The broadcast command sends the given message to the server to be displayed to all players at the top of their screen in a broadcast message. The broadcast is only sent if it contains data and doesn’t contain illegal characters.
## Live Chat
The bots live chat functionality works by sending a chat query to the server every second by default, but this can be changed. The response is then parsed and sent to the chat channel for display. Any Discord messages sent to the chat channel are relayed back to the ark server and displayed along with the Discord users name and discriminator.
## Command Logging
When a player executes an admin command it will be sent to the log channel which is defined by the mainChannel variable. The message will contain the player name, ArkID, SteamID and the command executed. Depending on the user who executed the command, the embed will display a different colour. This is to allow you to be able to easily see who executed what command.
## Requirements
The bot requires the Discord.js and RCON library to function.