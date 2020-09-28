# teletext express (beta)

Teletext express is a [free web-based tool](https://8bitkick.github.io/teletext-express/) that converts video to teletext in real-time

The tool is fully functional but cross-brower testing and UI improvements are still needed.

## Conversion technique

### Image pre-processing

Teletext frames are 40 * 25 characters of 6 * 10 pixels (240 * 250 per frame). Before converting a video frame to teletext we first convert it to a 240 * 250 greyscale image. We then apply the brightness, contrast and image inverse functions to the pre-processed image. This image is never diplayed in the application, instead it passes directly for conversion to teletext.

~~~~~~
   0             39
  ------------------      Teletext frames consist of 40 * 25 characters
0 |                |
  |                |
  |                |
  |                |
  |                |
24|                |
  ------------------
~~~~~~


### Matching to teletext characters

Each "character sized" region is compared against the levels of the chosen teletext character set to find the closest match. For increased resolution, regions are subdivided into tiles to do this - e.g. 6 sixels for mosaic graphics. Each tile is given an average greyscale value.

We precalculate a lookup table of the closest teletext characters matches against every possible combination of image region greyscale values to speed-up real time conversion. Limiting ourselves to 8 discrete greyscale levels (3-bit) we have a possible 256KB (2**18) of combinations to precalculate, assuming 6 tiles per chracter.

~~~~~~

   0   2  3   5                
                             For each encoding type we precalculate a lookup table of best teletext character matches for each of the
0  * * *  * * *              possible 256KB combinations of greyscale per image region.
   * A *  * B *
2  * * *  * * *              17                    0
                            ------------------------
3  * * *  * * *              AAA BBB CCC DDD EEE FFF
   * C *  * D *
   * * *  * * *
6  * * *  * * *             Example shows 6 tiles per character

7  * * *  * * *
   * E *  * F *
9  * * *  * * *
~~~~~~

### Encoding schemes

To allow for more artistic video creation and to adapt to diffent types of source video several encoding schemes are available:

| Style       | Character set   | Tiles per char  | Example use | 
| ------------- |:-------------:|:-----:| -----:|
| Graphics (hi) | Mosaics | 6 | Monochrome, high contrast video |
| Graphics + text (hi) | Mosaics, upper case text, some symbols  | 6 | Real world scenes |
| Graphics + text (lo) | Mosaics, upper case text, some symbols  | 4 | Real world scenes |
| Text only | Upper and lower text, symbols  | 6 | Textures |
| Char blocks | Text block 160  | 1 | Simple graphics |

Mixed graphics + text modes include teletext graphics but also some non-graphics (capital letters and 6 others: #, @, left/right/up arrows and ½), which offer finer detail in darker areas.

### Output

The control characters are retrospectively applied to the beginning of each line, and the image is diplayed in the application at a 1.2 aspect ratio bringing the display size to 288 x 240 pixels. When a video is played frames are stored in the internal frame buffer of the application, and can be downloaded with the `download frames` link.

### Thanks

Thanks to Kieran & Simon of Bitshifters for the BBC Micro mode 7 [Bad Apple demo](https://bitshifters.github.io/posts/prods/bs-badapple.html) which inspired me to hack together a mode 7 [Rick Roll](https://twitter.com/bbcmicrobot/status/1304667551268401152?s=20) in the first place, to Rheolism for the inpired idea to use avaliable alpha characters with graphics, to ZX guesser and Teletext Archeologist for their technical insights and encoragement to actually make this a tool people can use. Finally thanks to the bbcmicrobot crew for constant creativity and awesomeness



