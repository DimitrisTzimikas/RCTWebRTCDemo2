import React, { Component }                                                                 from "react";
import { Text, TouchableOpacity, View, YellowBox }                                          from "react-native";
import { getUserMedia, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from "react-native-webrtc";
import io                                                                                   from "socket.io-client";
import { button, container, rtcView, text }                                                 from './styles';
import { log, logError }                                                                    from './debug';


YellowBox.ignoreWarnings(['Setting a timer', 'Unrecognized WebSocket connection', 'ListView is deprecated and will be removed']);

/* ==============================
 Global variables
 ================================ */
const url = 'https://515d3869.ngrok.io';
const socket = io.connect(url, { transports: ["websocket"] });
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let pcPeers = {};
let appClass;
let localStream;

/* ==============================
 Class
 ================================ */
class App extends Component {
  state = {
    info: "Initializing",
    status: "init",
    roomID: "abc",
    isFront: true,
    streamURL: null,
    remoteList: {},
  };
  
  componentDidMount() {
    appClass = this;
    
    initStream();
  }
  
  onPress = () => {
    this.setState({
      status: "connect",
      info: "Connecting",
    });
    
    join(this.state.roomID);
  };
  
  switchCamera = () => {
    localStream.getVideoTracks().forEach(track => {
      track._switchCamera();
    });
  };
  
  button = (func, text) => (
    <TouchableOpacity style={button.container} onPress={func}>
      <Text style={button.style}>{text}</Text>
    </TouchableOpacity>
  );
  
  render() {
    const { status, info, streamURL, remoteList } = this.state;
    
    return (
      <View style={container.style}>
        <Text style={text.style}>{info}</Text>
        
        {status === "ready" ? this.button(this.onPress, 'Enter room') : null}
        {this.button(this.switchCamera, 'Change Camera')}
        
        <RTCView streamURL={streamURL} style={rtcView.style}/>
        
        {
          mapHash(remoteList, (remote, index) => {
            return <RTCView key={index} streamURL={remote} style={rtcView.style}/>;
          })
        }
      </View>
    );
  }
}

/* ==============================
 Functions
 ================================ */
const initStream = () => {
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
    },
  };
  let callback = stream => {
    localStream = stream;
    
    appClass.setState({
      streamURL: stream.toURL(),
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
  /**
   * Create the Peer Connection
   */
  const peer = new RTCPeerConnection(configuration);
  
  pcPeers = {
    ...pcPeers,
    [socketId]: peer,
  };
  
  /**
   * On Negotiation Needed
   */
  peer.onnegotiationneeded = () => {
    //console.log("onnegotiationneeded");
    if (isOffer) {
      let callback = desc => {
        
        log('The SDP offer', desc.sdp);
        
        peer.setLocalDescription(desc, callback2, logError);
      };
      let callback2 = () => {
        //console.log("setLocalDescription", peer.localDescription);
        socket.emit("exchange", { to: socketId, sdp: peer.localDescription });
      };
      
      peer.createOffer(callback, logError);
    }
  };
  
  /**
   * (Deprecated)
   */
  peer.addStream(localStream);
  
  /**
   * On Add Stream (Deprecated)
   */
  peer.onaddstream = event => {
    //console.log("onaddstream", event.stream);
    const remoteList = appClass.state.remoteList;
    
    remoteList[socketId] = event.stream.toURL();
    appClass.setState({
      info: "One peer join!",
      remoteList: remoteList,
    });
  };
  
  /**
   * On Ice Candidate
   */
  peer.onicecandidate = event => {
    //console.log("onicecandidate", event.candidate);
    if (event.candidate) {
      socket.emit("exchange", { to: socketId, candidate: event.candidate });
    }
  };
  
  /**
   * On Ice Connection State Change
   */
  peer.oniceconnectionstatechange = event => {
    //console.log("oniceconnectionstatechange", event.target.iceConnectionState);
    if (event.target.iceConnectionState === "completed") {
      //console.log('event.target.iceConnectionState === "completed"');
      setTimeout(() => {
        getStats();
      }, 1000);
    }
    if (event.target.iceConnectionState === "connected") {
      //console.log('event.target.iceConnectionState === "connected"');
    }
  };
  
  /**
   * On Signaling State Change
   */
  peer.onsignalingstatechange = event => {
    //console.log("on signaling state change", event.target.signalingState);
  };
  
  /**
   * On Remove Stream
   */
  peer.onremovestream = event => {
    //console.log("on remove stream", event.stream);
  };
  
  return peer;
};

socket.on("connect", () => {
  //console.log("connect");
});
socket.on("exchange", data => {
  exchange(data);
});
socket.on("leave", socketId => {
  leave(socketId);
});

const exchange = data => {
  let fromId = data.from;
  
  if (data.sdp) log('Exchange', data);
  
  let peer;
  if (fromId in pcPeers) {
    peer = pcPeers[fromId];
  } else {
    peer = createPC(fromId, false);
  }
  
  if (data.sdp) {
    //console.log("exchange sdp", data);
    let sdp = new RTCSessionDescription(data.sdp);
    
    let callback = () => peer.remoteDescription.type === "offer" ? peer.createAnswer(callback2, logError) : null;
    let callback2 = desc => peer.setLocalDescription(desc, callback3, logError);
    let callback3 = () => socket.emit("exchange", { to: fromId, sdp: peer.localDescription });
    
    peer.setRemoteDescription(sdp, callback, logError);
  } else {
    peer.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
};

const leave = socketId => {
  //console.log("leave", socketId);
  
  const peer = pcPeers[socketId];
  
  peer.close();
  
  delete pcPeers[socketId];
  
  const remoteList = appClass.state.remoteList;
  
  delete remoteList[socketId];
  
  appClass.setState({
    info: "One peer leave!",
    remoteList: remoteList,
  });
};

const mapHash = (hash, func) => {
  //console.log(hash);
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
    let callback = report => console.log("getStats report", report);
    
    //console.log("track", track);
    
    pc.getStats(track, callback, logError);
  }
};

/* ==============================
 Export
 ================================ */
export default App;