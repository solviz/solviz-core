#!/usr/bin/env node


const meow = require('meow');
const { generateNeural, generateEdgeBundling } = require('../src/index');

const helpMessage = `
Usage
    $ solvis <file(s)>

Options
    --help, -h  To get help

Examples
    $ solvis contracts/Sample.sol
    $ solvis contracts/
`;
const cli = meow(helpMessage);

generateNeural(String(cli.input));
generateEdgeBundling(String(cli.input));
