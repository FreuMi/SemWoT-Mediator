const axios = require("axios");
const urdf = require("urdf");

const SemWotAddr = "http://127.0.0.1:3001";

const numberRuns = 10;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryData(rdfData) {
  await urdf.clear();
  const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
    PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>

    SELECT ?status
    WHERE {
        ?x aio:hasStatus ?status .
    }`;

  await urdf.load(rdfData);
  results = await urdf.query(sparql_query);
  return results[0]["status"].value;
}

async function main() {
  /////////////////////
  // Read Property //
  ////////////////////
  const resultRead = [];

  for (let i = 0; i < numberRuns; i++) {
    const start = performance.now();
    let response = await axios.get(`${SemWotAddr}/Flower/temp`);
    console.log(response.data);
    const stop = performance.now();
    const time = stop - start;
    console.log(time);
    resultRead.push(time);
    await sleep(1000);
  }

  /////////////////////
  // Write Property //
  ////////////////////
  const resultWrite = [];
  const data = `@prefix aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix ssn: <http://www.w3.org/ns/ssn#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    [] rdf:type aio:WritePropertyInteraction ;
    aio:hasInvocationInput [rdf:value "1"^^xsd:integer ] .`;

  for (let i = 0; i < numberRuns; i++) {
    const start = performance.now();
    let response = await axios.put(`${SemWotAddr}/Flower/power`, data);
    console.log(response.data);
    const stop = performance.now();
    const time = stop - start;
    console.log(time);
    resultWrite.push(time);
    await sleep(1000);
  }

  ////////////////////
  // Invoke Action //
  ///////////////////
  const resultAction = [];
  for (let i = 0; i < numberRuns; i++) {
    const dataAction = `@prefix aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix ssn: <http://www.w3.org/ns/ssn#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    [] rdf:type aio:ActionInvocationInteraction ;
    aio:hasInvocationInput [ rdf:value "1"^^xsd:integer  ] .`;

    // Create resource
    const start = performance.now();
    let response = await axios.post(
      `${SemWotAddr}/Flower/precisionMode`,
      dataAction
    );
    // Get location header
    const locationHeader = response.headers["location"];

    while (true) {
      response = await axios.get(`${SemWotAddr}${locationHeader}`);
      const res = await queryData(response.data);
      // Wait until finished
      if (res == "finished") {
        break;
      }
    }
    const stop = performance.now();
    const time = stop - start;
    console.log(time);
    resultAction.push(time);
    await sleep(1000);
  }
}

main();
