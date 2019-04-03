const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');

function processData(solidityFile, graphData) {
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // navigate though all subnodes
    parser.visit(ast, {
        ImportDirective: (node) => {
            const nodePath = path.join(path.join(solidityFile, '../'), node.path);
            graphData = processData(nodePath, graphData);
        },
        ContractDefinition: (node) => {
            if (node.kind !== 'interface') {
                node.subNodes.forEach((fDef) => {
                    // verify if they are functions
                    if (fDef.type === 'FunctionDefinition') {
                        // call methods
                        const callMethods = [];
                        // navigate through everything happening inside that function
                        fDef.body.statements.forEach((fLink) => {
                            // verify if it's an expression, a function call and not a require
                            if (fLink.type === 'ExpressionStatement' &&
                                fLink.expression.type === 'FunctionCall' &&
                                fLink.expression.expression.name !== 'require') {
                                // and if so, add to a list
                                callMethods.push(fLink.expression.expression.name);
                            }
                        });
                        graphData.push({
                            name: fDef.name,
                            size: 3938,
                            imports: callMethods
                        });
                    }
                });
            }
        }
    });
    return graphData;
}

exports.generateEdgeBundling = (solidityFile) => {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // start data 
    let graphData = [];
    graphData = processData(solidityFile, graphData);
    // turn it into a string to save in a file
    const fileContent = 'var classes=' + JSON.stringify(graphData);
    // write it to a file
    fs.writeFileSync(`${process.cwd()}/docs/data/edge.js`, fileContent);
    // copy styles
    fs.copyFileSync(`${currentFolder}src/template/edgebundling.html`, `${process.cwd()}/docs/edgebundling.html`);
}