const { generateNeural } = require('./neural');
const { generateEdgeBundling } = require('./edgebundling');


exports.generateVisualization = (solidityFile) => {
    generateNeural(solidityFile);
    generateEdgeBundling(solidityFile);
}