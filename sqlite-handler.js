// Requires
const fs = require('node:fs');
const path = require('node:path');

// Prepare sqlite3
const sqlite3 = require('sqlite3').verbose();

// Open users.sqlite
const db = new sqlite3.Database('db/users.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the users database from sqlite-handler.js.');
});


/// SQLite functions

async function printDatabase() {
    db.serialize(() => {
        db.each(`SELECT * FROM users;`, (err, row) => {
            if (err) {
                console.error(err.message);
            }
            console.log(`${row.id} - ${row.username} [${row.xp}]`);
        });
    });

};

async function insertRow(id, username) {
    db.run(`INSERT OR IGNORE INTO users (id, username) VALUES (?, ?);`, [id, username], (err) => {
        if (err) {
            console.error('Error inserting row:', err);
        } else {
            console.log(`User ${username} with ID ${id} inserted successfully.`);
        }
    });
}

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

async function closeDatabase() {
    await db.close(async (err) => {
        if (err) {
            await console.error(err.message);
        }
        await console.log('Closed the database connection.');
    });
}

module.exports = { printDatabase, insertRow, addXp, closeDatabase };