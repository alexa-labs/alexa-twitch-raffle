const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

class Raffle {
    constructor(options) {
        if (options) {
            this.participants = options.participants;
            this.id = options.id;
            this.winners = options.winners;
        }
        else {
            this.participants = [];
            this.id = uuid();
            this.winners = [];
        }
    }

    enter(participantName) {
        this.participants = this.participants.concat([participantName]);
    }

    pickWinner() {
        if(this.participants === 0) throw new Error('No Participants Left');
        const winnerIndex = Math.floor(Math.random() * this.participants.length);
        const winner = this.participants[winnerIndex];
        this.winners = this.winners.concat([winner]);
        this.participants.splice(winnerIndex, 1);
        return winner;
    }

    toJson() {
        return {
            id: this.id,
            participants: this.participants,
            winners: this.winners
        };
    }
}

class DynamoDBRaffleStore {
    constructor(tableName, username) {
        this.dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
        this.tableName = tableName;
        this.username = username;
    }

    async save(raffle) {
        var params = {
            TableName: this.tableName,
            Item: {
                id: { "S": this.username },
                json: { "S": JSON.stringify(raffle) }
            }
        };
        return await this.dynamodb.putItem(params).promise();
    }

    async get() {
        var params = {
            TableName: this.tableName,
            Key: {
                "id": { "S": this.username }
            }
        };
        const data = await this.dynamodb.getItem(params).promise();
        if (typeof data.Item !== 'undefined') {
            return new Raffle(JSON.parse(data.Item.json.S))
        }
        else {
            return
        }
    }

    async delete() {
        var params = {
            TableName: this.tableName,
            Key: {
                "id": { "S": this.username }
            }
        };
        await this.dynamodb.deleteItem(params).promise();
        return
    }
}

module.exports = {
    DynamoDBRaffleStore,
    Raffle
}