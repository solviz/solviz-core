const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');


/**
 * Parses the contract and organizes the data to make ready
 * to put in the graphic. This method is recursive
 * to support inheritance.
 * @param {string} solidityFile solidity file path
 * @param {object} graphData data to be given to D3 to render
 */
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
                        // call methods
                        const callMethods = [];
                        // navigate through everything happening inside that function
                        fDef.body.statements.forEach((fLink) => {
                            // verify if it's an expression, a function call and not a require
                            if (fLink.type === 'ExpressionStatement'
                                && fLink.expression.type === 'FunctionCall'
                                && fLink.expression.expression.name !== 'require') {
                                // and if so, add to a list
                                callMethods.push(fLink.expression.expression.name);
                            }
                        });
                        iGraphData.push({
                            name: fDef.name,
                            size: 3938,
                            imports: callMethods,
                        });
                    }
                });
            }
        },
    });
    return iGraphData;
}

/**
 * Given the input data, run the render engine to generate a page
 * @param {string} templateFile template file to use as base
 * @param {string} contractName contract name to render
 * @param {string} contractPath contract file path
 */
function transformTemplate(templateFile, contractName, contractPath) {
    // read template into a string
    const templateContent = String(fs.readFileSync(templateFile));
    // put all data together
    const view = {
        filePath: contractPath,
        contract: {
            name: contractName,
        },
        currentDate: new Date(),
    };
    // calls the render engine
    const output = Mustache.render(templateContent, view);
    return output;
}

/**
 * Generate a edge bundling graphic to one specific contract
 * @param solidityFile file path of a file
 */
exports.generateEdgeBundling = (solidityFile) => {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // get filename
    const filename = solidityFile.match(/\/([a-zA-Z0-9_]+)\.sol/);
    // get contract name (should be the same as filename?)
    const contractName = filename[1];
    // start data
    let graphData = [];
    graphData = processData(solidityFile, graphData);
    // turn it into a string to save in a file
    const fileContent = `var classes=${JSON.stringify(graphData)}`;
    // transform the template
    const HTMLContent = transformTemplate(
        `${currentFolder}src/template/edgebundling.html`, contractName, solidityFile,
    );
    // write it to a file
    fs.writeFileSync(`${process.cwd()}/docs/${filename[1]}.html`, HTMLContent);
    // write data
    fs.writeFileSync(`${process.cwd()}/docs/data/${contractName}.js`, fileContent);
    // copy script that generates graphic
    fs.copyFileSync(`${currentFolder}src/template/edgebundling.js`, `${process.cwd()}/docs/edgebundling.js`);
};
