// Place your server entry point code here
// Require minimist module
const args = require('minimist')(process.argv.slice(2))
    // See what is stored in the object produced by minimist
    //console.log(args)
    // Store help text 
const help = (`
server.js [options]

--port  Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log       If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help  Return this message and exit.
`)
    // If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

var express = require('express')
const fs = require('fs');
const morgan = require('morgan');

const logdb = require('.src/services/database.js');

const port = args.port || process.env.PORT || 5000

var app = express()
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

if (args.log == 'false') {
    console.log("Error: not creating the log file")
} else {
    const logdir = './log/';
    if (!fs.existsSync(logdir)) {
        fs.mkdirSync(logdir);
    }
    const WRITESTREAM = fs.createWriteStream('FILE', { flags: 'a' })
    app.use(morgan('FORMAT', { stream: WRITESTREAM }))
}

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    console.log(logdata)
    const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(
        logdata.remoteaddr,
        logdata.remoteuser,
        logdata.time,
        logdata.method,
        logdata.url,
        logdata.protocol,
        logdata.httpversion,
        logdata.status,
        logdata.referrer,
        logdata.useragent)
    next();
})

function coinFlip() {
    var flip = Math.random();
    var result;
    if (flip < 0.5) {
        result = "heads"
    } else {
        result = "tails";
    }
    return result;
}

function coinFlips(flips) {
    var flipList = new Array();
    for (var i = 0; i < flips; i++) {
        flipList.push(coinFlip());
    }
    return flipList;
}

function countFlips(array) {
    var headCount = 0;
    var tailsCount = 0;
    var index = 0;
    while (index < array.length) {
        if (array[index] == "heads") {
            headCount = headCount + 1;
        } else {
            tailsCount = tailsCount + 1;
        }
        index++;

    }
    return { tails: tailsCount, heads: headCount }
}

function flipACoin(call) {
    var flip = coinFlip();
    var result;
    if (flip == call) {
        result = "win";
    } else {
        result = "lose";
    }
    return { call: call, flip: flip, result: result }
}
app.use(express.static('./public'))
app.get('/app/', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead(res.statusCode, { 'Content-Type': 'text/plain' });
    res.end(res.statusCode + ' ' + res.statusMessage)
});

app.get('/app/flip', (req, res) => {
    res.status(200);
    res.type('text/plain')
    res.json({ 'flip': coinFlip() })
});

app.get('/app/flips/:number/', (req, res) => {
    res.status(200);
    var flips = req.params.number;
    var results = coinFlips(flips)
    res.json({
        'raw': results,
        'summary': countFlips(results)
    })
});

app.get('/app/flip/call/heads/', (req, res) => {
    res.status(200);
    res.json(flipACoin('heads'));
});

app.get('/app/flip/call/tails/', (req, res) => {
    res.status(200);
    res.json(flipACoin('tails'));
});

if (args.debug) {
    app.get('/app/log/access/', (req, res) => {
        const stmt = logdb.prepare("SELECT * FROM accesslog").all();
        res.status(200).json(stmt);
    })

    app.get('/app/error/', (req, res) => {
        throw new Error('Error test is successful.')
    })
}

app.use(function(req, res) {
    res.status(404).send('404 NOT FOUND');
});