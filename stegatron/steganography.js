/* 
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Hides data in a PNG file using 2 LSB steganography.

var version   = 0x00000001;
var magicWord = 0x12345678;
var offset    = 1024;
var mask      = new Uint32Array	(1);
mask[0]       =~byteEncode(0xff);


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
  	var image32		= new Uint32Array	(imageData.data.buffer);
  	var loadData8 = new Uint8Array(loadDataBuffer);

  	function wordEncode(pointer,wordIn){
  		for (var b = 0; b<4; b++){
  			image32[pointer+3-b] = (image32[pointer+3-b] & mask[0]) | byteEncode(wordIn & 0xff);
  			wordIn >>= 8;
  		}
  	}

    // bbcmicrobot "TweetFloppy" image header
    wordEncode(0x00, magicWord);
    wordEncode(0x04, loadDataBuffer.byteLength); // payload length
    wordEncode(0x08, version);                   // 0x0000 | 0x0001
    wordEncode(0x0c, offset);                    // payload offset
    //wordEncode(0x10, title);                     // title zero terminated

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
  	var image32	  = new Uint32Array(imageData.data.buffer);

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

    return decodedData;
  }
