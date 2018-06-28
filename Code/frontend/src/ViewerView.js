import React, { Component } from 'react';
import Confetti from 'react-dom-confetti';

import EBS from './ebs_api';

const twitch = window.Twitch.ext;
const ebs = new EBS();

class ViewerView extends Component {
  constructor(props) {
    super(props);
  
    this.freshState = {
      raffleId: null,
      joined: false,
      winners: [],
      participants: [],
    }

    this.state = Object.assign({}, this.freshState);
  }

  componentDidMount() {
    twitch.onAuthorized((auth) => {
      ebs.setToken(auth.token);

      this.loadRaffleState();

      twitch.listen('broadcast', (target, contentType, msg) => {
        twitch.rig.log(`Received message ${msg}`);
        this.handleMessage(JSON.parse(msg));
      });
    });
   }

  handleMessage = (msg) => {
    console.log('Got message', msg);
    if (msg.event === 'raffle-started') {
      this.setState({ raffleId: msg.data.raffle.id })
    }

    if (msg.event === 'raffle-ended') {
      twitch.rig.log(`Ended`);
      this.setState(this.freshState);
    }

    if (msg.event === 'raffle-winner-picked') {
      this.setState({
        winners: msg.data.raffle.winners
      })
    }
  }

  startRaffle = async () => {
    const data = await ebs.startRaffle();
    twitch.rig.log('Created Raffle id: ' + data.id);
  }

  joinRaffle = async () => {
    await ebs.joinRaffle(this.state.raffleId);
    this.setState({ joined: true })
    twitch.rig.log(`joined raffle ${this.state.raffleId}`);
  }

  pickWinner = async () => {
    const data = await ebs.pickWinner(this.state.raffleId);
    twitch.rig.log(`picked winner ${JSON.stringify(data)}`);
  }

  finishRaffle = async () => {
    await ebs.deleteRaffle(this.state.raffleId);
    twitch.rig.log(`finished raffle`);
  }

  loadRaffleState = async (userId) => {
    const data = await ebs.getStatus();
    this.setState({ 
      myUserId: data.yourUserId,
      isBroadcaster: data.isBroadcaster
    });
    
    if (data.raffle) {
      this.setState({
        raffleId: data.raffle.id,
        joined: data.joined,
      })
    }
  }

  RaffleStatus = (props) => {
    if (this.state.raffleId && !this.state.joined) {
      return <div>
          <p>A raffle has started. Want to join?</p>
          <button onClick={this.joinRaffle}>Join Raffle</button>
        </div>;
    }

    if (this.state.raffleId && this.state.joined) {
      return <div>
          <p>You've joined!</p>
      </div>;
    }

    if (!this.state.raffleId) {
      return <div>
          <p>No active raffle yet...</p>
      </div>;
    }
  }

  BroadcasterControls = (props) => {
    if (this.state.isBroadcaster) {
      return <div>
        <h3>Broadcaster Controls</h3>
        <button onClick={this.startRaffle}>Start Raffle</button>
        <button onClick={this.pickWinner}>Pick Winner</button>
        <button onClick={this.finishRaffle}>Finish Raffle</button>
      </div>;
    }
    else {
      return null;
    }
  }

  RaffleWinners = (props) => {
    return <div>
      <ul>
        {this.state.winners.map((username) => <li key={username}>{username}</li>)}
      </ul>

      <Confetti active={ this.state.winners.includes(this.state.myUserId) } />
    </div>;
  }

  render() {
    return (
      <div>
        <h2>Twitch Raffle</h2>

        <this.BroadcasterControls />
        <this.RaffleStatus />
        <this.RaffleWinners />

        <script src="https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js"></script>
      </div>
    );
  }
}

export default ViewerView;
