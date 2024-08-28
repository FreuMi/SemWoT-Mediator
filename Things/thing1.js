const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
app.use(express.raw({ type: "*/*", limit: "10mb" }));

const port = 3000;
const IP = "127.0.0.1";

// Load TD
let td_template = fs.readFileSync("./thing1.jsonld", {
  encoding: "utf8",
  flag: "r",
});
td_template = td_template.replace(/\$\{ip\}/g, IP);
const td = td_template.replace(/\$\{port\}/g, port);

// Internal mode variable
let precision_mode = 0;

// function to generate random value between min and max in integer
// JSON include integer
function random_value_integer() {
  let min = 0;
  let max = 200;
  return Math.floor(Math.random() * (max - min) + min);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Return TD
app.get("/", (req, res) => {
  res.type("application/td+json");
  res.send(td);
});

// send current temperature value
app.get("/temp", async function (req, res) {
  const value = random_value_integer();
  res.send(value.toString());
});

app.put("/power", async function (req, res) {
  console.log("received:", req.body.toString("utf-8"));
  await sleep(5);
  res.sendStatus(200);
});

app.post("/precisionMode", async function (req, res) {
  console.log("received:", req.body.toString("utf-8"));
  await sleep(50);
  res.sendStatus(200);
});

// Start server
app.listen(port, () => {
  console.log(`listening at ${IP}:${port}`);
});
