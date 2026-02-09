let ringtoneAudio = null;
let callingAudio = null;

function createAudio(src, volume = 1) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    return audio;
}

export function playRingtone() {
    stopAllCallSounds();

    // ✅ NO /public here
    ringtoneAudio = createAudio("/assets/sounds/ringtone.mp3", 0.9);

    ringtoneAudio.play().catch((err) => {
        console.warn("Ringtone autoplay blocked:", err);
    });
}

export function playCallingTone() {
    stopAllCallSounds();

    // ✅ NO /public here
    callingAudio = createAudio("/assets/sounds/calling.mp3", 0.7);

    callingAudio.play().catch((err) => {
        console.warn("Calling tone autoplay blocked:", err);
    });
}

export function stopAllCallSounds() {
    if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio = null;
    }

    if (callingAudio) {
        callingAudio.pause();
        callingAudio.currentTime = 0;
        callingAudio = null;
    }
}
