import React, { Component }                                                                 from "react";
import { Text, TouchableHighlight, View, YellowBox }                                        from "react-native";
import { getUserMedia, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from "react-native-webrtc";
import io                                                                                   from "socket.io-client";
import s                                                                                    from './style';


YellowBox.ignoreWarnings(['Setting a timer', 'Unrecognized WebSocket connection', 'ListView is deprecated and will be removed']);

const url = 'https://ac07cd91.ngrok.io';
const socket = io.connect(url, { transports: ["websocket"] });
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let pcPeers = {};
let container;
let localStream;

const initStream = () => {
  let videoSourceId;
  let isFront = true;
  let constrains = {
    audio: false,
    video: {
      mandatory: {
        minWidth: 640,
        minHeight: 360,
        minFrameRate: 30,
      },
      facingMode: isFront ? "user" : "environment",
      optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
    },
  };
  let callback = stream => {
    localStream = stream;
    
    container.setState({
      localStream: stream.toURL(),
      status: "ready",
      info: "Welcome to WebRTC demo",
    });
  };
  
  getUserMedia(constrains, callback, logError);
};

const join = roomID => {
  let state = 'join';
  let callback = socketIds => {
    for (const i in socketIds) {
      if (socketIds.hasOwnProperty(i)) {
        const socketId = socketIds[i];
        createPC(socketId, true);
      }
    }
  };
  
  socket.emit(state, roomID, callback);
};

const createPC = (socketId, isOffer) => {
  const peer = new RTCPeerConnection(configuration);
  
  pcPeers = {
    ...pcPeers,
    [socketId]: peer,
  };
  
  peer.addStream(localStream);
  
  peer.onicecandidate = event => {
    //console.log("onicecandidate", event.candidate);
    if (event.candidate) {
      socket.emit("exchange", { to: socketId, candidate: event.candidate });
    }
  };
  
  peer.onnegotiationneeded = () => {
    //console.log("onnegotiationneeded");
    if (isOffer) {
      createOffer();
    }
  };
  
  peer.oniceconnectionstatechange = event => {
    //console.log("oniceconnectionstatechange", event.target.iceConnectionState);
    if (event.target.iceConnectionState === "completed") {
      console.log('event.target.iceConnectionState === "completed"');
      setTimeout(() => {
        getStats();
      }, 1000);
    }
    if (event.target.iceConnectionState === "connected") {
      console.log('event.target.iceConnectionState === "connected"');
    }
  };
  peer.onsignalingstatechange = event => {
    console.log("on signaling state change", event.target.signalingState);
  };
  
  peer.onaddstream = event => {
    //console.log("onaddstream", event.stream);
    const remoteList = container.state.remoteList;
    
    remoteList[socketId] = event.stream.toURL();
    container.setState({
      info: "One peer join!",
      remoteList: remoteList,
    });
  };
  peer.onremovestream = event => {
    console.log("on remove stream", event.stream);
  };
  
  const createOffer = () => {
    let callback = desc => {
      //console.log("createOffer", desc);
      peer.setLocalDescription(desc, callback2, logError);
    };
    let callback2 = () => {
      //console.log("setLocalDescription", peer.localDescription);
      socket.emit("exchange", { to: socketId, sdp: peer.localDescription });
    };
    
    peer.createOffer(callback, logError);
  };
  
  return peer;
};

socket.on("connect", () => {
  console.log("connect");
});
socket.on("leave", socketId => {
  leave(socketId);
});
socket.on("exchange", data => {
  exchange(data);
});

const leave = socketId => {
  console.log("leave", socketId);
  
  const peer = pcPeers[socketId];
  
  peer.close();
  
  delete pcPeers[socketId];
  
  const remoteList = container.state.remoteList;
  
  delete remoteList[socketId];
  
  container.setState({
    info: "One peer leave!",
    remoteList: remoteList,
  });
};

const exchange = data => {
  const fromId = data.from;
  let pc;
  if (fromId in pcPeers) {
    pc = pcPeers[fromId];
  } else {
    pc = createPC(fromId, false);
  }
  
  if (data.sdp) {
    //console.log("exchange sdp", data);
    let sdp = new RTCSessionDescription(data.sdp);
    
    let callback = () => pc.remoteDescription.type === "offer" ? pc.createAnswer(callback2, logError) : null;
    let callback2 = desc => pc.setLocalDescription(desc, callback3, logError);
    let callback3 = () => socket.emit("exchange", { to: fromId, sdp: pc.localDescription });
    
    pc.setRemoteDescription(sdp, callback, logError);
  } else {
    //console.log("exchange candidate", data);
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
};

const logError = error => {
  console.log("logError", error);
};

const mapHash = (hash, func) => {
  const array = [];
  for (const key in hash) {
    if (hash.hasOwnProperty(key)) {
      const obj = hash[key];
      array.push(func(obj, key));
    }
  }
  return array;
};

const getStats = () => {
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    
    //console.log("track", track);
    
    pc.getStats(
      track,
      function (report) {
        //console.log("getStats report", report);
      },
      logError,
    );
  }
};

class App extends Component {
  state = {
    info: "Initializing",
    status: "init",
    roomID: "abc",
    isFront: true,
    localStream: null,
    remoteList: {},
  };
  
  componentDidMount() {
    container = this;
    initStream();
  }
  
  _press = () => {
    this.setState({
      status: "connect",
      info: "Connecting",
    });
    
    join(this.state.roomID);
  };
  
  button = () => (
    <TouchableHighlight style={s.button} onPress={this._press}>
      <Text style={s.buttonText}>Enter room</Text>
    </TouchableHighlight>
  );
  
  render() {
    const { status, info, localStream, remoteList } = this.state;
    
    return (
      <View style={s.container}>
        <Text style={s.welcome}>{info}</Text>
        
        {status === "ready" ? this.button() : null}
        
        <RTCView streamURL={localStream} style={s.selfView}/>
        
        {
          mapHash(remoteList, (remote, index) => {
            return (<RTCView key={index} streamURL={remote} style={s.remoteView}/>);
          })
        }
      </View>
    );
  }
}

export default App;