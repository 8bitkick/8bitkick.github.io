// Hides data in a PNG file using 2 LSB steganography.

var canvas  = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var img     = new Image();

var offset 	= 1024;
var imageSize	= canvas.width * canvas.height;

var mask 	= new Uint32Array(1);
mask[0]		=~byteEncode(0xff);
var magicWord 	= 0x12345678;


function byteEncode(byteIn){
  var wordOut = new Uint32Array(1).fill(0); // JS var treated as signed otherwise
  for (var i = 0; i<4; i++){
    wordOut[0] <<= 8; wordOut[0] |= (byteIn & 3); byteIn  >>= 2;
  }
  return wordOut[0];
}

function byteDecode(wordIn){
  var byteOut = 0;
  for (var i = 0; i<4; i++){
    byteOut <<= 2; byteOut |= (wordIn & 3); wordIn >>= 8;
  }
  return byteOut;
}

function stegEncode(loadDataBuffer){
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var image32	= new Uint32Array(imageData.data.buffer);
  var loadData8 = new Uint8Array(loadDataBuffer);
  
  function wordEncode(pointer,wordIn){
    for (var b = 0; b<4; b++){
      image32[pointer+3-b] = (image32[pointer+3-b] & mask[0]) | byteEncode(wordIn & 0xff);
      wordIn >>= 8;
    }
  }
  
  // Header
  wordEncode(0, magicWord);			// 0x0 - Magic word
  wordEncode(4, loadDataBuffer.byteLength);	// 0x4 - Payload Length
  
  console.log("Encoding file length "+loadDataBuffer.byteLength+" bytes")
  // Write payload
  for (let i = 0; i<loadDataBuffer.byteLength; i++){ //loadDataBuffer.byteLength
    var word = byteEncode(loadData8[i])
    image32[(i)+offset] = (image32[(i)+offset] & mask[0]) | word;
  }
  context.putImageData(imageData, 0, 0);
}

function stegDecode(){
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var image32	= new Uint32Array(imageData.data.buffer);
  
  function wordDecode(pointer){
    var wordOut = 0;
    for (var b = 0; b<4; b++){
      wordOut <<=8;
      wordOut |= byteDecode(image32[pointer+b]);
    }
    return wordOut;
  }
  
  // Look for magic word
  if (wordDecode(0) != magicWord) {return;}
  var payloadLength = wordDecode(4);
  var decodedData = new Uint8Array (payloadLength);
  
  console.log("Discovered hidden file length "+payloadLength+" bytes")
  
  for (let i = 0; i<payloadLength; i++){
    decodedData[i] = byteDecode(image32[offset+i]);
  }
  
  var data = new Blob([decodedData.buffer],{type: 'application/octet-stream'});
  var url = window.URL.createObjectURL(data);
  var link = document.getElementById('download_link');
  link.href = url;
  link.download = "hidden.zip";
}

// load file to encode
function readFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var fileData = e.target.result;
    stegEncode(fileData);
    stegDecode();
  };
  reader.readAsArrayBuffer(file);
}

// load image
function loadImage(e) {
  var file = e.target.files[0].name;
  if (!file) {
    return;
  }
  img.onload = function() {
    context.clearRect( 0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
    stegDecode();
  };
  img.src = file;
}

loadImage({ target: {files:[{name:"EhGs5RWVkAANqlB.png"}]}});