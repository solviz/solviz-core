#!/usr/bin/env node


const meow = require('meow');
const { generateVisualization } = require('../src/index');

const helpMessage = `
Usage
    $ solviz <file(s)>

Options
    --help, -h  To get help

Examples
    $ solviz contracts/Sample.sol
    $ solviz contracts/
`;
const cli = meow(helpMessage);

generateVisualization(String(cli.input));
