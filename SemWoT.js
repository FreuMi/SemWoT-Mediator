const { Servient, Helpers } = require("@node-wot/core");
const { HttpClientFactory } = require("@node-wot/binding-http");
const express = require("express");
const bodyParser = require("body-parser");
const jsonld = require("jsonld");
const axios = require("axios");
const urdf = require("urdf");
const flexrml = require("flexrml-node");

const fs = require("fs");
const { Parser, DataFactory, Writer } = require("n3");
const { namedNode, blankNode, literal, quad } = DataFactory;

const app = express();

const mediatorIP = "192.168.188.20";
const mediatorPORT = 3001;

// ID counter
let actionCounter = 0;

app.use(express.raw({ type: "*/*", limit: "10mb" }));
// Start server
app.listen(mediatorPORT, () => {
  console.log(`Mediator listening at ${mediatorIP}:${mediatorPORT}`);
});

const tdIP = "http://192.168.188.21:3000/";

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
  PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  SELECT ?datatype
  WHERE {
    ?s rdf:type aio:WritePropertyInteraction ;
     aio:hasInvocationInput ?input .
  
  ?input rdf:value ?value .

  BIND(DATATYPE(?value) AS ?datatype)
  }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  const typeResult = results[0]["datatype"].value;

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

async function getDatatype(nquads) {
  await urdf.clear();
  // Get type
  let sparql_query = `
  PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  SELECT ?datatype
  WHERE {
    ?s aio:hasInvocationInput ?input .
    ?input rdf:value ?value .

  BIND(DATATYPE(?value) AS ?datatype)
  }`;

  await urdf.load(nquads);
  results = await urdf.query(sparql_query);

  const typeResult = results[0]?.["datatype"]?.value ?? undefined;

  // return early if no type is specified
  if (typeof typeResult == "undefined") {
    return "";
  }
  return typeResult;
}

async function getActionInput(nquads) {
  const typeResult = await getDatatype(nquads);
  await urdf.clear();
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

async function addReadPropertyPaths(thingName, propertyName, thing, td) {
  console.log(`Added: /${thingName}/${propertyName}`);
  app.get(`/${thingName}/${propertyName}`, async function (req, res) {
    const start = performance.now();
    const result = await thing.readProperty(`${propertyName}`);
    const value = await result.value();
    const stop = performance.now();
    console.log("Read Property time", stop - start);

    const outputRDF = await extendReadPropertyRDFdata(
      value.toString(),
      td,
      propertyName
    );

    res.send(outputRDF);
  });
}

const toTTL = (inputRDF) => {
  // Parse existing RDF data
  const parser = new Parser();
  const quads = parser.parse(inputRDF);

  const prefixes = {
    prefixes: {
      aio: "https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      qudt: "https://qudt.org/2.1/schema/qudt#",
    },
  };
  const writer = new Writer(prefixes);
  quads.forEach((quad) => writer.addQuad(quad));

  return new Promise((resolve, reject) => {
    writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

async function addWritePropertyPaths(thingName, propertyName, thing) {
  console.log(`Added: /${thingName}/${propertyName}`);
  app.put(`/${thingName}/${propertyName}`, async function (req, res) {
    // Get request data
    const RDFrequest = req.body.toString("utf-8");
    // Query data to write
    const inputValue = await getWritePropertyInput(RDFrequest);

    // Write value to Thing
    try {
      const start = performance.now();
      await thing.writeProperty(`${propertyName}`, inputValue);
      const stop = performance.now();
      console.log("Write Property time", stop - start);
      res.sendStatus(200);
    } catch {
      res.status(500).send("Connection to Thing failed!");
    }
  });
}

async function queryReadDatatype(td, propertyName) {
  await urdf.clear();
  // Get type
  let sparql_query = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
          PREFIX td: <https://www.w3.org/2019/wot/td#>
      
          SELECT ?type
          WHERE {
            ?x td:hasPropertyAffordance ?bn .
            ?bn td:name "${propertyName}" .
            ?bn rdf:type ?type .
          }`;

  await urdf.load(td);
  results = await urdf.query(sparql_query);
  const typeResult = results[0]?.["type"]?.value ?? undefined;

  // return early if no type is specified
  if (typeof typeResult == "undefined") {
    return "";
  }
  if (typeResult == "https://www.w3.org/2019/wot/json-schema#StringSchema") {
    return "string";
  }
  return "";
}

async function queryReadUnit(td, propertyName) {
  await urdf.clear();
  // Get unit
  let sparql_query = `
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX aio: <https://paul.ti.rw.fau.de/~jo00defe/SemWoT/aio#>
          PREFIX td: <https://www.w3.org/2019/wot/td#>
          PREFIX schema: <http://schema.org/>

          SELECT ?unit
          WHERE {
            ?x td:hasPropertyAffordance ?bn .
            ?bn td:name "${propertyName}"@en .
            ?bn schema:unitCode ?unit .
          }`;

  await urdf.load(td);
  results = await urdf.query(sparql_query);
  const unit = results[0]?.["unit"]?.value ?? undefined;

  // return early if no type is specified
  if (typeof unit == "undefined") {
    return "";
  }

  return unit;
}

async function extendReadPropertyRDFdata(outputValue, td, propertyName) {
  const ts = new Date().toISOString();

  const datatype = await queryReadDatatype(td, propertyName);

  // Mapping Rule
  let rmlRule = fs.readFileSync("./RML/readPropertyTemplate.ttl", {
    encoding: "utf8",
    flag: "r",
  });

  rmlRule = rmlRule.replace("${datatype}", datatype);

  // Get Unit if available
  const unit = await queryReadUnit(td, propertyName);

  let csv_data_1;
  if (unit == "") {
    // No unit found
    csv_data_1 = `id,timestamp,output
0,${ts},${outputValue}`;
    rmlRule = rmlRule.replace("#unit", "");
  } else {
    csv_data_1 = `id,timestamp,output,unit
0,${ts},${outputValue},${unit}`;

    const rmlUnit = `
    rr:predicateObjectMap [ 
    rr:predicate schema:unit ;
    rr:objectMap [ 
        rr:template "{unit}" ;
		rr:termType rr:IRI 
    ]
  ] ;
    `;

    rmlRule = rmlRule.replace("#unit", rmlUnit);
  }

  // Data structure fore mapping
  const input = {
    csv_data_1: csv_data_1,
  };

  const outputRDF = await flexrml.mapData(input, rmlRule);

  const outputRDFttl = await toTTL(outputRDF);

  return outputRDFttl;
}

async function extendActionRDFdata(nquads, inputValue) {
  const status = "initialized";
  const ts = new Date().toISOString();
  const typeResult = await getDatatype(nquads);
  const datatype = typeResult.split("#").pop();

  // Mapping Rule
  let rmlRule = fs.readFileSync("./RML/actionTemplate.ttl", {
    encoding: "utf8",
    flag: "r",
  });

  rmlRule = rmlRule.replace("${datatype}", datatype);

  // Input Data
  const csv_data_1 = `id,timestamp,status,input
0,${ts},${status},${inputValue}`;

  // Data structure fore mapping
  const input = {
    csv_data_1: csv_data_1,
  };

  const outputRDF = await flexrml.mapData(input, rmlRule);

  const outputRDFttl = await toTTL(outputRDF);

  return outputRDFttl;
}

async function updateRDFstatus(status, inputValue, nquads) {
  const ts = new Date().toISOString();
  const typeResult = await getDatatype(nquads);
  const datatype = typeResult.split("#").pop();

  // Mapping Rule
  let rmlRule = fs.readFileSync("./RML/actionTemplate.ttl", {
    encoding: "utf8",
    flag: "r",
  });

  rmlRule = rmlRule.replace("${datatype}", datatype);

  // Input Data
  const csv_data_1 = `id,timestamp,status,input
0,${ts},${status},${inputValue}`;

  // Data structure fore mapping
  const input = {
    csv_data_1: csv_data_1,
  };

  const outputRDF = await flexrml.mapData(input, rmlRule);

  const outputRDFttl = await toTTL(outputRDF);

  return outputRDFttl;
}

async function addActionPaths(thingName, propertyName, thing) {
  console.log(`Added: /${thingName}/${propertyName}`);
  app.post(`/${thingName}/${propertyName}`, async function (req, res) {
    // Get request data
    const RDFrequest = req.body.toString("utf-8");

    // Query data to write
    const inputValue = await getActionInput(RDFrequest);

    // Generate location uri
    actionCounter++;
    res.location("/actions/" + actionCounter);

    let outputRDF = await extendActionRDFdata(RDFrequest, inputValue);
    // Add resource to express
    app.get(`/actions/${actionCounter}`, async function (req, res) {
      rdfData = res.send(outputRDF);
    });
    res.send();

    // Update Status to running
    outputRDF = await updateRDFstatus("running", inputValue, RDFrequest);
    const start = performance.now();
    await thing.invokeAction(`${propertyName}`, inputValue);
    const stop = performance.now();
    console.log("Invoke Action time", stop - start);
    // Update Status to finished
    outputRDF = await updateRDFstatus("finished", inputValue, RDFrequest);
  });
}

async function main() {
  // Setup servient
  const WoT = await servient.start();

  // Get TD
  let response = await axios.get(tdIP);
  const td = await convertToRDF(response.data);
  console.log("============");
  console.log(td);
  console.log("============");
  // Consume TD
  let thing = await WoT.consume(response.data);

  const thingName = (await getThingName(td))[0];
  // Add routes for read properties
  const readProperties = await getReadPropertyName(td);
  for (const element of readProperties) {
    await addReadPropertyPaths(thingName, element, thing, td);
  }
  // Add routes for write properties
  const writeProperties = await getWritePropertyName(td);
  for (const element of writeProperties) {
    await addWritePropertyPaths(thingName, element, thing);
  }
  // Add routes for actions
  const actions = await getActionName(td);
  for (const element of actions) {
    await addActionPaths(thingName, element, thing);
  }
}

main();
