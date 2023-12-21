# VoxelAstra
You ask for it, AI builds it! [Try demo now](https://8bitkick.github.io/VoxelAstra/)

e.g. you say "build a snowman" into the mic, and the AI chooses from available [tools](https://github.com/8bitkick/VoxelAstra/blob/main/src/assistantConfig.js) to add spheres, cylinders and cubes of the shape, size, color, position, and rotation it thinks best create the requested scene for you using threejs and WebXR.

Caveat - this is a fun demo. If you ask it to build something complicated don't be surprised if it just drops a cube on the floor


Thanks to @asnar00 for the inspiration and feedback.

## Meta Quest 3 - Mixed-Reality
![VoxelAstra1](https://github.com/8bitkick/8bitkick.github.io/assets/26802703/cce45b46-5980-4aeb-8d9b-662f1dfb76e7)


## Desktop mode
<img width="1204" alt="desktop-mode" src="https://github.com/8bitkick/8bitkick.github.io/assets/26802703/e40d420e-462e-47e8-8d2b-7b042560112a">


## Usage

Run a local web server (will be putting on a public site soon but it's private for now)

```
python3 -m http.server 8080
```

Open the page in your web browser and enter your OpenAI API key to get started (at your own risk)

### Permissions

* This demo requests your OpenAI API key *use at your own risk*. You can either paste it in the web page, add it as the `?apiKey=xxxxxxx` URL parameter or hardcode it into `main.js` if you're hosting locally.

* Browser will request microphone access - when you hold the mic button (or Meta Quest trigger button) your audio will be recorded and sent to OpenAI whisper API on button release.

* The text returned by Whisper will then be sent to the OpenAI Assistant API

* Meta Quest may complain about requiring HTTPS for WebXR. The workaround is to add your local server IP to an allow list in chrome settings.

### Disclaimer

This is a quick proof of concept so there's a lot more that could be done to improve it...


* Objects sometimes wind up in the wrong place. You can ask the AI to fix, but at the moment there is no other feedback loop.

* Using a vision model, or passing back data about object collisions / occlusion would help refine results

* Local AI inference where possible and/or open models would be a good approach.

* General purpose models aren't necessarily good at spatial reasoning, a more specialized model be better.

