// Requires
const fs = require('node:fs');
const path = require('node:path');
const readline = require('readline');

// Prepare readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prepare sqlite3
const sqlite3 = require('sqlite3').verbose();

// Open users.sqlite
const db = new sqlite3.Database('db/users.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the users database.');
});

// Check every minute

function getVoiceChannelUsers() {
    console.log('Voice channels have been checked.');
}

// Wait 10 seconds, then run every 60 seconds

setTimeout(() => {
    setInterval(getVoiceChannelUsers, 60 * 1000);
}, 10 * 1000);



/// Shortcuts


// Prepare reading keys
readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY)
    process.stdin.setRawMode(true);

async function addXp(id, xp) {
    let currentXp;
    await db.get(`SELECT xp FROM users WHERE id = (?)`, id, async function (err, row) {
        currentXp = row.xp;
        await console.log(`DEBUG: currentXp value is ${currentXp}`);
        xp = +xp;
        await console.log(`DEBUG: Sum of currentXp and xp to be added is ${currentXp + xp}`);
        await db.run(`UPDATE users SET xp = (?) WHERE id = (?);`, [currentXp + xp, id], async function (err) {
            if (err) {
                return console.log(err.message);
            }
        });
    });
};

console.log('Press P to print the SQL database. Press ESC to stop the bot.');

process.stdin.on('keypress', async (chunk, key) => {
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
    // Insert row
    if (key && key.name == 'i') {
        rl.question('Please enter the user\'s ID: ', (id) => {
            rl.question('Please enter the username: ', (username) => {
                db.run(`INSERT INTO users (id, username) VALUES (${id}, '${username}');`);
            });
        });
    }
    // Add XP to user
    if (key && key.name == 'a') {
        await rl.question('Please enter the user\'s ID: ', async (id) => {
            await rl.question('Please enter the amount of XP to be added: ', async (xp) => {
                addXp(id, xp);
            });
        });
    }
    // Stopping the bot
    if (key && key.name == 'escape') {
        rl.close();
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