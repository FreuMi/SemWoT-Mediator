const flexrml = require("flexrml-node");
const fs = require("fs");
const rmlRule = fs.readFileSync("./actionTemplate.ttl", {
  encoding: "utf8",
  flag: "r",
});

const csv_data_1 = `id,timestamp,status,input
0,2023-01-01T04:43:16,intialized,10`;
const input = {
  csv_data_1: csv_data_1,
};

async function main() {
  const result = await flexrml.mapData(input, rmlRule);
  console.log(result);
}
main();
