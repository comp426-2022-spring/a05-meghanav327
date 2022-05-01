const database = require('better-sqlite3')

const fs = require('fs');
const datadir = './data/';

if (!fs.existsSync(datadir)) {
    fs.mkdirSync(datadir);
}

const db = new database(datadir + 'log.db')

const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' and name='accesslog';`)
let row = stmt.get();
if (row === undefined) {
    console.log('Log database appears to be empty. Creating log database...')

    const sqlInit = `
        CREATE TABLE accesslog ( 
            id INTEGER PRIMARY KEY, 
            remoteaddr TEXT,
            remoteuser TEXT,
            time TEXT,
            method TEXT,
            url TEXT,
            protocol TEXT,
            httpversion TEXT,
            status TEXT, 
            referrer TEXT,
            useragent TEXT
        );
    `

    db.exec(sqlInit)
} else {
    console.log('Log database exists.')
}

module.exports = db