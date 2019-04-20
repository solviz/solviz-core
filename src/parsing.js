const parser = require('solidity-parser-antlr');
const path = require('path');
const fs = require('fs');


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
function parserFunctionVisitor(contractsList, ignoresList, fDef, callMethods) {
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
            }
        },
        MemberAccess: (functionCallNode) => {
            // sometimes, when calling a member from a library, for example
            if ((functionCallNode.expression.type !== 'Identifier'
                || contractsList.includes(functionCallNode.expression.name)
                || functionCallNode.expression.name === 'super')
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
            }
        },
    };
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
function processData(solidityFile, importVisited, ignoresList, contractsList) {
    let contractName;
    const methodCalls = [];
    const importList = [];
    const processed = [];
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
            console.log(contractName);
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
                        const result = processData(
                            nodePath, importVisited, ignoresList, contractsList,
                        );
                        result.forEach(i => processed.push(i));
                    }
                });
            } else {
                // call methods
                const callMethods = [];
                if (fDef.body !== null) {
                    // some functions have empty bodies (like definitions)
                    // let's not visit them
                    // navigate through everything happening inside that function
                    parser.visit(fDef, parserFunctionVisitor(contractsList, ignoresList, fDef, callMethods));
                }
                // and if so, add to a list
                methodCalls.push({ functionName: fDef.name, callMethods });
            }
        },
    });
    // then visit the not yet visited node according to "extends" order
    parser.visit(ast, {
        InheritanceSpecifier: (node) => {
            const nodePath = importList.filter(imp => imp.indexOf(node.baseName.namePath) > -1)[0];
            if (!importVisited.includes(nodePath)) {
                importVisited.push(nodePath);
                const result = processData(
                    nodePath, importVisited, ignoresList, contractsList,
                );
                result.forEach(i => processed.push(i));
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
        const result = processData(
            nodePath, importVisited, ignoresList, contractsList,
        );
        result.forEach(i => processed.push(i));
    });
    processed.push({ contractName, methodCalls });
    return processed;
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

exports.parsing = (solidityFile) => {
    solidityFile.forEach((file) => {
        // process data
        const ignoresList = [];
        const contractsList = [];
        profileData(file, [], ignoresList, contractsList);
        const data = processData(file, [], [], ignoresList, contractsList);
        //
        console.log(data);
    });
};
