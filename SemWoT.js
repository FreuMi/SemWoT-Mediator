const { Servient, Helpers } = require("@node-wot/core");
const { HttpClientFactory } = require("@node-wot/binding-http");
const express = require("express");
const bodyParser = require("body-parser");
const jsonld = require("jsonld");
const axios = require("axios");
const urdf = require("urdf");

const app = express();

const mediatorIP = "127.0.0.1";
const mediatorPORT = 3001;

app.use(express.raw({ type: "*/*", limit: "10mb" }));
// Start server
app.listen(mediatorPORT, () => {
  console.log(`Mediator listening at ${mediatorIP}:${mediatorPORT}`);
});

const tdIP = "http://127.0.0.1:3000/";

// create servient
const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
const WoTHelpers = new Helpers(servient);

// Helper functions //
async function convertToRDF(jsonldData) {
  const nquads = await jsonld.toRDF(jsonldData, {
    format: "application/n-quads",
  });
  return nquads;
}

function parseData(data, rdf_type) {
  if (rdf_type == "http://www.w3.org/2001/XMLSchema#integer") {
    return parseInt(data);
  } else if (rdf_type == "http://www.w3.org/2001/XMLSchema#string") {
    return data;
  } else if (rdf_type == "http://www.w3.org/2001/XMLSchema#float") {
    return parseFloat(data);
  } else {
    console.log("Error parsing");
    return data;
  }
}

async function getReadPropertyName(nquads) {
  await urdf.clear();
  const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
    PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?name
    WHERE {
        ?x td:hasPropertyAffordance ?bn .
        ?bn schema:readOnly "true"^^xsd:boolean .
        ?bn td:name ?name .
    }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const fin_results = [];
  for (const result of results) {
    const x = result["name"].value;
    fin_results.push(x);
  }

  return fin_results;
}

async function getWritePropertyName(nquads) {
  await urdf.clear();
  const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
      PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  
      SELECT ?name
      WHERE {
          ?x td:hasPropertyAffordance ?bn .
          ?bn schema:readOnly "false"^^xsd:boolean .
          ?bn td:name ?name .
      }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const fin_results = [];
  for (const result of results) {
    const x = result["name"].value;
    fin_results.push(x);
  }

  return fin_results;
}

async function getActionName(nquads) {
  await urdf.clear();
  const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
        PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    
        SELECT ?name
        WHERE {
            ?x td:hasActionAffordance ?bn .
            ?bn td:name ?name .
        }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const fin_results = [];
  for (const result of results) {
    const x = result["name"].value;
    fin_results.push(x);
  }

  return fin_results;
}

async function getThingName(nquads) {
  await urdf.clear();
  const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
          PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
          PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      
          SELECT ?name
          WHERE {
              ?bn td:title ?name .
          }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const fin_results = [];
  for (const result of results) {
    const x = result["name"].value;
    fin_results.push(x);
  }

  return fin_results;
}

async function getWritePropertyInput(nquads) {
  await urdf.clear();
  // Get type
  let sparql_query = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
      
          SELECT ?inputType
          WHERE {
            ?x aio:hasInvocationInput ?bn .
            ?bn rdf:type ?inputType .
          }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const typeResult = results[0]["inputType"].value;

  // Get value
  sparql_query = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
      
          SELECT ?value
          WHERE {
              ?x rdf:value ?value .
          }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const parsedResult = parseData(results[0]["value"].value, typeResult);

  return parsedResult;
}

async function addReadPropertyPaths(thingName, propertyName, thing) {
  console.log(`/${thingName}/${propertyName}`);
  app.get(`/${thingName}/${propertyName}`, async function (req, res) {
    const result = await thing.readProperty(`${propertyName}`);
    const value = await result.value();
    res.send(value.toString());
  });
}

async function addWritePropertyPaths(thingName, propertyName, thing) {
  console.log(`/${thingName}/${propertyName}`);
  app.put(`/${thingName}/${propertyName}`, async function (req, res) {
    // Get request data
    const RDFrequest = req.body.toString("utf-8");

    // Query data to write
    const inputValue = await getWritePropertyInput(RDFrequest);

    await thing.writeProperty(`${propertyName}`, inputValue);
    res.sendStatus(200);
  });
}

async function addActionPaths(thingName, propertyName, thing) {
  console.log(`/${thingName}/${propertyName}`);
  app.post(`/${thingName}/${propertyName}`, async function (req, res) {
    const rawBody = req.body.toString("utf-8");
    await thing.invokeAction(`${propertyName}`, rawBody);
    res.sendStatus(200);
  });
}

async function main() {
  // Setup servient
  const WoT = await servient.start();

  // Get TD
  let response = await axios.get(tdIP);
  const td = await convertToRDF(response.data);

  // Consume TD
  let thing = await WoT.consume(response.data);

  const thingName = (await getThingName(td))[0];
  // Add routes for read properties
  const readProperties = await getReadPropertyName(td);
  for (const element of readProperties) {
    await addReadPropertyPaths(thingName, element, thing);
  }
  // Add routes for write properties
  const writeProperties = await getWritePropertyName(td);
  for (const element of writeProperties) {
    await addWritePropertyPaths(thingName, element, thing);
  }
  console.log(writeProperties);
  const actions = await getActionName(td);
  console.log(actions);
}

main();
