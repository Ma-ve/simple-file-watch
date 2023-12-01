#!/usr/bin/env node

var opts = [];
opts.boolean = ['help', 'silence', 'h'];
opts.string = ['path', 'extension', 'command', 'file'];

var m = require('minimist-mini')(opts);
var fileExtension = require('file-extension');
var exec = require('child_process').exec;
var watch = require('node-watch');

if (m.get('help') || m.get('h')) {
    m.helpMessage();
    process.exit(0);
}

var path = m.get('path');
var extension = m.get('extension');
var file = m.get('file');

const uniqueInputSets = [
    {
        "path": path,
        "file": file,
    },
    {
        "extension": extension,
        "file": file,
    },
];

uniqueInputSets.forEach((inputSet) => {
    const inputs = Object.values(inputSet);
    const providedInputs = inputs.filter(input => !!input);
    if (providedInputs.length > 1) {
        throw new Error(`The following inputs cannot be used together: ${ Object.keys(inputSet).join(", ") }`);
    }
});

if (extension) {
    extension = extension.split(",");
} else {
    extension = '*';
}

if (file && file.indexOf('./') === 0) {
    const targetFileName = file.substring(2);
    throw new Error(`Cannot start with relative path: use --file='${targetFileName}' instead`);
}

if (file && file.indexOf('../') !== -1) {
    throw new Error(`Cannot look to directory tree higher up`);
}

var recursive = m.get('recursive');
// noinspection RedundantIfStatementJS
if (recursive || (file && file.indexOf('/') !== -1)) {
    recursive = true;
} else {
    recursive = false;
}

if (file) {
    extension = '';
    file = file.split(',');
}

if (!path) {
    path = '.';
}

var delay = m.get('delay');
if (!delay) {
    delay = 200;
}

// Log messages
function consoleLog(txt) {
    if (m.get('silence')) {
        return;
    }
    console.log(txt);
}

function execute(cmd) {

    exec(cmd, function (error, stdout, stderr) {
        if (error) {
            // Always log error
            console.log(error);
        }

        if (stderr) {
            // Always log error
            console.log(stderr);
        }

        consoleLog(stdout);
    });
}

var command = m.get('command');
var lastExecution = new Date().getTime();

watch(path, { delay: delay, recursive: recursive, persistent: true }, async function (evt, filename) {

    // Check if last execution was less than 'delay' ago + some offset (10% of delay)
    // This is to avoid multiple executions when multiple files are changed at the same time
    var now = new Date().getTime();
    if (now - lastExecution < delay + parseInt(delay / 10)) {
        return;
    }

    var ext = fileExtension(filename);

    let isSpecificFile = false;
    if (file) {
        isSpecificFile = !!file.find((_file) => filename.indexOf(_file) !== -1);
    }

    const shouldExecute =
        (extension && (extension.indexOf(ext) !== -1)) ||
        (extension === '*') ||
        (isSpecificFile);

    if (shouldExecute) {
        consoleLog("File changed: " + filename);
        if (command) {
            consoleLog("Executing: " + command);
            execute(command);
        }
    }

    lastExecution = new Date().getTime();

});
