// Using this as a guide for running HAPI inside Lambda: https://github.com/carbonrobot/hapi-lambda
// except we won't package our server as a plugin.

const server = require('./api.js')();

exports.lambda_handler = async (event, context, callback) => {
    try {
        // lambda removes query string params from the url and places them into
        // and object in event. Hapi expects them on the url path
        let path = event.path;
        if(event.queryStringParameters){
            const qs = Object.keys(event.queryStringParameters).map(key => { return key + '=' + event.queryStringParameters[key]; });
            if(qs.length > 0){
                path += '?' + qs.join('&');
            }
        }

        // map lambda event to hapi request
        const options = {
            method: event.httpMethod,
            url: path,
            payload: event.body,
            headers: event.headers,
            validate: false
        };

        const res = await server.inject(options);
        const response = {
            statusCode: res.statusCode,
            body: typeof res.result === 'string' ? res.result : JSON.stringify(res.result),
            headers: { 'Access-Control-Allow-Origin': '*' },
            isBase64Encoded: false,
        };

        callback(null, response);
    }
    catch (err) {
        console.error(err);
        callback(null, {
            statusCode: err.statusCode,
            body: err.message
        });
    }
};
