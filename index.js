// Requires
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const readline = require('readline');
const sqliteHandler = require('./sqlite-handler.js');





// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates
	]
});

// Command handler

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Recieve and execute command interactions

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
	setInterval(() => distributeXp(), 10 * 60 * 1000);
});

// Log in to Discord with your client's token
client.login(token);



/// Database management

// Insert all users to database when bot joins the server

client.on('guildCreate', async (guild) => {
	var memberList;

	try {
		const members = await guild.members.fetch();

        // Extract IDs and usernames
        memberList = members.map((member) => ({
            id: member.user.id,
            username: member.user.username,
        }));

        console.log(memberList);
    } catch (error) {
        console.error('Error fetching members:', error);
    }
	memberList.forEach(async (user) => await sqliteHandler.insertRow(user.id, user.username));
});

// Insert new users when they join the server

client.on('guildMemberAdd', async (member) => {
    const { id, username } = member.user;
    try {
        await sqliteHandler.insertRow(id, username);
        console.log(`User ${username} with ID ${id} added to the database.`);
    } catch (error) {
        console.error('Error adding user to the database:', error);
    }
});

// TODO: Rank reset: if rank roles are different to those on ranks.sqlite, remove all rank roles and replace for current AND reset all users XP


// Periodically detect users in VC and add XP to them

async function distributeXp() {
    try {
        // Loop through all guilds
        client.guilds.cache.forEach(async (guild) => {
            // Fetch all members in the guild
            const members = await guild.members.fetch();

            // Loop through all members
            members.forEach((member) => {
                // Check if the member is in a voice channel
                const voiceChannel = member.voice.channel;
                if (voiceChannel) {
                    // Generate a random XP between 300 and 500
                    const xp = Math.floor(Math.random() * (500 - 300 + 1)) + 300;

                    // Call your addXp function here
                    sqliteHandler.addXp(member.user.id, xp);
                }
            });
        });
    } catch (error) {
        console.error('Error distributing XP:', error);
    }
}


// TODO: Check user XP and send message on rank up

// Function to check and apply ranks
async function checkAndApplyRanks(guild, member) {
    // Get the user's current XP from the database (replace with your actual method)
    const currentXp = await sqliteHandler.getXPFromDatabase(member.user.id);

    // Get the ranks from the database (replace with your actual method)
    const ranks = await sqliteHandler.getRanksFromDatabase();

    // Check if the user has reached a rank threshold
    for (const rank of ranks) {
        if (currentXp >= rank.threshold) {
            // User reached a rank threshold
            const generalChannel = guild.channels.cache.find(channel => channel.name === 'general');
            if (generalChannel && generalChannel.isText()) {
                generalChannel.send(`Congratulations, ${member.user.username}! You reached the rank of ${rank.name}!`);
            }

            // Apply the role named after the rank
            const role = guild.roles.cache.find(role => role.name === rank.name);
            if (role) {
                member.roles.add(role);
            }
        }
    }
}



// Check every minute

function getVoiceChannelUsers() {
	console.log('Voice channels have been checked.');
}

// Wait 10 seconds, then run every 60 seconds

setTimeout(() => {
	setInterval(getVoiceChannelUsers, 60 * 1000);
}, 10 * 1000);








/// UI

// Prepare readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Shortcuts

// Prepare reading keys
readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY)
	process.stdin.setRawMode(true);

console.log('Press ESC to stop the bot.\nCommands available: printUsersDatabase, insertRow, addXp');

process.stdin.on('keypress', async (chunk, key) => {

	if (key && key.name == 'p') {
		await sqliteHandler.printUsersDatabase();
	}

	if (key && key.name == 'i') {
		rl.question(`User to be inserted - ID: `, async (id) => {
			rl.question(`User to be inserted - username: `, async (username) => {
				await sqliteHandler.insertRow(id, username);
			})
		})
	}

	if (key && key.name == 'a') {
		rl.question(`ID of user to add XP to: `, async (id) => {
			rl.question(`Amount of XP to add: `, async (xp) => {
				await sqliteHandler.addXp(id, xp);
			})
		})
	}

	// Stopping the bot
	if (key && key.name == 'escape') {
		await sqliteHandler.closeDatabases();
		await console.log('Bye-bye!');
		await process.exit();
	}
});