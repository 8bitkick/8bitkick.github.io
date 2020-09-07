
var magicWord = 0x12345678;
var version   = 0x00000001;
var headerLength  = 0x400;
var crc32     = CRC32;

function stegEncode(fileBuffer){
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var image32   = new Uint32Array(imageData.data.buffer);
  var image8    = new Uint8Array(imageData.data.buffer);
  var data8     = new Uint8Array(fileBuffer.byteLength+headerLength+1);
  var data32    = new Uint32Array(data8.buffer, 0, headerLength/4);

  // Write header
  data32[0] = magicWord;
  data32[1] = version;
  data32[2] = fileBuffer.byteLength;
  data32[3] = headerLength;
  data32[4] = crc32.buf(fileBuffer);

  // Write payload
  data8.set(new Uint8Array(fileBuffer), headerLength);

  // Encode
  var i = 0;
  for (let d = 0; d<data8.length; d++){
    var b = data8[d];
    for (let j = 0; j<4; j++){
      if (i % 4 == 3) {image8[i]=0xff;i++;} // skip alpha bytes
      image8[i] = (image8[i] & 0xfc) | (b & 3);
      b >>= 2;
      i++;
    }
  }

  context.clearRect( 0, 0, canvas.width, canvas.height);
  context.putImageData(imageData, 0, 0);
  console.log("Encoded file length "+fileBuffer.byteLength+" bytes");

}

function stegDecode(){
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var image8    = imageData.data;
  var data8     = new Uint8Array(900*900);
  var data32    = new Uint32Array(data8.buffer);

  let i = 0;

  for (let d = 0; d<image8.length; d++){
    var b    = 0;
    for (let j = 0; j<4; j++){
      if (i % 4 == 3) {i++;} // skip alpha bytes
      b |= (image8[i] & 3) << (j*2);
      i++;
    }
    data8[d] = b;
  }

  // Check header
  if (data32[0] != magicWord) {
    console.log('not a steg file recognise '+data32[0x00].toString(16));return;
  } else {
    console.log('hidden file found');
  }

  var fileLength    = data32[2];
  var headerLength  = data32[3];
  var checksum      = data32[4];
  var fileData      = new Uint8Array(data8.slice(headerLength, fileLength+headerLength));

  // Perform checksum
  var crc = crc32.buf(fileData);
  //if (checksum != crc) {console.log("*** checksum failed ***");return null;} else {console.log("*** checksum passed ***");}
  return fileData;
}
