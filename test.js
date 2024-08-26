const urdf = require("urdf");

const sparql_query = `PREFIX td: <https://www.w3.org/2019/wot/td#>
    PREFIX schema: <https://www.w3.org/2019/wot/json-schema#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    SELECT ?name
    WHERE {
        ?x td:hasPropertyAffordance ?bn .
        ?bn td:name ?name .
        ?bn schema:readOnly "true"^^xsd:boolean .
    }`;

const nquads = `<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/2019/wot/td#Thing> .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#definesSecurityScheme> _:b0 .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#description> "A Xiaomi Flower Care Sensor."@en .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#hasActionAffordance> _:b1 .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#hasPropertyAffordance> _:b4 .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#hasSecurityConfiguration> "basic_sc" .
<urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06> <https://www.w3.org/2019/wot/td#title> "Flower"@en .
_:b0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/2019/wot/security#NoSecurityScheme> .
_:b1 <https://www.w3.org/2019/wot/td#description> "Enable precision mode."@en .
_:b1 <https://www.w3.org/2019/wot/td#hasForm> _:b2 .
_:b1 <https://www.w3.org/2019/wot/td#hasInputSchema> _:b3 .
_:b1 <https://www.w3.org/2019/wot/td#name> "precisionMode"@en .
_:b2 <https://www.w3.org/2019/wot/hypermedia#forContentType> "application/json"@en .
_:b2 <https://www.w3.org/2019/wot/hypermedia#hasOperationType> <https://www.w3.org/2019/wot/td#invokeAction> .
_:b2 <https://www.w3.org/2019/wot/hypermedia#hasTarget> "http://127.0.0.1:3000/precisionMode"^^<http://www.w3.org/2001/XMLSchema#anyURI> .
_:b3 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/2019/wot/json-schema#IntegerSchema> .
_:b3 <https://www.w3.org/2019/wot/json-schema#maximum> "1"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b3 <https://www.w3.org/2019/wot/json-schema#minimum> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b4 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://www.w3.org/2019/wot/json-schema#IntegerSchema> .
_:b4 <https://www.w3.org/2019/wot/json-schema#readOnly> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .
_:b4 <https://www.w3.org/2019/wot/json-schema#writeOnly> "false"^^<http://www.w3.org/2001/XMLSchema#boolean> .
_:b4 <https://www.w3.org/2019/wot/td#description> "In degrees Celsius"@en .
_:b4 <https://www.w3.org/2019/wot/td#hasForm> _:b5 .
_:b4 <https://www.w3.org/2019/wot/td#isObservable> "false"^^<http://www.w3.org/2001/XMLSchema#boolean> .
_:b4 <https://www.w3.org/2019/wot/td#name> "temp"@en .
_:b5 <http://www.w3.org/2011/http#methodName> "GET"@en .
_:b5 <https://www.w3.org/2019/wot/hypermedia#forContentType> "application/json"@en .
_:b5 <https://www.w3.org/2019/wot/hypermedia#hasOperationType> <https://www.w3.org/2019/wot/td#readProperty> .
_:b5 <https://www.w3.org/2019/wot/hypermedia#hasTarget> "http://127.0.0.1:3000/temp"^^<http://www.w3.org/2001/XMLSchema#anyURI> .`;

async function main() {
  await urdf.load(nquads);
  results = await urdf.query(sparql_query);
  console.log(results[0]["name"].value)
}

main();
