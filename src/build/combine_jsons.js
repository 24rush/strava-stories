// combine_json.js
import fs from "fs";
import path from "path";

function combineJSON(inputFolder, outputFile) {
  const files = fs.readdirSync(inputFolder);

  const jsonArray = [];

  files.forEach(file => {
    const fullPath = path.join(inputFolder, file);

    if (!file.endsWith(".json")) return;

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const data = JSON.parse(content);
      data.name = path.parse(file).name;
      jsonArray.push(data);
    } catch (err) {
      console.error(`❌ Error reading/parsing ${file}:`, err);
    }
  });

  fs.writeFileSync(outputFile, JSON.stringify(jsonArray, null, 2));
  console.log(`✅ Combined ${jsonArray.length} JSON files → ${outputFile}`);
}

const [, , inputFolder, outputFile] = process.argv;

if (!inputFolder || !outputFile) {
  console.error("❌ Usage: node combine_json.js <inputFolder> <outputFile>");
  process.exit(1);
}

combineJSON(inputFolder, outputFile);