# SelfCensor.JS

<p align="center">
  <img src="https://github.com/mochatek/SelfCensorJS/blob/main/logo.png" alt="Logo" />
</p>

[Example](https://github.com/mochatek/SelfCensorJS/tree/main/docs) | [Playground](https://mochatek.github.io/SelfCensorJS/)

**SelfCensor** is a JavaScript library that provides a simple solution for censoring segments of video in the browser.
It enables us to define different censor tracks based on age ratings or genres or any other category, and then automatically
skip the specified intervals in the video according to the selected track.

With SelfCensor, you can easily add censoring functionality to your video player without the need for any additional plugin
or server-side processing. The censoring is performed entirely in the browser, while providing a smooth and uninterrupted viewing
experience for the user.

## Use Cases

- **Parental Controls**: SelfCensor can be used to enable parental controls for video content, allowing parents to restrict their children's
  access to certain categories of content based on age rating, genre, or other criteria.

- **Online Streaming Platform**: SelfCensor can be used by online streaming platforms to provide a more customizable and personalized viewing
  experience for their users. By providing different censor tracks for a movie, like with subtitles, users get the option to watch different censor
  versions of the same movie, based on their preference. They can even add their own custom-censored version.

## Installation

### In Browser:

```html
<script type="module">
  import SelfCensor from "https://cdn.jsdelivr.net/npm/self-censor@1.0.0/+esm";
</script>
```

### In Node.js environment using NPM:

```
npm i self-censor
```

## Usage

Link the JSON file with censor data:

```html
<video id="my-video" data-censor="url-of-my-censor-data.json" controls>
  <source src="url-of-my-video.mp4" type="video/mp4" />
</video>
```

Import the class:

```js
// ESM
import SelfCensor from "self-censor";

// CommonJS
const SelfCensor = require("self-censor");
```

Instantiate with the id of the target(HTML Video) element:

```js
const censor = new SelfCensor("my-video");
```

Subscribe to `ready` event to get the censor track details:

```js
censor.on("ready", ({ detail: { censorTracks, currentTrack } }) =>
  console.dir({ censorTracks, currentTrack })
);
```

Subscribe to `error` event to catch and handle the errors thrown from the service:

```js
censor.on("error", ({ detail }) => console.error(detail));
```

Start the censoring service:

```js
censor.start();
```

Temporarily pause the censoring:

```js
censor.pause();
```

Resume a paused service

```js
censor.resume();
```

Switch censor track if service is active:

```js
censor.switchTrack("track-name");
```

Stop the censoring service:

```js
censor.stop();
```

See Example: [Source](https://github.com/mochatek/SelfCensorJS/tree/main/docs) | [Playground](https://mochatek.github.io/SelfCensorJS/)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT License ](https://github.com/mochatek/SelfCensorJS/blob/main/LICENSE.txt)
