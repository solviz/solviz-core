const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');

const { parsing } = require('./parsing');
const { walkSync } = require('./utils/utils');


// meanwhile this is not a thing, thanks to https://stackoverflow.com/a/45410295/3348623
// eslint-disable-next-line no-extend-native,func-names
Array.prototype.flatMap = function (selector) {
    return this.reduce((prev, next) => (/* first */ selector(prev) || /* all after first */ prev).concat(selector(next)));
};

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
function generateVisualizationForFile(solidityFile, parsedData) {
    // get current path folder
    const currentFolder = path.join(__dirname, '../');
    // starting
    const allGraphsData = [];
    solidityFile.forEach((file) => {
        // TODO: get the real ontract name
        const contractName = (file.match(/\/([a-zA-Z0-9_]+)\.sol/))[1];
        // well...
        const parsed = parsedData.find(data => data.file === file);
        // add data to the json
        allGraphsData.push({ name: contractName, dataEdge: parsed.edge, dataNeural: parsed.neural });
    });
    // transform the template
    const HTMLContent = transformTemplate(
        path.join(currentFolder, 'src/template/index.html'), allGraphsData,
    );
    if (!fs.existsSync(path.join(process.cwd(), 'docs'))) {
        fs.mkdirSync(path.join(process.cwd(), 'docs'));
    }
    // save all data in another file
    fs.writeFileSync(path.join(process.cwd(), 'docs/data.js'), `var allGraphsData=${JSON.stringify(allGraphsData)}`);
    // write it to a file
    fs.writeFileSync(path.join(process.cwd(), 'docs/index.html'), HTMLContent);
    // copy script that generates graphic
    fs.copyFileSync(path.join(process.cwd(), 'src/template/edgebundling.js'),
        path.join(process.cwd(), 'docs/edgebundling.js'));
    fs.copyFileSync(path.join(process.cwd(), 'src/template/neural.js'), path.join(process.cwd(), 'docs/neural.js'));
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
            console.error(err);
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
        const parsedData = parsing(files);
        generateVisualizationForFile(files, parsedData);
        return 0;
    });
};
