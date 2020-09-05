# Embedding data in Twitter images
bbcmicrobot steganography

## Background

Sending binary programs to run on the [@bbcmicrobot](https://twitter.com/bbcmicrobot) Twitter bot requires us develop some new tricks. 

[Image steganography](https://towardsdatascience.com/hiding-data-in-an-image-image-steganography-using-python-e491b68b1372) is the concealment of data in images, with a common technique being spreading data across the 2 least significant bits (LSB) of image data bytes making the encoding almost imperceptible. A notable application of this steganographic process to encode cool retro programs in PNG images is [pico8](https://pico-8.fandom.com/wiki/P8PNGFileFormat). Like the pico8 we're not using this process to hide the communication of the data - rather we are using it as a larger more flexible medium on Twitter. The image 'hiding' program data is then free to be visibly labeled with the title, a screenshot, source code listing, whatever.  

At the time of writing Twitter preserve PNG images of [900x900 pixels or less](https://twittercommunity.com/t/upcoming-changes-to-png-image-support/118695) which which means the 2 LSB technique will work (Twitter may transcode images larger than this to JPEG which requires more complex steganographic [algorithms](http://www.cs.unc.edu/~lin/COMP089H/LEC/steganography.pdf)).



Using 2 LSB on a 900x900 PNG-32 gives us around 791 kilobytes of data per Twitter image of which we'll reserve 1 KB for metadata (magic bytes identifier, title, filesize, etc..)

## Byte encoding

Note - we're just doing basic 2 LSB and not encrypting the data. 

~~~~~~

 Data byte to be encoded
 =======================
 7  6  5  4  3  2  1  0
 ----------------------
 R  R  G  G  B  B  A  A

 32-bit pixel of a PNG-32 image
 ==============================
 31 30 29 28 27 26 25 24 | 23 22 21 20 19 18 17 16 | 15 14 13 12 11 10  9  8  |  7  6  5  4  3  2  1  0
 ------------------------------------------------------------------------------------------------------
  x  x  x  x  x  x  A  A |  x  x  x  x  x  x  B  B |  x  x  x  x  x  x  G  G  |  x  x  x  x  x  x  R  R

 Where x is the existing image pixel values, which are preserved
~~~~~~

## Encoding function

Here's where the magic happens. I discovered applying bitwise operators that nudge the top bit of `wordOut` variable causes it to wrap to negative (I would have thought only arithmetic operations could cause this). To get around this behavior I defined it as single element `Uint32Array` 32-bit unsigned array. Maybe some JS experts out there have a better solution. 

~~~~~
function byteEncode(byteIn){
  var wordOut = new Uint32Array(1).fill(0); // JS var treated as signed otherwise
  for (var i = 0; i<4; i++){
    wordOut[0] <<= 8; wordOut[0] |= (byteIn & 3); byteIn  >>= 2;
  }
  return wordOut[0];
}
~~~~~

## Live demo

The image below has a zip of Elite source code embedded into it! 

You can [decode the file live in your web browser](https://8bitkick.github.io/stegatron/) using the index.html in this repo.


The file encoded in the image is a zip of Kieran Connell's [elite-beebasm](https://github.com/kieranhj/elite-beebasm) repo. If you're looking for Mark Moxon's fully documented version of this you can find it [here](https://github.com/markmoxon/elite-beebasm). 

![elite](https://raw.githubusercontent.com/8bitkick/8bitkick.github.io/master/stegatron/EhGs5RWVkAANqlB.png)

