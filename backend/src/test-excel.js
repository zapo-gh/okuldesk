const xlsx = require('xlsx');

const workbook = xlsx.readFile('C:\\Users\\AlizMTAL\\Desktop\\Programlar\\okulDesk v2\\OgretmenProgrami.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(JSON.stringify(data.slice(0, 30), null, 2));
