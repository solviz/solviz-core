

/**
 * Remove links that does not have a connection
 * @param graphData complete graph data ready to use in graph visualization
 */
function lookForLonelyFunctions(graphData) {
    // lets assume, every function is lonely, meaning, no connections
    // if we find that function anywhere, lets add it to the list
    const nodesToRemove = [];
    const result = { nodes: [], links: [] };
    // remove duplicated nodes
    const cleanNodes = [];
    const uCleanNodes = [];
    graphData.nodes.forEach((node) => {
        const uNode = node.id + node.contract;
        if (!uCleanNodes.includes(uNode)) {
            uCleanNodes.push(uNode);
            cleanNodes.push(node);
        }
    });
    graphData.nodes = cleanNodes;
    // if a node is not a source nor a target, then remove it
    graphData.nodes.forEach((node) => {
        const totalImports = graphData.links.filter(is => is.source === node.id || is.target === node.id);
        if (totalImports === undefined || totalImports.length === 0) {
            nodesToRemove.push(node.id);
        }
    });
    result.nodes = graphData.nodes.filter(node => !nodesToRemove.includes(node.id));
    result.links = graphData.links;
    return result;
}

/**
 * Main method to transform the contracts data to a format that
 * can be used to render the graphic
 */
exports.transformForNeural = (solidityFile, data) => {
    const result = { nodes: [], links: [] };
    data.forEach((contract) => {
        contract.methodCalls.forEach((call) => {
            // iterate over methods and calls
            result.nodes.push({
                id: call.functionDefinition,
                method: call.functionName,
                contract: contract.contractName,
            });
            call.callMethods.forEach((method) => {
                result.links.push({
                    source: call.functionDefinition,
                    target: method.name,
                    value: 1,
                });
            });
        });
    });
    // clean lonely methods
    return lookForLonelyFunctions(result);
};
