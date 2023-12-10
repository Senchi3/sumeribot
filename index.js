// Requires
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const readline = require('readline');

// Prepare sqlite3
const sqlite3 = require('sqlite3').verbose();

// Open users.sqlite
const db = new sqlite3.Database('db/users.sqlite', (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to the users database.');
});

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

// Check every minute

function getVoiceChannelUsers() {
	console.log('Voice channels have been checked.');
}

// Wait 10 seconds, then run every 60 seconds

setTimeout(() => {
	setInterval(getVoiceChannelUsers, 60 * 1000);
	console.log(client.isReady());
}, 10 * 1000);


/// Shortcuts


// Prepare reading keys
readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY)
	process.stdin.setRawMode(true);

console.log('Press P to print the SQL database. Press Q to close the SQL database. Press ESC to stop the bot.');

process.stdin.on('keypress', (chunk, key) => {
	// Test users.sqlite
	if (key && key.name == 'p') {
		db.serialize(() => {
			db.each(`SELECT * FROM users;`, (err, row) => {
				if (err) {
					console.error(err.message);
				}
				console.log(`${row.id} - ${row.username} [${row.xp}]`);
			});
		});
	}
	// Closing the SQL database
	if (key && key.name == 'q') {
		db.close((err) => {
			if (err) {
				console.error(err.message);
			}
			console.log('Closed the database connection.');
		});
	}
	// Stopping the bot
	if (key && key.name == 'escape') {
		db.close((err) => {
			if (err) {
				console.error(err.message);
			}
			console.log('Closed the database connection.');
		});
		console.log('Bye-bye!');
		process.exit();
	}
});