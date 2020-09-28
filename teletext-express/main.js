
var imgData;
var img = new Image();
var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var canvas2 = document.getElementById("timeline");
var timeline = canvas2.getContext("2d");
var link = document.getElementById('download-link');
var v = document.getElementById('myVideo');
var zoom = 1;
var snaphot = document.getElementById('snaphot');
var maxframes = 500;
var framebuffer = new Uint8Array(1000*(maxframes+1));
var frame = 0;
var recording = false;
var timer = 0;
var colors = ["000000","ff0000","00ff00","ffff00","0000ff","ff00ff","00ffff","ffffff"];
var config = {
  foregroundColor: 7,
  backgroundColor: 0,
  brightness: 50,
  framerate: 25,
  contrast:50,
  normalize: true,
  invert: false,
  encoding: 0,
  xOffset: 0,
  zoom: 1.2,
}

document.addEventListener('DOMContentLoaded', function(){

  var URL = window.URL || window.webkitURL

  // Video load UI
  var playSelectedFile = function (event) {
    var file = this.files[0]
    var type = file.type
    var videoNode = document.querySelector('video')
    var fileURL = URL.createObjectURL(file)
    videoNode.src = fileURL
    updateFrame();
    v = document.getElementById("myVideo");
    zoom = videoNode.videoHeight;
    console.log(zoom)
  }
  var inputNode = document.getElementById('vidSelect')
  inputNode.addEventListener('change', playSelectedFile, false)

  var v = document.getElementById('myVideo');
  var cw = 240;
  var ch = 250;

  myVideo.addEventListener('play', function(){
    draw(this,context,cw,ch);
  },false);

  then = new Date;
  char_lookup[config.encoding].data = calculateLookup(char_lookup[config.encoding].filter,char_lookup[config.encoding].subdivision)
  now = new Date;
  console.log((now - then)+"ms lookup calculation")
},false);

// CHARACTER SET
function encodingChange(encoding){
  if (typeof char_lookup[encoding].data == 'undefined') {
    char_lookup[encoding].data = calculateLookup(char_lookup[encoding].filter,char_lookup[encoding].subdivision);
  }
  config.encoding = encoding;
  updateFrame();
}

// PALETTE
for (let c = 0;c<8;c++){
  var thisFg = document.getElementById('fg'+c);
  thisFg.style.backgroundColor="#"+colors[c];
  thisFg.addEventListener("click", changeForeground);
  var thisBg = document.getElementById('bg'+c);
  thisBg.style.backgroundColor="#"+colors[c];
  thisBg.addEventListener("click", changeBackground);
}

function changeForeground(e){
  config.foregroundColor = parseInt(event.target.id.slice(-1));
  updateFrame();
}

function changeBackground(e){
  config.backgroundColor = parseInt(event.target.id.slice(-1));
  updateFrame();
}

function showImage(fileReader) {
  img.onload = () => getImageData(img);
  img.src = fileReader.result;

}

function updateFileDownload(decodedData){
  var link = document.getElementById('download-link');
  var data = new Blob([decodedData.buffer],{type: 'application/octet-stream'});
  var url = window.URL.createObjectURL(data);
  link.download = "teletext.bin";
  link.href = url;
}

function getImageData(img) {
  var ratio = 240/img.width
  context.drawImage(img, 0, 0,img.width*ratio,img.height*ratio/1.3);
  let then = new Date;
  convertImage(char_lookup[config.encoding]);
  let now = new Date;
  console.log((now - then)+" time")
  updateFileDownload(framebuffer);
}

// INVERT
function updateInvert(value){
  config.invert=value;
  var temp = config.foregroundColor;
  config.foregroundColor = config.backgroundColor;
  config.backgroundColor = temp;
  updateFrame();
}

// SLIDERS
function outputUpdate(value,name) {
  var element = document.getElementById(name);
  element.innerHTML = value;
  config[name]=value;
  updateFrame();
}

// TIMELINE
function updateTimeline() {
  var progress = (frame/maxframes)*240;
  timeline.fillStyle = "#000000";
  timeline.fillRect(0,0,240, 20);
  timeline.fillStyle = "#444444";
  timeline.fillRect(0,4,progress, 12);
  timeline.align = "right";
  timeline.font = "14px Arial, Helvetica";
  timeline.fillStyle = "#aaaaaa";
  if (recording==true) {timeline.fillText(frame+" frames recorded", 14,14);}
}

// SAVE TO HASH URL (from https://zxnet.co.uk/teletext/editor/ )
function updateURLHash(){
  /* generate an edit.tf compatible URL from level 1 packet data */
  var base64dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var edittfLanguage = 0; // English
  var renderForegroundBlack = 1;
  var hashString = (edittfLanguage | (renderForegroundBlack << 3));

  hashString += ":";

  var hashDigits = [];
  for (var row = 0; row < 25; row++){
    for (var column = 0; column < 40; column++){
      for (var bit = 0; bit < 7; bit++){
        totalBits = (row * 40 + column) * 7 + bit;
        var charBit = ((framebuffer[(frame*1000)+column+row*40]) >> (6 - bit)) & 0x01;
        hashDigits[Math.floor(totalBits / 6)] |= charBit << (5 - (totalBits % 6));
      }
    }
  }

  for (var i = 0; i < 1167; i++){
    hashString += base64dictionary.charAt(hashDigits[i]);
  }
  snapshot.setAttribute("action", "https://zxnet.co.uk/teletext/editor/#0"+hashString);
}

function resetBuffer(){
  frame = 0;
  updateTimeline();
}

function record(){
  if (recording==true){
    document.getElementById('record').innerHTML="Record";
    updateFileDownload(framebuffer.slice(0,1000*frame))
    recording = false;
    v.pause();
  }
  else {
    document.getElementById('record').innerHTML="Pause";
    recording = true;
    v.play();
  }
}

v.addEventListener('seeked', (event) => {
  updateFrame();
});

function draw(v,c,w,h) {
  if(v.paused || v.ended) {return};
  updateFrame();
  setTimeout(draw,1000/config.framerate,v,c,w,h);
}

function updateFrame(){
  context.drawImage(v,config.xOffset,0,v.videoWidth/config.zoom,v.videoHeight,0,0,240,250);
  convertImage(char_lookup[config.encoding]);
  updateTimeline();
  updateURLHash();
  if (frame==maxframes && recording==true){
    document.getElementById('record').innerHTML="Record";
    updateFileDownload(framebuffer.slice(0,1000*frame));
    recording = false;
    v.pause();
  }
  if (recording==true && frame<maxframes){
    frame++;
  }
}
