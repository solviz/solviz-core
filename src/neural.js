const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');

function processData(solidityFile, graphData) {
    let iGraphData = graphData;
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // navigate though all subnodes
    parser.visit(ast, {
        ImportDirective: (node) => {
            const nodePath = path.join(path.join(solidityFile, '../'), node.path);
            iGraphData = processData(nodePath, iGraphData);
        },
        ContractDefinition: (node) => {
            if (node.kind !== 'interface') {
                node.subNodes.forEach((fDef) => {
                    // verify if they are functions
                    if (fDef.type === 'FunctionDefinition') {
                        // and if so, add to a list
                        iGraphData.nodes.push({ id: fDef.name, group: node.name });
                        // navigate through everything happening inside that function
                        fDef.body.statements.forEach((fLink) => {
                            // verify if it's an expression, a function call and not a require
                            if (fLink.type === 'ExpressionStatement'
                                && fLink.expression.type === 'FunctionCall'
                                && fLink.expression.expression.name !== 'require') {
                                // and if so, add to a list
                                iGraphData.links.push({
                                    source: fDef.name,
                                    target: fLink.expression.expression.name,
                                    value: 1,
                                });
                            }
                        });
                    }
                });
            }
        },
    });
    return iGraphData;
}

exports.generateNeural = (solidityFile) => {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // start data
    let graphData = { nodes: [], links: [] };
    // processa it
    graphData = processData(solidityFile, graphData);
    // turn it into a string to save in a file
    const fileContent = `var graph=${JSON.stringify(graphData)}`;
    // write it to a file
    fs.writeFileSync(`${process.cwd()}/docs/data/neural.js`, fileContent);
    // copy styles
    fs.copyFileSync(`${currentFolder}src/template/neural.js`, `${process.cwd()}/docs/neural.js`);
    fs.copyFileSync(`${currentFolder}src/template/neural.html`, `${process.cwd()}/docs/neural.html`);
};
