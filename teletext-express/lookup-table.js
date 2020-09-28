// For a given mosaic tile within a teletext character, count how many pixels are 'on' and normalize 0-7 to fit in a 3-bit field
function charTileValue(charData, tileCoords){
  var value = 0;
  var area = (1+tileCoords[2]-tileCoords[0])*(1+tileCoords[3]-tileCoords[1]);
  for (var y = tileCoords[1]; y<tileCoords[3]+1; y++){
    for (var x = tileCoords[0]; x<tileCoords[2]+1; x++){
      value += charData[x+(y*6)];
    }
  }
  var normalized = Math.ceil(value/area*7);
  return normalized;
}

// Calculate the value for all tiles in a teletext character
function charValue(charData,mosaic_tiles){
  var charTileValues= [];
  // get values for individual tiles
  for (var tile = 0; tile < mosaic_tiles.length; tile++){
    charTileValues.push(charTileValue(charData,mosaic_tiles[tile]));
  }
  return charTileValues;
}

// Calculate the values for all teletext characters
function calculateCharValues(teletext_chars,mosaic_tiles){
  var numChars = teletext_chars.length/60;
  var charValues = [];
  for (var c=0; c<numChars; c++){
    var charData = teletext_chars.slice(c*60,60+(c*60));
    charValues.push(charValue(charData,mosaic_tiles));
  }
  return charValues;
}

// Compare an image region to a teletext character and return the difference
function charDifference(imageTiles, charTiles){
  var difference =0;
  for (b=0; b<imageTiles.length; b++){
    difference += (imageTiles[b] - charTiles[b]) ** 2;
  }
  return difference;
}

function calculateLookup(filter,mosaic_tiles){
  var table_length = 2**(3 * mosaic_tiles.length);
  var charLookup = new Uint8Array(table_length);
  var charValues = calculateCharValues(teletext_chars,mosaic_tiles);

  // Run through every possible permulation of image tile greyscale values
  for (let i = 0; i<table_length; i++){
    var charTileValues = [];

    // Average value for tiles 0-5
    for (b=0; b<mosaic_tiles.length; b++){
      charTileValues[b] = (i >> (b*3)) & 7;
    }

    var bestDifference = 9999999;
    var bestChar = 0;
    // Now test every character and see what fits best
    for (c=0; c<96+96; c++){
      var charValue = charValues[c];
      var charDiffence = charDifference(charValue,charTileValues);
      if (filter(c)) {
        if (charDiffence<bestDifference){bestChar=c;bestDifference=charDiffence;}
      }
    }
    charLookup[i] = bestChar;
  }
  console.log(charLookup);
  return charLookup;
}


var char_lookup = [
  {
    name: "Graphics (hi)",
    filter: (c => c>96 || c==0),
    control_code: 144,
    subdivision: [ // all 6 sixels
      [0,0,2,2], [3,0,5,2],
      [0,3,2,6], [3,3,5,6],
      [0,7,2,9], [3,7,5,9]
    ]
  },
  {
    name: "Graphics + text (hi)",
    filter: (c=> !(c>0 && c < 0x20) && !(c < 96 && c > 0x5f-0x20)),
    control_code: 144,
    subdivision:[ // all 6 sixels
      [0,0,2,2], [3,0,5,2],
      [0,3,2,6], [3,3,5,6],
      [0,7,2,9], [3,7,5,9]
    ]
  },
  {
    name: "Graphics + text (lo)",
    filter: (c=> !(c>0 && c < 0x20) && !(c < 96 && c > 0x5f-0x20)),
    control_code: 144,
    subdivision:[ // quarters to allow for dither
      [0,0,2,4], [3,0,5,4],
      [0,5,2,9], [3,5,5,9]
    ],
  },
  {
    name: "Text only (hi)",
    filter: (c => c<96),
    control_code: 128,
    subdivision: [ // all 6 sixels
      [0,0,2,2], [3,0,5,2],
      [0,3,2,6], [3,3,5,6],
      [0,7,2,9], [3,7,5,9]
    ]
  },
  {
    name: "Char blocks",
    filter: (c=> c==0 || c == 95),
    control_code: 128,
    subdivision:[ // quarters to allow for dither
      [0,0,5,9]
    ],
  },
]
