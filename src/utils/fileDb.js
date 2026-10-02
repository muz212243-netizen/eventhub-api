// src/utils/fileDb.js
const fs = require("fs/promises");
const path = require("path");

const filePath = (name) => path.join(__dirname, "../../data", `${name}.json`);

async function readData(name) {
  const text = await fs.readFile(filePath(name), "utf-8");
  return JSON.parse(text);
}

async function writeData(name, data) {
  await fs.writeFile(filePath(name), JSON.stringify(data, null, 2));
}

module.exports = { readData, writeData };
