const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');

const { walkSync } = require('./utils/utils');


// meanwhile this is not a thing, thanks to https://stackoverflow.com/a/45410295/3348623
// eslint-disable-next-line no-extend-native,func-names
Array.prototype.flatMap = function (selector) {
    return this.reduce((prev, next) => (/* first */ selector(prev) || /* all after first */ prev).concat(selector(next)));
};

/**
 * Given a word, verifies if it's one from Solidity keyword calls
 * @param {strng} word statement to be verified
 */
function isKeywordCall(word) {
    return (word === 'length');
}

/**
 * Given word, verifies if it's one from Solidity keyword functions
 * @param {strng} word statement to be verified
 */
function isKeywordFunction(word) {
    return (word === 'require'
        || word === 'revert'
        || word === 'assert');
}

/**
 * Given a function object and a ignored list, validates it
 * @param {object} fLink the function object parsed
 * @param {array} ignoresList a list of ignored function calls
 */
function isCountableStatement(fLink, contractsList, ignoresList) {
    return (!isKeywordFunction(fLink.expression.name)
        && !ignoresList.includes(fLink.expression.name)
        && !contractsList.includes(fLink.expression.name)
        && fLink.expression.name !== undefined);
}

/**
 * Function containing parse methods used in parser.visit
 */
function parserFunctionVisitor(contractsList, ignoresList, fDef, callMethods, graphData) {
    return {
        FunctionCall: (functionCallNode) => {
            // in order to avoid override methods that only call the base method
            // let's verify if the expressions is different than the function
            // and if it's not the only one
            if (fDef.name !== functionCallNode.expression.name
                && fDef.body.statements.length > 1
                && isCountableStatement(functionCallNode, contractsList, ignoresList)) {
                // and if so, add to a list
                callMethods.push(functionCallNode.expression.name);
                graphData.neural.links.push({
                    source: fDef.name,
                    target: functionCallNode.expression.name,
                    value: 1,
                });
            }
        },
        MemberAccess: (functionCallNode) => {
            // sometimes, when calling a member from a library, for example
            if ((functionCallNode.expression.type !== 'Identifier' || functionCallNode.expression.name === 'super')
                && functionCallNode.expression.type !== 'IndexAccess') {
                // sometimes, when calling something like
                // bytes(_tokenURIs[tokenId]).length it returns as a FunctionCall and then
                // functionCallNode.memberName turns to be "length"
                // So, in order to prevent it, let's do one last check
                if (isKeywordCall(functionCallNode.memberName)) {
                    return;
                }
                // and if so, add to a list
                callMethods.push(functionCallNode.memberName);
                graphData.neural.links.push({
                    source: fDef.name,
                    target: functionCallNode.memberName,
                    value: 1,
                });
            }
        },
    };
}

/**
 * Gets event definitions, structs and contract names
 * in order to process data with properly information
 * @param {string} solidityFile solidity file path
 * @param {array} importVisited list of visited contracts
 * @param {array} ignoresList list of ignored calls
 * @param {array} contractsList list of contracts names
 */
function profileData(solidityFile, importVisited, ignoresList, contractsList) {
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // first, we need to collect nodes to be ignored
    parser.visit(ast, {
        EventDefinition: (node) => {
            // since events are also assumed has a function call
            // let's list them and ignore.
            ignoresList.push(node.name);
        },
        StructDefinition: (node) => {
            // since struct constructor are also assumed has a function call
            // let's list them and ignore.
            ignoresList.push(node.name);
        },
        ContractDefinition: (node) => {
            // also, we want to allow only member access
            // of contracts to be listed
            contractsList.push(node.name);
        },
        ImportDirective: (node) => {
            // if, at any chance :joy: it inherits from another contract, then visit it
            let nodePath;
            // depending on the import type, build the path
            if (node.path[0] === '.') {
                nodePath = path.join(path.join(solidityFile, '../'), node.path);
            } else {
                nodePath = path.join(path.join(process.cwd(), 'node_modules'), node.path);
            }
            if (!importVisited.includes(nodePath)) {
                importVisited.push(nodePath);
                profileData(
                    nodePath, importVisited, ignoresList, contractsList,
                );
            }
        },
    });
}

/**
 * Parses the contract and organizes the data to make ready
 * to put in the graphic. This method is recursive
 * to support inheritance.
 * @param {string} solidityFile solidity file path
 * @param {object} graphData data to be given to D3 to render
 * @param {array} importVisited list of visited contracts
 * @param {array} ignoresList list of ignored calls
 * @param {array} contractsList list of contracts names
 */
function processData(solidityFile, graphData, importVisited, ignoresList, contractsList) {
    let contractName;
    const importList = [];
    // read file
    const input = fs.readFileSync(solidityFile).toString();
    // parse it using solidity-parser-antlr
    const ast = parser.parse(input);
    // and then navigate though all subnodes
    // it might look weird, but the reason to have separated each call in a new parse.visit
    // is because this definition are not called in this code order and instead called
    // in the order defined on the parser package
    // first we get the contract name and imports, the order is not relevant here
    parser.visit(ast, {
        ContractDefinition: (node) => {
            contractName = node.name;
        },
        ImportDirective: (node) => {
            // if, at any chance :joy: it inherits from another contract, then visit it
            let nodePath;
            // depending on the import type, build the path
            if (node.path[0] === '.') {
                nodePath = path.join(path.join(solidityFile, '../'), node.path);
            } else {
                nodePath = path.join(path.join(process.cwd(), 'node_modules'), node.path);
            }
            importList.push(nodePath);
        },
    });
    // then we navigate through all function definition
    // one of them might be a constructor and in case it calls other constructor
    // let's navigate through them
    parser.visit(ast, {
        FunctionDefinition: (fDef) => {
            // verify if they are functions and
            // if the node's body is empty (in case it's just a definition)
            if (fDef.isConstructor === true) {
                fDef.modifiers.forEach((modifier) => {
                    const nodePath = importList.filter(imp => imp.indexOf(modifier.name) > -1)[0];
                    if (!importVisited.includes(nodePath)) {
                        importVisited.push(nodePath);
                        processData(
                            nodePath, graphData, importVisited, ignoresList, contractsList,
                        );
                    }
                });
            } else {
                // call methods
                const callMethods = [];
                if (fDef.body !== null) {
                    // some functions have empty bodies (like definitions)
                    // let's not visit them
                    // navigate through everything happening inside that function
                    parser.visit(fDef, parserFunctionVisitor(contractsList, ignoresList, fDef, callMethods, graphData));
                }
                // and if so, add to a list
                graphData.neural.nodes.push({ id: fDef.name, contract: contractName });
                // since it starts from the ground up, every method that appears again is probably
                // an overrided method, so let's override it as well.
                const edgeIndex = graphData.edge.indexOf(graphData.edge.find(funcName => funcName.name === fDef.name));
                const superCall = callMethods.indexOf(fDef.name);
                if (edgeIndex !== -1) {
                    if (superCall !== -1) {
                        callMethods[superCall] = graphData.edge[edgeIndex].imports;
                        graphData.edge[edgeIndex].imports = callMethods.flatMap(i => i);
                    } else {
                        graphData.edge[edgeIndex] = {
                            name: fDef.name,
                            size: 3938,
                            imports: callMethods,
                        };
                    }
                } else {
                    graphData.edge.push({
                        name: fDef.name,
                        size: 3938,
                        imports: callMethods,
                    });
                }
            }
        },
    });
    // then visit the not yet visited node according to "extends" order
    parser.visit(ast, {
        InheritanceSpecifier: (node) => {
            const nodePath = importList.filter(imp => imp.indexOf(node.baseName.namePath) > -1)[0];
            if (!importVisited.includes(nodePath)) {
                importVisited.push(nodePath);
                processData(
                    nodePath, graphData, importVisited, ignoresList, contractsList,
                );
            }
        },
    });
    // in the end, visit the imports that were not visited yet
    // only visit if it was not visited. Used to ignore ciclyc calls
    importList.forEach((nodePath) => {
        if (importVisited.includes(nodePath)) {
            return;
        }
        importVisited.push(nodePath);
        processData(
            nodePath, graphData, importVisited, ignoresList, contractsList,
        );
    });
    //
    return graphData;
}

/**
 * Remove links that does not have a connection
 * @param graphData complete graph data ready to use in graph visualization
 */
function lookForLonelyFunctions(graphData) {
    // lets assume, every function is lonely, meaning, no connections
    // if we find that function anywhere, lets add it to the list
    let nodesToRemove = [];
    const result = { edge: [], neural: { nodes: [], links: [] } };
    graphData.edge.forEach((node) => {
        if (node.imports.length === 0) {
            // if it does not import anything, see if it's imported somewhere
            const totalImports = graphData.edge.find(is => is.imports.includes(node.name));
            if (totalImports === undefined) {
                nodesToRemove.push(node.name);
            }
        }
    });
    // removed not linked nodes
    result.edge = graphData.edge.filter(node => !nodesToRemove.includes(node.name));
    // do the same for neural visualization
    nodesToRemove = [];
    graphData.neural.nodes.forEach((node) => {
        const totalImports = graphData.neural.links.filter(is => is.source === node.id || is.target === node.id);
        if (totalImports === undefined || totalImports.length === 0) {
            nodesToRemove.push(node.id);
        }
    });
    result.neural.nodes = graphData.neural.nodes.filter(node => !nodesToRemove.includes(node.id));
    result.neural.links = graphData.neural.links;
    return result;
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
        let graphData = { edge: [], neural: { nodes: [], links: [] } };
        // process data
        const ignoresList = [];
        const contractsList = [];
        profileData(file, [], ignoresList, contractsList);
        processData(file, graphData, [], ignoresList, contractsList);
        // well...
        graphData = lookForLonelyFunctions(graphData);
        // add data to the json
        allGraphsData.push({ name: contractName, dataEdge: graphData.edge, dataNeural: graphData.neural });
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
