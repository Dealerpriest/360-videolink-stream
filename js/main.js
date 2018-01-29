const socket = io({
    query: {
        token: 'abc'
    }
});
var el = document.getElementById('socket-data');

socket.on('connect', () => {
  console.log('connected to socket');
  socket.send('hello');
})

socket.on('message', message => {
  el.innerHTML = 'socket data: ' + message;
})

socket.on('signalingmessage', function(data) {
  let msg;
  el.innerHTML = 'socket data: ' + data;
  if(msg = JSON.parse(data)){
    console.log(msg)
    if(msg.offer){
      pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      pc.createAnswer((desc) => {
        pc.setLocalDescription(desc);
        socket.emit('signalingmessage', JSON.stringify({'answer' : desc}));
      })
    }else if(msg.answer){
      console.log('got answer');
      pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
    }else if(msg.candidate){
      //TODO: make sure we don't try to add candidates before remoteDescription is set! Put them in queue and add them after remote has been set.
      console.log('ice candidate received');
      pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }
});

let isCaller = false;

socket.on('clientsconnected', (caller) => {
  isCaller = caller;
  console.log('clients connected. isCaller: ' + isCaller);
  initiateWebRTC(isCaller);
});

let pc;
let pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};
function initiateWebRTC(isCaller){
  pc = new RTCPeerConnection(pcConfig);
  pc.onicecandidate = handleIceCandidate;
  if(isCaller){
    navigator.getUserMedia({audio: false, video: true}, (stream) => {
      console.log('adding stream');
      pc.addStream(stream);
      pc.createOffer((desc) => {
        pc.setLocalDescription(desc);
        socket.emit('signalingmessage', JSON.stringify({'offer' : desc}));
      });
    });
    
  }
}

function handleIceCandidate(evt){
  console.log('ice candidate event');
  console.log(evt);
  if(evt.candidate){
    socket.emit('signalingmessage', JSON.stringify({'candidate': evt.candidate}));
  }else{
    console.log('all ice candidates have been sent');
  }
}