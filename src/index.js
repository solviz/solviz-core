const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');

const { walkSync } = require('./utils/utils');


function isCountableStatement(fLink) {
    return (fLink.type === 'ExpressionStatement'
        && fLink.expression.type === 'FunctionCall'
        && fLink.expression.expression.name !== 'require'
        && fLink.expression.expression.name !== 'revert'
        && fLink.expression.expression.name !== 'assert'
        && fLink.expression.expression.name !== undefined);
}

/**
 * Parses the contract and organizes the data to make ready
 * to put in the graphic. This method is recursive
 * to support inheritance.
 * @param {string} solidityFile solidity file path
 * @param {object} graphData data to be given to D3 to render
 */
function processData(solidityFile, graphData, importVisited) {
    let iGraphData = graphData;
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // navigate though all subnodes
    parser.visit(ast, {
        ImportDirective: (node) => {
            // if, at any change :joy: it inherits from another contract, then visit it
            let nodePath;
            if (node.path[0] === '.') {
                nodePath = path.join(path.join(solidityFile, '../'), node.path);
            } else {
                nodePath = path.join(path.join(process.cwd(), 'node_modules'), node.path);
            }
            if (!importVisited.includes(nodePath)) {
                importVisited.push(nodePath);
                [iGraphData, importVisited] = processData(nodePath, iGraphData, importVisited);
            }
        },
        ContractDefinition: (node) => {
            if (node.kind !== 'interface') {
                node.subNodes.forEach((fDef) => {
                    // verify if they are functions and
                    // if the node's body is empty (in case it's just a definition)
                    if (fDef.type !== 'FunctionDefinition' || fDef.isConstructor === true || fDef.body === null) {
                        return;
                    }
                    // call methods
                    const callMethods = [];
                    // and if so, add to a list
                    iGraphData.neural.nodes.push({ id: fDef.name, contract: node.name });
                    // navigate through everything happening inside that function
                    fDef.body.statements.forEach((fLink) => {
                        // verify if it's an expression, a function call and not a require
                        if (isCountableStatement(fLink)) {
                            // and if so, add to a list
                            callMethods.push(fLink.expression.expression.name);
                            iGraphData.neural.links.push({
                                source: fDef.name,
                                target: fLink.expression.expression.name,
                                value: 1,
                            });
                        }
                    });
                    iGraphData.edge.push({
                        name: fDef.name,
                        size: 3938,
                        imports: callMethods,
                    });
                });
            }
        },
    });
    return [iGraphData, importVisited];
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
        const resultGraphData = processData(file, { edge: [], neural: { nodes: [], links: [] } }, []);
        // add data to the json
        allGraphsData.push({ name: contractName, dataEdge: resultGraphData[0].edge, dataNeural: resultGraphData[0].neural });
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
