
const Alexa = require(`ask-sdk-core`);
const https = require(`https`);

// This handler will trigger if there is no Access Token present in the request
// and will direct the user to link their account

//This handler will get triggered when the user says "Alexa, open <invocation name>"
//It will return a prompt
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    return request.type === `LaunchRequest`;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(`This is the Twitch Raffle Extension. Please say, Start raffle. Pick a winner. or End raffle.`)
      .reprompt(`What would you like to do?`)
      .getResponse();
  },
};

//https://kb8rico5y8.execute-api.us-west-2.amazonaws.com/Prod/
//An intent handler for starting a raffle
const StartRaffleIntentHandler ={
  canHandle(handlerInput){
    const { request } = handlerInput.requestEnvelope;
    return request.type === `IntentRequest` && request.intent.name === `StartRaffleIntent`
  },
  handle(handlerInput){
    let options = {
      host: `kb8rico5y8.execute-api.us-west-2.amazonaws.com`,
      port: 443,
      path: `/Prod/raffles/create`,
      method: `POST`,
      headers:{
        skipauth: `1`,
        twitchchannelid: `227114430`
      }
    };
    async function buildAlexaResponse(options){
      let responseFromExtension = await httpRequestPromise(options);
      return handlerInput.responseBuilder
      .speak(`This should have worked, ask Gabe.`)
      .getResponse();
    }
    return buildAlexaResponse(options);
  }
}

const PickWinnerIntentHandler ={
  canHandle(handlerInput){
    const { request } = handlerInput.requestEnvelope;
    return request.type === `IntentRequest` && request.intent.name === `PickWinnerIntent`
  },
  handle(handlerInput){
    let options = {
      host: `kb8rico5y8.execute-api.us-west-2.amazonaws.com`,
      port: 443,
      path: `/Prod/raffles/100/winner`,
      method: `POST`,
      headers:{
        skipauth: `1`,
        twitchchannelid: `227114430`
      }
    };
    async function buildAlexaResponse(options){
      let responseFromExtension = await httpRequestPromise(options);
      return handlerInput.responseBuilder
      .speak(`This should have worked, ask Travis.`)
      .getResponse();
    }
    return buildAlexaResponse(options);
  }
}

const StopIntentHandler ={
  canHandle(handlerInput){
    const { request } = handlerInput.requestEnvelope;
    return request.type === `IntentRequest` && request.intent.name === `AMAZON.StopIntent`
  },
  handle(handlerInput){
    let options = {
      host: `kb8rico5y8.execute-api.us-west-2.amazonaws.com`,
      port: 443,
      path: `/Prod/raffles/100`,
      method: `DELETE`,
      headers:{
        skipauth: `1`,
        twitchchannelid: `227114430`
      }
    };
    async function buildAlexaResponse(options){
      let responseFromExtension = await httpRequestPromise(options);
      return handlerInput.responseBuilder
      .speak(`The response was: ${JSON.parse(responseFromExtension).status}`)
      .getResponse();
    }
    return buildAlexaResponse(options);
  }
}

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === `SessionEndedRequest`;
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

  },
};

// This handler will respond to any intent that does NOT have it's own handler
const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const { name } = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
    .speak(`The ${name} has not been implemented.`)
    .getResponse();
  },
};

// A Single error handler to fail gracefully
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    return handlerInput.responseBuilder
    .speak(`There was an error. Please try a different command.`)
    .reprompt(`Please try a different command.`)
    .getResponse();
  },
};

// An http(s) request wrapped in promise & async
async function httpRequestPromise(options) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      // reject promise if we get http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`Failed to make http request, status code: ` + response.statusCode));
      }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on(`data`, (chunk) => body.push(chunk));
      // resolve promise with those joined chunks
      response.on(`end`, () => resolve(body.join(``)));
    });
    // reject promise on connection errors of the request
    request.on(`error`, (err) => reject(err));
    // finish request
    request.end();
  });
}

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
.addRequestHandlers(
  LaunchRequestHandler,
  StartRaffleIntentHandler,
  StopIntentHandler,
  PickWinnerIntentHandler,
  SessionEndedRequest,
  UnhandledIntent
)
.addErrorHandlers(ErrorHandler)
.withApiClient(new Alexa.DefaultApiClient())
.lambda();
