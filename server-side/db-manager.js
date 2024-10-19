const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const DB_PATH = path.join(__dirname, 'db.json');

function readDatabase() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getValueAtPath(obj, path) {
    return _.get(obj, path);
}

function setValueAtPath(obj, path, value) {
    _.set(obj, path, value);
    writeDatabase(obj);
}

// Usage example
function main() {
    const pathToUpdate = 'users/wr23rty7asfn/stats/paid';
    const db = readDatabase();

    // Set a value
    setValueAtPath(db, pathToUpdate, { paid: true });
    console.log(`Updated ${pathToUpdate}:`, getValueAtPath(db, pathToUpdate));

    // Read a value
    console.log(`Current value:`, getValueAtPath(db, pathToUpdate));
}

module.exports = {
    readDatabase,
    writeDatabase,
    getValueAtPath,
    setValueAtPath
};
