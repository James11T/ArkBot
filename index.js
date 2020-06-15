const Discord = require("discord.js");
const Rcon = require("rcon");
const client = new Discord.Client();
var mainChannel = "000000000000000000"; // Ids will be converted to channels once the bot is readu
var chatChannel = "000000000000000000";
var commandsChannel = "000000000000000000";
const updateInterval = 1000; // 1 second interval
const ip = "127.0.0.1";
const port = 27015;
const pword = "password";
const validChars = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890áéíóúÁÉÍÓÚ!\"£$%^&*)(][}{;'#,./:@~<>?*\\¦`";
const token = "abcdefghijklmnopqrstuvwxyz";

var conn = new Rcon(ip, port, pword);

var actions = [];

function charCode(inStr) {
    // Add up the all the character codes in a string
    var count = 0;
    for (var i = 0; i < inStr.length; ++i) {
        count += inStr.charCodeAt(i);
    }
    return count;
}

function seededRandom(max, min, seed) {
    // Generate a seeded random number between max and min
    max = max || 1;
    min = min || 0;
 
    seed = (seed * 9301 + 49297) % 233280;
    var rnd = seed / 233280;
 
    // Return as hex for colour
    return Math.floor(min + rnd * (max - min)).toString(16);
}

function nameToColor(name) {
    // Convert the name to a repeatable but random colour
    var seed = charCode(name);
    // Vary the seed to allow for a wider colour band
    return "#" + seededRandom(0, 255, seed) + seededRandom(0, 255, seed * seed) + seededRandom(0, 255, seed * 2 + seed);
}

function parsePlayerList(pl) {
    if (pl[0][0] === "0") {
        // Check there are players online
        // 0. Name, 000000000000
        // Will be returned if a player is online
        var em = new Discord.MessageEmbed();
        em.setColor("#00ced1");
        em.setTitle("Player List");
        var allPlayers = "";
        for (var i = 0; i < pl.length; ++i) {
            var line = pl[i];
            allPlayers += `**${(i + 1).toString()}. **${line.split(". ")[1]}\n`
        }
        em.addField("Players Online", allPlayers, false);
        return em;
    } else if (pl[0].startsWith("No Players Connected")) {
        return "Nobody is online";
    }
}

function parseChatOutput(co) {
    var chatActivity = {};
    chatActivity.chat = [];
    chatActivity.commands = [];
    if (!co[0].startsWith("Server received, But no response!!")) {
        // Check there is something new in the chat
        for (var i = 0; i < co.length; ++i) {
            var line = co[i];
            if (line.startsWith("AdminCmd: ")) {
                // Admin commands are prefixed with AdminCmd:
                // AdminCmd: fly (PlayerName: NAME, ARKID: 000000000, SteamID: 00000000000000000)
                line = line.replace("AdminCmd: ", "");
                var commandSplit = line.split("("); // Isolate the command and the data
                commandSplit[1] = commandSplit[1].replace(")", ""); // Remove closing bracket
                var em = new Discord.MessageEmbed();
                em.setTitle("Admin Command Executed");
                var dataSplit = commandSplit[1].split(", "); // Seperate all the data
                for (var i = 0; i < dataSplit.length; ++i) {
                    var dataGet = dataSplit[i];
                    var splitThat = dataGet.split(": ");
                    if (i == 0) {
                        em.setColor(nameToColor(splitThat[1])); // Convert the player name to a unique color for easy reading
                    }
                    em.addField(splitThat[0], splitThat[1], false);
                }
                em.addField("Command", "`" + commandSplit[0] + "`", false);
                chatActivity.commands.push(em);
            } else {
                // Normal chat message
                var ls = line.split(":"); // Seperate name and message
                var sender = ls[0];
                if (sender != "SERVER") {
                    // Check message is not from SERVER to prevent cyclical messages
                    ls.splice(0, 1);
                    chatActivity.chat.push(`**${sender}**:${ls.join(":")}`);
                }
            }
        }
    }
    return chatActivity;
}

function cleanResponse(r) {
    // Clean and process a response string
    var splitr = r.split("\n");
    var validLines = [];
    for (var i = 0; i < splitr.length; ++i) {
        if (splitr[i].replace(" ", "").length > 0) {
            // Remove all blank lines
            validLines.push(splitr[i]);
        }
    }
    return validLines;
}

function trimActions() {
    actions.splice(0, 1);
}

function processActions(r) {
    // Process a request based on action
    switch(actions[0]) {
        case "listplayers":
            commandsChannel.send(parsePlayerList(r));
            break;
        case "broadcast":
            commandsChannel.send("Broadcast sent");
            break;
        case "getchat":
            chatActivity = parseChatOutput(r);
            // Split into commands and chat
            for (var i = 0; i < chatActivity.commands.length; ++i) {
                mainChannel.send(chatActivity.commands[i]);
            }
            for (var i = 0; i < chatActivity.chat.length; ++i) {
                chatChannel.send(chatActivity.chat[i]);
            }
            break;
        case "serverchat":
            // No response needed
            break;
        default:
            // Should never occour
            commandsChannel.send("Invalid action `" + actions[0] + "`");
            break;
    }
    trimActions()
}

function checkInput(inStr) {
    // Check all the characters in a users input are safe to send to the server
    // Characters like | crash sometimes
    for (var i = 0; i < inStr.length; ++i) {
        if (validChars.indexOf(inStr[i]) < 0) {
            // Invalid character in string
            return false;
        }
    }
    return true;
}

conn.on("auth", function() {
    console.log("RCON Connected");
});

conn.on("response", function(r) {
    processActions(cleanResponse(r));
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    mainChannel = client.channels.cache.get(mainChannel); // Load the channels from cache
    chatChannel = client.channels.cache.get(chatChannel);
    commandsChannel = client.channels.cache.get(commandsChannel);
    
    // Get chat history from when bot was offline
    actions.push("getchat");
    conn.send("getchat");
});

conn.connect();

client.on("message", msg => {
    if (msg.author.bot) {
        return;
    }
    if (msg.channel === chatChannel) {
        // Send discord message as server chat if safe
        if (!checkInput(msg.content)) {
            // Check no crashy characters are in string
            msg.reply("Illegal characters in message, chat relay has been aborted.");
            return;
        }
        actions.push("serverchat");
        conn.send(`serverchat ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`);
    } else if (msg.content.startsWith(">") && msg.content.length > 1 && msg.channel === commandsChannel) {
        var args = msg.content.substr(1).split(" ");
        var command = args[0];
        args.splice(0, 1);
        var argJoin = args.join(" ")
        // Parse command
        switch (command) {
            case "playerlist":
                actions.push("listplayers");
                conn.send("listplayers");
                break;
            case "broadcast":
                if (args.length > 0) {
                    // Check actual broadcast was given
                    if (!checkInput(argJoin)) {
                        msg.reply("Illegal characters in message, broadcast has been aborted.");
                    } else {
                        actions.push("broadcast");
                        conn.send("broadcast " + argJoin);
                    }
                } else {
                    commandsChannel.send("Can't send empty broadcast")
                }
                break;
            default:
                break;
        }
    }
});

setInterval(function(){
    // Get chat history at set interval
    actions.push("getchat");
    conn.send("getchat");
}, updateInterval);

client.login(token);
