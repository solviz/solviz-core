
/**
 * Remove links that does not have a connection
 * @param graphData complete graph data ready to use in graph visualization
 */
function lookForLonelyFunctions(graphData) {
    // lets assume, every function is lonely, meaning, no connections
    // if we find that function anywhere, lets add it to the list
    const nodesToRemove = [];
    let result = [];
    // let's start cleaning
    graphData.forEach((node) => {
        if (node.imports.length === 0) {
            // if it does not import anything, see if it's imported somewhere
            const totalImports = graphData.find(is => is.imports.includes(node.name));
            if (totalImports === undefined) {
                nodesToRemove.push(node.name);
            }
        }
    });
    // removed not linked nodes
    result = graphData.filter(node => !nodesToRemove.includes(node.name));
    return result;
}

/**
 * Main method to transform the contracts data to a format that
 * can be used to render the graphic
 */
exports.transformForEdgeBundeling = (solidityFile, data) => {
    const result = [];
    let imports;
    data.forEach((contract) => {
        contract.methodCalls.forEach((call) => {
            // iterate over methods and calls
            imports = [];
            call.callMethods.forEach((method) => {
                imports.push(method.name);
            });
            const idMethod = `${contract.contractName} -> ${call.functionName}`;
            result.push({
                id: idMethod, name: call.functionDefinition, size: 3938, imports,
            });
        });
    });
    // clean lonely methods
    return lookForLonelyFunctions(result);
};
