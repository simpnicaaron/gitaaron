// Author: Aaron   Oauth Service health check 20210730
const https = require('https');//連線模組
const port = 443;
const server = "svr.simpnic.com";

const options = {
    hostname: server,
    port: port,
    path: '/healthcheck',
    method: 'GET',
};

const req = https.request(options,(res) => {

    res.on('data', (d) => {
        process.stdout.write(d);
        console.log('');
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();

