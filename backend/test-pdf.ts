import fs from 'fs';
const pdfParse = require('pdf-parse');

async function test() {
  try {
    const dataBuffer = fs.readFileSync('package.json'); // Just reading any file to see if pdfParse throws when called
    const data = await pdfParse(dataBuffer);
    console.log("Success", data);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
