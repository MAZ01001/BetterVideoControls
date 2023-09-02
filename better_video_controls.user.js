// ==UserScript==
// @name         better video controls
// @version      1.1.9
// @description  various keyboard controls for html video elements, see console after page loads for keyboard shortcuts (uses the last video element that was clicked on).
// @author       MAZ / MAZ01001
// @source       https://github.com/MAZ01001/BetterVideoControls
// @updateURL    https://github.com/MAZ01001/BetterVideoControls/raw/main/better_video_controls.user.js
// @downloadURL  https://github.com/MAZ01001/BetterVideoControls/raw/main/better_video_controls.user.js
// @include      *
// @match        /^[^:/#?]*:\/\/([^#?/]*\.)?.*\..*(:[0-9]{1,5})?\/.*$/
// @match        /^file:\/\/\/.*\..*$/
// @exclude      /^[^:/#?]*:\/\/([^#?/]*\.)?youtube\.com(:[0-9]{1,5})?\/.*$/
// @run-at       document-start
// @noframes     false
// ==/UserScript==

//~ set some (local) variables
/** @type {HTMLDivElement} - the base element */
const _bvc_hint=document.createElement("div"),
    /** @type {HTMLDivElement} - the base for the from-to-loop menu */
    _bvc_loop_menu=document.createElement("div"),
    /** @type {HTMLSpanElement} - the element for showing the action done on keypress */
    _bvc_hint_text=document.createElement("span"),
    /** @type {HTMLInputElement} - input field for the from-time in `_bvc_loop_menu` */
    _bvc_loop_from=document.createElement("input"),
    /** @type {HTMLInputElement} - input field for the to-time in `_bvc_loop_menu` */
    _bvc_loop_to=document.createElement("input"),
    /** @type {HTMLInputElement} - the start-loop button in `_bvc_loop_menu` */
    _bvc_loop_set=Object.assign(document.createElement("input"),{type:"button",value:"Loop"}),
    /** @type {number[]} - current mouse x and y position on page (sealed array) */
    _bvc_mouse=Object.seal([0,0]),
    /** @type {RegExp} - pattern for matching time in format "-0:0:0.0" (sign, hours, minutes, and milliseconds are optional) - (grouped: sign; hours; minutes; seconds (with milliseconds)) */
    _bvc_time_format=/^([+-]?)(?:(?:(0|[1-9][0-9]*):)?(0|[1-9][0-9]*):)?((?:0|[1-9][0-9]*)(?:\.[0-9]+)?)$/;
/** @type {boolean} - if `false` ignores video controls and does not call `preventDefault` and `stopImmediatePropagation` for keypressed on video elements */
let _bvc_state=true,
    /** @type {HTMLVideoElement|null} - the last video element that the mouse was over */
    _bvc_last_video=null,
    /** @type {number} - the start for looping interval */
    _bvc_loop_start=0,
    /** @type {number} - the end for looping interval */
    _bvc_loop_end=0,
    /** @type {number|null} - the looping interval or null */
    _bvc_loop_interval=null;
//~ set a name and some styling for the hint element
_bvc_hint.dataset.name="better-video-controls";
_bvc_hint.style.position="fixed";
_bvc_hint.style.transform="translate(-50%,-50%)";
_bvc_hint.style.borderRadius=".5rem";
_bvc_hint.style.border="1px solid #333";
_bvc_hint.style.backgroundColor="#000";
_bvc_hint.style.color="#0f0";
_bvc_hint.style.fontFamily="consolas,monospace";
_bvc_hint.style.fontSize="large";
_bvc_hint.style.textAlign="center";
_bvc_hint.style.width="max-content";
_bvc_hint.style.padding="2px 8px";
//// _bvc_hint.style.whiteSpace="nowrap";
_bvc_hint.style.lineBreak="anywhere";
_bvc_hint.style.zIndex="1000000";
_bvc_hint.style.visibility="hidden";
_bvc_hint.style.opacity="0";
_bvc_hint.appendChild(_bvc_hint_text);
//~ fade out `_bvc_hint` when the document window changes
window.addEventListener("resize",()=>bvc_hint_visible(false),{passive:true});
document.addEventListener("scroll",()=>bvc_hint_visible(false),{passive:true});
//~ mouse hover, focus, or selection events may change `_bvc_hint`s visibility status (fades out when not focused in any way)
_bvc_hint.addEventListener("focusin",()=>bvc_hint_visible(true),{passive:true});
_bvc_hint.addEventListener("focusout",()=>bvc_hint_visible(bvc_mouse_over_element(_bvc_hint)||_bvc_hint.contains(document.getSelection().focusNode?.parentElement)),{passive:true});
_bvc_hint.addEventListener("mouseover",()=>bvc_hint_visible(true),{passive:true});
_bvc_hint.addEventListener("mouseleave",()=>bvc_hint_visible(_bvc_hint.contains(document.activeElement)||_bvc_hint.contains(document.getSelection().focusNode?.parentElement)),{passive:true});
document.addEventListener("selectionchange",()=>{
    if(
        _bvc_hint.style.visibility==="visible"
        &&!bvc_mouse_over_element(_bvc_hint)
        &&!_bvc_hint.contains(document.activeElement)
        &&!_bvc_hint.contains(document.getSelection().focusNode?.parentElement)
    )bvc_hint_visible(false);
},{passive:true});
//~ setup loop menu
(()=>{
    "use strict";
    [_bvc_loop_from,_bvc_loop_to].forEach(el=>{
        "use strict";
        el.required=true;
        el.addEventListener("input",()=>el.reportValidity(),{passive:true});
        el.title="format: [[hours:]minutes:]seconds[.milliseconds]";
        el.pattern="([+\\-]?)(?:(?:(0|[1-9][0-9]*):)?(0|[1-9][0-9]*):)?((?:0|[1-9][0-9]*)(?:\\.[0-9]+)?)";
        el.placeholder="h:m:s.ms";
    })
    let _fieldset = document.createElement("fieldset"),
        _legend = Object.assign(document.createElement("legend"),{innerText:"Loop video"}),
        _label_from = Object.assign(document.createElement("label"),{innerText:"From:"}),
        _label_to = Object.assign(document.createElement("label"),{innerText:"To:"});
    _bvc_hint.appendChild(_bvc_loop_menu);
    _bvc_loop_menu.appendChild(_fieldset);
    _fieldset.appendChild(_legend);
    _fieldset.appendChild(_label_from);
    _fieldset.appendChild(_label_to);
    _fieldset.appendChild(_bvc_loop_set);
    _label_from.append(_bvc_loop_from);
    _label_to.append(_bvc_loop_to);
    _bvc_loop_set.addEventListener("click",()=>{
        "use strict";
        _bvc_loop_set.style.backgroundColor=bvc_make_loop_interval(_bvc_loop_from.value,_bvc_loop_to.value)?"#6f6":"#f66";
    },{passive:true});
})();
//~ main functions
/**
 * __track mouse position on page__
 * @param {MouseEvent} ev - mouse event `mousemove`
 */
function bvc_mousemove_event_listener(ev){
    "use strict";
    _bvc_mouse[0]=ev.clientX;
    _bvc_mouse[1]=ev.clientY;
}
/**
 * __set `_bvc_last_video` to video hovering or `null` when clicking some where else__
 * @param {MouseEvent} ev - mouse event `mousedown` - _unused_
 */
function bvc_mousedown_event(ev){
    "use strict";
    for(const vid of document.querySelectorAll("video")){
        if(bvc_mouse_over_element(vid)){
            _bvc_last_video=vid;
            return;
        }
    }
    _bvc_last_video=null;
}
/**
 * __test if the mouse is over given element__
 * @param {Element} el - the element given
 * @returns {boolean} `true` if mouse is over `el` bounds, `false` otherwise
 */
function bvc_mouse_over_element(el){
    "use strict";
    const{top,bottom,left,right}=el.getBoundingClientRect();
    return _bvc_mouse[0]>=left
        && _bvc_mouse[0]<=right
        && _bvc_mouse[1]>=top
        && _bvc_mouse[1]<=bottom;
}
/**
 * __validates the time and returns it__ \
 * _requires `_bvc_last_video` to be set_
 * @param {string|number} time - the time to validate
 * @returns {number} the corrected time or `NaN` if not in format
 */
function bvc_validate_time(time){
    if(_bvc_last_video==null)return NaN;
    if(typeof time!=="number"){
        time=String(time);
        let match=time.match(_bvc_time_format);
        if(match==null)return NaN;
        time=((match[1]??'')==='-'?-1:1)*(Number(match[2]??0)*3600+Number(match[3]??0)*60+Number(match[4]));
    }
    if(time<0)time=_bvc_last_video.duration+time;
    if(time<0||time>_bvc_last_video.duration)return NaN;
    return time;
}
/**
 * __creates a loop with given start and end points__
 * @param {string|number} from - the starting position of the loop
 * @param {string|number} to - the end position of the loop
 * @returns {boolean} true if loop was created successfully and false otherwise
 */
function bvc_make_loop_interval(from,to){
    "use strict";
    if(_bvc_last_video==null)return false;
    if(Number.isNaN(_bvc_loop_start=bvc_validate_time(from)))return false;
    if(Number.isNaN(_bvc_loop_end=bvc_validate_time(to)))return false;
    if(from===to)return false;
    if(_bvc_loop_interval!=null)clearInterval(_bvc_loop_interval);
    if(from<to)
        //~ |    +------+    |
        _bvc_loop_interval=setInterval(()=>{if(_bvc_last_video.currentTime>=_bvc_loop_end)_bvc_last_video.currentTime=_bvc_loop_start;},100);
    else{
        //~ |----+      +----|
        _bvc_last_video.loop=true;
        _bvc_loop_interval=setInterval(()=>{if(_bvc_last_video.currentTime>=_bvc_loop_end&&_bvc_last_video.currentTime<_bvc_loop_start)_bvc_last_video.currentTime=_bvc_loop_start;},100);
    }
    return true;
}
/**
 * __keyboard controls for video element__ \
 * `keypress` eventlistener on document \
 * _(controls for last hovered video element)_
 * @param {KeyboardEvent} ev - keyboard event `keypress`
 * @description __Keyboard controls with `{key}` of `KeyboardEvent`__
 * - `0` - `9`          → skip to ` `% of total duration (ie. key `8` skips to 80% of the video)
 * - `.`                → (while paused) next frame (1/60 sec)
 * - `,`                → (while paused) previous frame (1/60 sec)
 * - `:` (`shift` `.`)  → decrease playback speed by 10%
 * - `;` (`shift` `,`)  → increase playback speed by 10%
 * - `M` (`shift` `m`)  → reset playback speed
 * - `j` / `ArrowLeft`  → rewind 5 seconds
 * - `l` / `ArrowRight` → fast forward 5 seconds
 * - `j` (`shift` `j`)  → rewind 30 seconds
 * - `l` (`shift` `l`)  → fast forward 30 seconds
 * - `k`                → pause / play video
 * - `+` / `ArrowUp`    → increase volume by 10%
 * - `-` / `ArrowDown`  → lower volume by 10%
 * - `m`                → mute / unmute video
 * - `r`                → toggle loop mode
 * - `f`                → toggle fullscreen mode
 * - `p`                → toggle picture-in-picture mode
 * - `t`                → displays exact time and duration
 * - `u`                → displays current source url
 *
 * __NOTE__ calls `preventDefault` and `stopImmediatePropagation`
 */
function bvc_keyboard_event_listener(ev){
    "use strict";
    if(ev.key==="Control"){
        bvc_mousedown_event(null);
        return;
    }
    if(ev.altKey&&ev.key==='c'){
        _bvc_state=!_bvc_state;
        return;
    }
    if(_bvc_last_video==null)return;
    if(!_bvc_state)return;
    if(_bvc_hint.style.visibility==="visible"&&!_bvc_loop_menu.hidden)return;
    _bvc_loop_menu.hidden=true;
    _bvc_loop_menu.style.display="none";
    let text="";
    switch(ev.key){
        case'0':case'1':case'2':case'3':case'4':case'5':case'6':case'7':case'8':case'9':
            _bvc_last_video.currentTime=_bvc_last_video.duration*Number(ev.key)*.1;
            text=`skiped video to ${Number(ev.key)*10}%`;
        break;
        //~ _bvc_last_video.requestVideoFrameCallback((...[,{processingDuration}])=>console.log(processingDuration)); //=> fps ~ varies greatly
        case'.':
            if(!_bvc_last_video.paused)_bvc_last_video.pause();
            _bvc_last_video.currentTime+=0.0166666666666666666; //~ 1/60
            text=`next frame (if 60 fps) to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case',':
            if(!_bvc_last_video.paused)_bvc_last_video.pause();
            _bvc_last_video.currentTime-=0.0166666666666666666; //~ 1/60
            text=`previous frame (if 60 fps) to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case':':
            if(_bvc_last_video.playbackRate<4){
                _bvc_last_video.playbackRate=Number.parseFloat((_bvc_last_video.playbackRate+0.1).toFixed(4));
                text=`speed increased to ${Math.floor(_bvc_last_video.playbackRate*100)} %`;
            }else{
                _bvc_last_video.playbackRate=4
                text="speed already max (400 %)";
            }
        break;
        case';':
            if(_bvc_last_video.playbackRate>0.1){
                _bvc_last_video.playbackRate=Number.parseFloat((_bvc_last_video.playbackRate-0.1).toFixed(4));
                text=`speed decreased to ${Math.floor(_bvc_last_video.playbackRate*100)} %`;
            }else{
                _bvc_last_video.playbackRate=0.1
                text="speed already min (10 %)";
            }
        break;
        case'M':
            _bvc_last_video.playbackRate=_bvc_last_video.defaultPlaybackRate;
            text=`reset speed to ${_bvc_last_video.playbackRate}`;
        break;
        case'j':case"ArrowLeft":
            _bvc_last_video.currentTime-=5;
            text=`skiped back 5 sec to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case'l':case"ArrowRight":
            _bvc_last_video.currentTime+=5;
            text=`skiped ahead 5 sec to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case'J':
            _bvc_last_video.currentTime-=30;
            text=`skiped back 30 sec to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case'L':
            _bvc_last_video.currentTime+=30;
            text=`skiped ahead 30 sec to ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case'k':
            if(_bvc_last_video.paused)_bvc_last_video.play();
            else _bvc_last_video.pause();
            text=`video ${_bvc_last_video.paused?"paused":"resumed"} at ${_bvc_last_video.currentTime.toFixed(6)}`;
        break;
        case'+':case"ArrowUp":
            _bvc_last_video.volume=(vol=>vol>1?1:vol)(Number.parseFloat((_bvc_last_video.volume+0.1).toFixed(4)));
            text=`volume increased to ${Math.floor(_bvc_last_video.volume*100)} %`;
            _bvc_last_video.muted=_bvc_last_video.volume<=0;
        break;
        case'-':case"ArrowDown":
            _bvc_last_video.volume=(vol=>vol<0?0:vol)(Number.parseFloat((_bvc_last_video.volume-0.1).toFixed(4)));
            text=`volume decreased to ${Math.floor(_bvc_last_video.volume*100)} %`;
            _bvc_last_video.muted=_bvc_last_video.volume<=0;
        break;
        case'm':text=`volume ${(_bvc_last_video.muted=!_bvc_last_video.muted)?"muted":"unmuted"}`;break;
        case'r':
            if(_bvc_loop_interval==null) text=(_bvc_last_video.loop=!_bvc_last_video.loop)?"looping":"not looping";
            else{
                clearInterval(_bvc_loop_interval);
                _bvc_loop_interval=null;
                _bvc_last_video.loop=false;
                text="reset custom loop / not looping";
            }
        break;
        case'R':
            text=`setup loop (${_bvc_loop_interval==null?"no loop setup":"currently looping"}):`;
            _bvc_loop_from.value=Number.isNaN(_bvc_loop_start)?"":String(_bvc_loop_start);
            _bvc_loop_to.value=Number.isNaN(_bvc_loop_end)?"":String(_bvc_loop_end);
            _bvc_loop_set.style.backgroundColor=_bvc_loop_interval==null?"#ccc":"#6f6";
            _bvc_loop_menu.hidden=false;
            _bvc_loop_menu.style.display="";
        break;
        case'f':
            if(document.fullscreenEnabled){
                if(!document.fullscreenElement)_bvc_last_video.requestFullscreen({navigationUI:"hide"});
                else if(document.fullscreenElement===_bvc_last_video)document.exitFullscreen();
            }else text="fullscreen not supported";
        break;
        case'p':
            if(document.pictureInPictureEnabled){
                if(!document.pictureInPictureElement)_bvc_last_video.requestPictureInPicture();
                else if(document.pictureInPictureElement===_bvc_last_video)document.exitPictureInPicture();
            }else text="picture-in-picture not supported";
        break;
        case't':
            text=`time: ${_bvc_last_video.currentTime.toFixed(6)} / `;
            if(_bvc_last_video.duration===Infinity)text+="live";
            else if(Number.isNaN(_bvc_last_video.duration))text+="???";
            else text+=`${_bvc_last_video.duration.toFixed(6)} -${(_bvc_last_video.duration-_bvc_last_video.currentTime).toFixed(6)}`;
            text+=" (seconds)";
        break;
        case'u':text=`url: ${_bvc_last_video.currentSrc}`;break;
    }
    if(text==="")return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    _bvc_hint_text.innerText=text;
    const{top,left,height,width}=_bvc_last_video.getBoundingClientRect();
    _bvc_hint.style.top=`${top+Math.floor(height*.5)}px`;
    _bvc_hint.style.left=`${left+Math.floor(width*.5)}px`;
    _bvc_hint.style.maxWidth=`${width}px`;
    bvc_hint_visible(true);
    if(
        !bvc_mouse_over_element(_bvc_hint)
        &&!_bvc_hint.contains(document.activeElement)
        &&!_bvc_hint.contains(document.getSelection().focusNode?.parentElement)
    )bvc_hint_visible(false);
}
/**
 * __toggle visibility of `_bvc_hint` to show/hide the element__
 * @param {boolean} state - `true` to show the element and `false` to fade out
 */
function bvc_hint_visible(state){
    "use strict";
    if(state){
        _bvc_hint.style.transition="opacity 0s linear 0s,visibility 0s linear 0s";
        _bvc_hint.style.visibility="visible";
        _bvc_hint.style.opacity="1";
    }else{
        _bvc_hint.style.transition="opacity 500ms ease-in 500ms,visibility 0s linear 1s";
        _bvc_hint.style.visibility="hidden";
        _bvc_hint.style.opacity="0";
    }
}
/**
 * __toggle the better video controls on/off (resets custom loop when turned off)__
 * @param {?boolean} force_state if set forces the state to on on `true` and off on `false`
 * @returns {boolean} `true` if currently on and `false` if turned off
 */
function bvc_toggle_controls(force_state){
    "use strict";
    //~ `== null` to check for `=== undefined || === null`
    if(
        force_state==null
        ||(Boolean(force_state)!==_bvc_state)
    )if(!(_bvc_state=!_bvc_state)&&_bvc_loop_interval!=null)clearInterval(_bvc_loop_interval);
    return _bvc_state;
}
/**
 * __manually set the focused video element__
 * @param {?HTMLVideoElement} new_video_element new video element focused - can be null
 */
function bvc_override_video_element(new_video_element){
    "use strict";
    if(new_video_element instanceof HTMLVideoElement)_bvc_last_video=new_video_element;
    else _bvc_last_video=null;
}
//~ append hint element, turn on bvc, and log controls, toggle function, and credits as a collapsed group
window.addEventListener("DOMContentLoaded",()=>{document.body.appendChild(_bvc_hint);},{passive:true,once:true});
document.addEventListener("keydown",bvc_keyboard_event_listener,{passive:false});
document.addEventListener("mousemove",bvc_mousemove_event_listener,{passive:true});
document.addEventListener("mousedown",bvc_mousedown_event,{passive:true});
console.groupCollapsed(
    "%c%s",
    "background-color:#000;color:#0F0;font-size:larger",
    "Better Video Controls - Script via Tampermonkey by MAZ01001"
);
    console.info(
        "%ccontrols:\n%c%s",
        "background-color:#000;color:#fff;",
        "background-color:#000;color:#0a0;font-family:consolas,monospace;",
        [
            " Keyboard (intended for QWERTZ) | Function                                                               ",
            "--------------------------------+------------------------------------------------------------------------",
            " [alt] [c]                      |  toggles controls (no visual cue)                                      ",
            " [ctrl]                         |  use the video element currently hovering over, if any (no visual cue) ",
            "--------------------------------+------------------------------------------------------------------------",
            " [0] - [9]                      |  skip to []% of total duration (ie. key [8] skips to 80% of the video) ",
            " [.]                            |  (while paused) next frame (1/60 sec)                                  ",
            " [,]                            |  (while paused) previous frame (1/60 sec)                              ",
            " [:] ( [shift] [.] )            |  decrease playback speed by 10%                                        ",
            " [;] ( [shift] [,] )            |  increase playback speed by 10%                                        ",
            " [M] ( [shift] [m] )            |  reset playback speed                                                  ",
            "--------------------------------+------------------------------------------------------------------------",
            " [j] / [ArrowLeft]              |  rewind 5 seconds                                                      ",
            " [l] / [ArrowRight]             |  fast forward 5 seconds                                                ",
            " [J] ( [shift] [j] )            |  rewind 30 seconds                                                     ",
            " [l] ( [shift] [l] )            |  fast forward 30 seconds                                               ",
            " [k]                            |  pause / play video                                                    ",
            "--------------------------------+------------------------------------------------------------------------",
            " [+] / [ArrowUp]                |  increase volume by 10%                                                ",
            " [-] / [ArrowDown]              |  lower volume by 10%                                                   ",
            " [m]                            |  mute / unmute video                                                   ",
            "--------------------------------+------------------------------------------------------------------------",
            " [R] ( [shift] [r] )            |  setup custom loop (shows a menu)                                      ",
            " [r]                            |  toggle loop mode                                                      ",
            " [f]                            |  toggle fullscreen mode                                                ",
            " [p]                            |  toggle picture-in-picture mode                                        ",
            "--------------------------------+------------------------------------------------------------------------",
            " [t]                            |  displays exact time and duration                                      ",
            " [u]                            |  displays current source url                                           ",
        ].join('\n')
    );
    console.info(
        "%cfunction for on/off toggle: %O\nfunction for manually setting video element: %O\nfunction for manually creating the custom loop: %O",
        "background-color:#000;color:#fff;",
        bvc_toggle_controls,
        bvc_override_video_element,
        bvc_make_loop_interval
    );
    console.info(
        "%cRight-click on the above function and select \"%cStore function as global variable%c\".\nThen you can call it with that variable like %ctemp1();",
        "background-color:#000;color:#fff;",
        "background-color:#000;color:#0a0;",
        "background-color:#000;color:#fff;",
        "background-color:#000;color:#0a0;font-family:consolas,monospace;"
    );
    console.info("Credits: MAZ https://maz01001.github.io/ \nDocumentation: https://github.com/MAZ01001/BetterVideoControls \nSource code: https://github.com/MAZ01001/BetterVideoControls/blob/main/better_video_controls.user.js");
console.groupEnd();
