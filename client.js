const axios = require("axios");

const SemWotAddr = "http://192.168.188.20:3001/";

async function main() {
  // Read property
  let response = await axios.get(`${SemWotAddr}Flower/temp`);
  console.log(response.data);
}

main();
