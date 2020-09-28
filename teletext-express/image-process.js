function convertImage(encodingScheme){
  var mosaic_tiles = encodingScheme.subdivision;
  var table_length = 2**(3 * mosaic_tiles.length);

  var imageData = context.getImageData(0, 0, 6*40, 10*25);
  var image8 = preprocessImage(imageData.data);

  var imageDataOut = new ImageData(6*40, 10*25);
  var imageOut32 = new Uint32Array(imageDataOut.data.buffer);

  var foregroundPixel =  0xff000000 | ((1 & config.foregroundColor>>2)*0xff) << 16 | ((1 & config.foregroundColor>>1)*0xff) << 8 | ((1&config.foregroundColor)*0xff);
  var backgroundPixel =  0xff000000 | ((1 & config.backgroundColor>>2)*0xff) << 16 | ((1 & config.backgroundColor>>1)*0xff) << 8 | ((1&config.backgroundColor)*0xff);
  context.putImageData(imageData, 0, 0);
  var textOut = document.getElementById('textOut');

  // Control codes
  var control_codes = controlCodes(encodingScheme.control_code);


  // For a given mosaic tile within a teletext character, count how many pixels are 'on' and normalize 0-7 to fit in a 3-bit field
  function imageTileValue(position, tileCoords){
    var value = 0;
    var area = (1+tileCoords[2]-tileCoords[0])*(1+tileCoords[3]-tileCoords[1]);
    for (var y = tileCoords[1]; y<tileCoords[3]+1; y++){
      for (var x = tileCoords[0]; x<tileCoords[2]+1; x++){
        value += imageData.data[position+((y*240)+x)*4];
      }
    }
    var normalized = Math.floor(7*value/(area*255));
    return normalized;
  }

  // Draw character on screen
  function drawChar(position,teletextChar,foregroundPixel,backgroundPixel){
    for (let y =0; y<10; y++){
      for (let x =0; x<6; x++){
        var thisPixel= teletext_chars[(60*teletextChar) + x + (y*6)]*255;

        if (thisPixel==255)  {
          imageOut32[(position>>2)+(x)+(y*240)]= foregroundPixel;

        } else{
          imageOut32[(position>>2)+(x)+(y*240)]= backgroundPixel;
        }
      }
    }
  }

  // Iterate across teletext char sized tiles
  for (let iy = 0; iy<25; iy++){
    for (let ix = 0; ix<40; ix++){
      var position = (iy * 240 * 10 * 4) + (ix * 6 * 4);

        var tileValues = [];
        // For each of the 6 tiles
        for (let tile = 0; tile<mosaic_tiles.length; tile++){
          tileValues.push(imageTileValue(position, mosaic_tiles[-1+mosaic_tiles.length-tile]));
        }

        var thisValue = 0;
        for (b=0; b<mosaic_tiles.length; b++){
          thisValue = (thisValue << 3) | (tileValues[b] & 0x7);
        }

        teletextChar = (ix < control_codes.length) ? 0 : encodingScheme.data[thisValue];

        drawChar(position,teletextChar,foregroundPixel,backgroundPixel)

        // convert to actual teletext character code
        teletextChar =  teletextChar > 96 ? teletextChar+64 : teletextChar + 32;

        // Inject control codes at beginning of line
        if (ix < control_codes.length) {teletextChar = control_codes[ix]}

        framebuffer[(frame*1000)+ix+iy*40] = teletextChar;
    }
  }

  context.fillRect(0, 0,canvas.width, canvas.height);
  context.putImageData(imageDataOut, 0, 0);
  context.drawImage(canvas,0,0,240,250,0,0,6*40*2.4,10*25*2);
}

function preprocessImage(image8){
  var brightness = config.brightness * 5.12;
  var contrast = (config.contrast * 5.12)-255;
  var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i<image8.length; i=i+4){
    var red     = image8[i]
    var green   = image8[i+1]
    var blue    = image8[i+2]

    var output = ((0.3 * red) + (0.59 * green) + (0.11 * blue)); // convert to greyscale
    output = output + (brightness-255); // apply brightness
    output = factor * ((output - 128) + 128); // apply contrast


    if (output>255) {output=255;} // truncate
    if (config.invert) {output = 255-output;}

    image8[i] = output;
    image8[i+1] = output;
    image8[i+2] = output;
  }
    return image8;
  }

  // Calculate control codes
  function controlCodes(control_code){
    var codes = [];

    // Black is default background. Only change it if needed
    if (config.backgroundColor != 0) {
      codes.push(control_code+config.backgroundColor); // add specified color code
      codes.push(157); // add background code
    }

    // White alphanumeric is default foreground. Only change it if needed
    if (control_code+config.foregroundColor != 135) {
      codes.push(control_code+config.foregroundColor); // add specified color code
    }

    return codes;
  }
