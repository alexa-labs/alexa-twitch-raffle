const fs = require('fs');
const path = require('path');

let server = require('./api.js')({
    host: 'localhost.rig.twitch.tv',
    port: '3002',
    tls: {
        // key: fs.readFileSync(path.resolve(__dirname, '../../conf/server.key')),
        // cert: fs.readFileSync(path.resolve(__dirname, '../../conf/server.crt')),
        key: fs.readFileSync('/Users/gabehol/code/third_party/twitch-developer-rig/ssl/selfsigned.key'),
        cert: fs.readFileSync('/Users/gabehol/code/third_party/twitch-developer-rig/ssl/selfsigned.crt'),
    },
    debug: { request: ['error'] }
});

(async () => {
    await server.start();

    console.log('server started');
})();
