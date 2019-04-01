const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');

exports.generateNeural = (solidityFile) => {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // start data 
    const graphData = { nodes: [], links: [] };
    let nGroup = 1;
    // navigate though all subnodes
    ast.children[3].subNodes.forEach((fDef) => {
        // verify if they are functions
        if (fDef.type === 'FunctionDefinition') {
            // and if so, add to a list
            graphData.nodes.push({ id: fDef.name, group: nGroup });
            nGroup++;
            // navigate through everything happening inside that function
            fDef.body.statements.forEach((fLink) => {
                // verify if it's an expression, a function call and not a require
                if (fLink.type === 'ExpressionStatement' &&
                    fLink.expression.type === 'FunctionCall' &&
                    fLink.expression.expression.name !== 'require') {
                    // and if so, add to a list
                    graphData.links.push({ source: fDef.name, target: fLink.expression.expression.name, value: 1 });
                }
            });
        }
    });
    // turn it into a string to save in a file
    const fileContent = 'var graph=' + JSON.stringify(graphData);
    // write it to a file
    fs.writeFileSync(`${process.cwd()}/docs/data/neural.js`, fileContent);
    // copy styles
    fs.copyFileSync(`${currentFolder}src/template/neural.html`, `${process.cwd()}/docs/neural.html`);
}