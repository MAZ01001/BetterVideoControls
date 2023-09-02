# BetterVideoControls

A [Tampermonkey](https://www.tampermonkey.net/) userscript to control html video elements with the keyboard.
Oriented on [YouTube](https://www.youtube.com/) keyboard shortcuts.

Keeps track of the last video element that was clicked on to control it when a key is pressed.
It shows a popup for 2 sec on what action was performed (the text is selectable and fades out when losing focus).

It also selects the video when clicking something over the video element, pressing ctrl while hovering over it, and removing otherwise.
To deselect, click somewhere else on the page (or ctrl while not hovering over a video element ).

click [here](https://github.com/MAZ01001/BetterVideoControls/raw/main/better_video_controls.user.js "GitHub raw URL to better_video_controls.user.js file") to see this userscript in tampermonkey.

__Disclamer__: Sadly this doesn't always work because of other event listeners on the page or integrated video players.

__Note__: The default behavior of key presses and other event listeners will be prevented.
By utilizing `Event.preventDefault()` and `Event.stopImmediatePropagation()` while the controls are on and a keypress from the controls list is registered.

The following table will also be logged to the console, including a functions to toggle the controls on/off and for manually overriding the targeted video element.

## Keyboard controls

<details open><summary>Click to hide table</summary>

| Keyboard (intended for QWERTZ) | Function                                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| [alt] [c]                      | toggles controls (no visual cue)                                      |
| [ctrl]                         | use the video element currently hovering over, if any (no visual cue) |
| [0] - [9]                      | skip to []% of total duration (ie. key [8] skips to 80% of the video) |
| [.]                            | (while paused) next frame (1/60 sec)                                  |
| [,]                            | (while paused) previous frame (1/60 sec)                              |
| [M] ( [shift] [m] )            | reset playback speed                                                  |
| [:] ( [shift] [.] )            | decrease playback speed by 10%                                        |
| [;] ( [shift] [,] )            | increase playback speed by 10%                                        |
| [j] / [ArrowLeft]              | rewind 5 seconds                                                      |
| [l] / [ArrowRight]             | fast forward 5 seconds                                                |
| [J] ( [shift] [j] )            | rewind 30 seconds                                                     |
| [l] ( [shift] [l] )            | fast forward 30 seconds                                               |
| [k]                            | pause / play video                                                    |
| [+] / [ArrowUp]                | increase volume by 10%                                                |
| [-] / [ArrowDown]              | lower volume by 10%                                                   |
| [m]                            | mute / unmute video                                                   |
| [R] ( [shift] [r] )            | setup custom loop (shows a menu)                                      |
| [r]                            | toggle loop mode                                                      |
| [f]                            | toggle fullscreen mode                                                |
| [p]                            | toggle picture-in-picture mode                                        |
| [t]                            | displays exact time and duration                                      |
| [u]                            | displays current source url                                           |

</details>
