const Hapi = require('hapi');
const Boom = require('boom');
const jwt = require('jsonwebtoken');
const request = require('request');

const Raffles = require('./raffles.js')
const Raffle = Raffles.Raffle;
const DynamoDBRaffleStore = Raffles.DynamoDBRaffleStore;

const verboseLogging = true; // verbose logging; turn off for production

const serverTokenDurationSec = 30;         // our tokens for pubsub expire after 30 seconds
const bearerPrefix = 'Bearer ';            // JWT auth headers have this prefix

const ext = {
    secret: process.env.EXT_SECRET,
    clientId: process.env.EXT_CLIENT_ID,
    ownerId: process.env.EXT_ONER_ID
}

// log function that won't spam in production
const verboseLog = verboseLogging ? console.log.bind(console) : function(){}


async function createRaffleHandler(req, h) {
    const raffle = new Raffle();
    const result = await rafflesStore.save(raffle);
    broadcast(req.auth.credentials.payload.channel_id, {
        event: 'raffle-started',
        data: {
            raffle: raffle.toJson()
        }
    });
    return { id: raffle.id }
}


async function enterRaffleHandler(req, h) {
    const userId = req.auth.credentials.payload.user_id;
    let raffle = await rafflesStore.get();
    raffle.enter(userId);
    await rafflesStore.save(raffle);
    return {
        status: `Entered ${userId} into Raffle ${req.params.raffleId}`
    }
}


async function selectWinnerHandler(req, h) {
    let raffle = await rafflesStore.get();
    let winner = null;
    if (raffle.participants.length > 0) {
        winner = raffle.pickWinner();
        await rafflesStore.save(raffle);
    }
    if (winner !== null) {
        broadcast(req.auth.credentials.payload.channel_id, {
            event: 'raffle-winner-picked',
            data: {
                raffle: raffle.toJson()
            }
        });
    }
    return {
        id: raffle.id,
        picked: winner,
        allWinners: raffle.winners,
        remainingParticipants: raffle.participants
    }
}

async function deleteRaffleHandler(req, h) {
    const raffle = await rafflesStore.delete();
    broadcast(req.auth.credentials.payload.channel_id, {
        event: 'raffle-ended'
    });
    return {status: 'deleted'}
}

async function currentStatusHandler(req, h) {
    const raffle = await rafflesStore.get();
    const isBroadcaster = req.auth.credentials.payload.role == 'broadcaster';
    if (raffle) {
        return {
            raffle: raffle.toJson(),
            joined: raffle.participants.includes(req.auth.credentials.payload.user_id),
            yourUserId: req.auth.credentials.payload.user_id,
            isBroadcaster
        }
    }
    else {
        return {
            raffle: null,
            joined: false,
            yourUserId: req.auth.credentials.payload.user_id,
            isBroadcaster
        }
    }
}



const rafflesStore = new DynamoDBRaffleStore(
    process.env.DYNAMODB_RAFFLES_TABLE_ARN.split('/')[1],
    process.env.RAFFLE_USERNAME ? process.env.RAFFLE_USERNAME : 'default'
)



function broadcast(channelId, data) {
    console.error('broadcasting', data)
    verboseLog('broadcasting', data, channelId);

    const headers = {
        'Client-Id': ext.clientId,
        'Content-Type': 'application/json',
        'Authorization': bearerPrefix + makeServerToken(channelId)
    };
    const body = JSON.stringify({
        content_type: 'application/json',
        message: JSON.stringify(data),
        targets: [ 'broadcast' ]
    })
    const result = request(
        `https://api.twitch.tv/extensions/message/${channelId}`,
        {
            method: 'POST',
            headers,
            body
        }
        , (err, res) => {
            if (err) {
                console.log('Message send error', channelId);
            } else {
                verboseLog("Message to channel:%s returned %s", channelId, res.statusCode);
            }
    });
}




function makeServerToken(channelId) {
    const payload = {
        exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
        channel_id: channelId,
        user_id: ext.ownerId, // extension owner ID for the call to Twitch PubSub
        role: 'external',
        pubsub_perms: {
            send: [ '*' ],
        },
    }

    const secret = Buffer.from(ext.secret, 'base64');
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
}





const makeServer = function (options={}) {
    const server = new Hapi.Server(
        Object.assign(
            {
                routes: { 
                    cors: {
                        origin: ['*']
                    }
                }
            }
            , options
        )
    );

    server.route({ method: 'POST', path: '/raffles/create', handler: createRaffleHandler});
    server.route({ method: 'POST', path: '/raffles/{raffleId}/enter', handler: enterRaffleHandler});
    server.route({ method: 'POST', path: '/raffles/{raffleId}/winner', handler: selectWinnerHandler});
    server.route({ method: 'DELETE', path: '/raffles/{raffleId}', handler: deleteRaffleHandler});
    server.route({ method: 'GET', path: '/status', handler: currentStatusHandler});

    const scheme = function (server, options) {
        return {
            authenticate: function (request, h) {
                function verifyAndDecode(header) {
                    try {
                        if (!header.startsWith(bearerPrefix)) {
                            return false;
                        }
                        const token = header.substring(bearerPrefix.length);
                        const secret = Buffer.from(ext.secret, 'base64');
                        return jwt.verify(token, secret, { algorithms: ['HS256'] }); 
                    }
                    catch (e) {
                        return false;
                    }
                }

                let payload = null;
                // -------------------------------------------------------
                // HACK: override channel_id with custom header value if present, for Alexa compatability
                // This could be made more secure by having alexa create a signed JWT and passing it in
                payload = {
                    channel_id: null,
                    user_id: null
                };
                if (request.headers.twitchchannelid) {
                    payload.channel_id = request.headers.twitchchannelid;
                }
                if (request.headers.skipauth) {
                    payload.user_id = request.headers.skipauth;
                    return h.authenticated({ credentials: { payload } });
                }
                // -------------------------------------------------------

                payload = verifyAndDecode(request.headers.authorization);
                if(!payload) { throw Boom.unauthorized("Invalid JWT"); }

                return h.authenticated({ credentials: { payload } });
            }
        };
    };
    server.auth.scheme('customScheme', scheme);
    server.auth.strategy('customStrat', 'customScheme');
    server.auth.default('customStrat');

    return server
}
module.exports = makeServer;