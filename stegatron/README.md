# stegatron: embed data in Twitter images
bbcmicrobot steganography

## Background

Sending binary programs to the [@bbcmicrobot](https://twitter.com/bbcmicrobot) Twitter bot requires us develop some new tricks. [Image steganography](https://towardsdatascience.com/hiding-data-in-an-image-image-steganography-using-python-e491b68b1372) is a technique to hide data in images, with a common method being to use the 2 least significant bits (LSB) per byte of pixel data making the encoding almost imperceptible. Another notable application of steganography to encode cool retro programs in PNG images is [pico8](https://pico-8.fandom.com/wiki/P8PNGFileFormat).

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

## Live demo

The image below has a zip of Elite source code embedded into it! 

You can [decode the file live in your web browser](https://8bitkick.github.io/stegatron/) using the index.html in this repo.


The file encoded in the image is a zip of Kieran Connell's [elite-beebasm](https://github.com/kieranhj/elite-beebasm) repo. If you're looking for Mark Moxon's fully documented version of this you can find it [here](https://github.com/markmoxon/elite-beebasm). 

![elite](https://raw.githubusercontent.com/8bitkick/8bitkick.github.io/master/stegatron/EhGs5RWVkAANqlB.png)

