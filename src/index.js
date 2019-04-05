const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');

const { walkSync } = require('./utils/utils');


function processNeuralData(solidityFile, graphData) {
    let iGraphData = graphData;
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // navigate though all subnodes
    parser.visit(ast, {
        ImportDirective: (node) => {
            const nodePath = path.join(path.join(solidityFile, '../'), node.path);
            iGraphData = processNeuralData(nodePath, iGraphData);
        },
        ContractDefinition: (node) => {
            if (node.kind !== 'interface') {
                node.subNodes.forEach((fDef) => {
                    // verify if they are functions
                    if (fDef.type === 'FunctionDefinition') {
                        // and if so, add to a list
                        iGraphData.nodes.push({ id: fDef.name, contract: node.name });
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

/**
 * Parses the contract and organizes the data to make ready
 * to put in the graphic. This method is recursive
 * to support inheritance.
 * @param {string} solidityFile solidity file path
 * @param {object} graphData data to be given to D3 to render
 */
function processEdgeBundlingData(solidityFile, graphData) {
    let iGraphData = graphData;
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // navigate though all subnodes
    parser.visit(ast, {
        ImportDirective: (node) => {
            // if, at any change :joy: it inherits from another contract, then visit it
            const nodePath = path.join(path.join(solidityFile, '../'), node.path);
            iGraphData = processEdgeBundlingData(nodePath, iGraphData);
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
function transformTemplate(templateFile, allGraphsData) {
    // read template into a string
    const templateContent = String(fs.readFileSync(templateFile));
    // put all data together
    const view = {
        graphsData: allGraphsData,
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
function generateVisualizationForFile(solidityFile) {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // starting
    const allGraphsData = [];
    solidityFile.forEach((file) => {
        // get filename
        const filename = file.match(/\/([a-zA-Z0-9_]+)\.sol/);
        // get contract name (should be the same as filename?)
        const contractName = filename[1];
        // start data
        let graphEdgeData = [];
        graphEdgeData = processEdgeBundlingData(file, graphEdgeData);
        let graphNeuralData = { nodes: [], links: [] };
        graphNeuralData = processNeuralData(file, graphNeuralData);
        // add data to the json
        allGraphsData.push({ name: contractName, dataEdge: graphEdgeData, dataNeural: graphNeuralData });
    });
    // transform the template
    const HTMLContent = transformTemplate(
        `${currentFolder}src/template/index.html`, allGraphsData,
    );
    // save all data in another file
    fs.writeFileSync(`${process.cwd()}/docs/data.js`, `var allGraphsData=${JSON.stringify(allGraphsData)}`);
    // write it to a file
    fs.writeFileSync(`${process.cwd()}/docs/index.html`, HTMLContent);
    // copy script that generates graphic
    fs.copyFileSync(`${currentFolder}src/template/edgebundling.js`, `${process.cwd()}/docs/edgebundling.js`);
    fs.copyFileSync(`${currentFolder}src/template/neural.js`, `${process.cwd()}/docs/neural.js`);
}

/**
 * Main method to be called. Will create the HTML using the other methods.
 * @param {array} files array of files path
 */
exports.generateVisualization = (filePathInput) => {
    // verify the type of the given input
    fs.lstat(filePathInput, (err, stats) => {
        // Handle error
        if (err) {
            return 1;
        }
        const files = [];
        // verify if the input is a directory, file or array of files
        if (stats.isDirectory()) {
            // if it's a folder, get all files recursively
            walkSync(filePathInput, []).forEach((filePath) => {
                files.push(filePathInput + filePath);
            });
        } else if (stats.isFile()) {
            // if it's a file, just get the file
            files.push(filePathInput);
        } else {
            //
        }
        // iterate over files to generate HTML
        generateVisualizationForFile(files);
        return 0;
    });
};
