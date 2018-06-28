class EBS {
  constructor() {
    // Change this to a deployed production url before uploading this to Twitch
    this.baseUrl = 'https://localhost:3002/' // make sure the port is set accordingly
    this.token = null;
  }

  setToken = (token) => {
    this.token = token;
  }

  doRequest = async (path, options) => {
    const result = await fetch(this.baseUrl + path, { 
      ...options, 
      mode: 'cors',
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'content-type': 'application/json'
      }
    });
    return await result.json();
  }

  post = (path, data={}) => {
    return this.doRequest(path, {
      body: JSON.stringify(data),
      method: 'POST'
    })
  }

  get = (path) => {
    return this.doRequest(path, {
      method: 'GET'
    })
  }

  delete = (path) => {
    return this.doRequest(path, {
      method: 'DELETE'
    })
  }

  getStatus = async () => {
    return this.get('status');
  }

  startRaffle = async () => {
    return this.post('raffles/create');
  }

  joinRaffle = async (raffleId) => {
    return this.post(`raffles/${raffleId}/enter`);
  }

  pickWinner = async (raffleId) => {
    return this.post(`raffles/${raffleId}/winner`);
  }

  deleteRaffle = async (raffleId) => {
    return this.delete(`raffles/${raffleId}`);
  }
}

export default EBS;