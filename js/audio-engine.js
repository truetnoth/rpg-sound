// audio-engine.js - Аудио движок
export let audioContext = null;
export let masterGainNode = null;
export let sounds = [];

// Иконки для разных типов звуков
const soundIcons = {
    rain: '🌧️', fire: '🔥', wind: '💨', forest: '🌲', water: '💧',
    thunder: '⚡', music: '🎵', battle: '⚔️', tavern: '🍺', cave: '🗻',
    default: '🎶'
};

export function getIconForSound(filename) {
    const lower = filename.toLowerCase();
    for (let [key, icon] of Object.entries(soundIcons)) {
        if (lower.includes(key)) return icon;
    }
    return soundIcons.default;
}

export function shouldEnableFadeByDefault(filename) {
    const lower = filename.toLowerCase();
    const noFadeKeywords = ['hit', 'strike', 'knock', 'bell', 'horn', 'drum', 
                            'clap', 'snap', 'crack', 'boom', 'bang', 'crash'];
    const fadeKeywords = ['rain', 'wind', 'fire', 'water', 'forest', 'cave', 
                          'ambient', 'music', 'theme', 'background', 'atmosphere',
                          'ocean', 'river', 'storm', 'thunder', 'crowd', 'tavern'];
    
    for (let keyword of noFadeKeywords) {
        if (lower.includes(keyword)) return false;
    }
    for (let keyword of fadeKeywords) {
        if (lower.includes(keyword)) return true;
    }
    return true;
}

export function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
    masterGainNode.gain.value = 0.7;
}

export function playSound(sound) {
    sound.gainNode = audioContext.createGain();
    
    if (sound.fadeEnabled) {
        sound.gainNode.gain.value = 0;
        sound.gainNode.gain.linearRampToValueAtTime(
            sound.volume,
            audioContext.currentTime + sound.fadeDuration
        );
    } else {
        sound.gainNode.gain.value = sound.volume;
    }
    
    sound.gainNode.connect(masterGainNode);
    sound.currentSource = 1;
    sound.scheduledTime = audioContext.currentTime;
    sound.isPlaying = true;
    
    scheduleNextLoop(sound);
}

function scheduleNextLoop(sound) {
    if (!sound.isPlaying || !sound.gainNode) return;
    
    const bufferDuration = sound.buffer.duration;
    const source = audioContext.createBufferSource();
    source.buffer = sound.buffer;
    
    try {
        source.connect(sound.gainNode);
    } catch (e) {
        return;
    }
    
    source.start(sound.scheduledTime);
    
    if (!sound.loopEnabled) {
        source.onended = () => {
            if (sound.isPlaying) {
                sound.isPlaying = false;
                actuallyStopSound(sound);
            }
        };
    }
    
    if (sound.currentSource === 1) {
        sound.source1 = source;
        sound.currentSource = 2;
    } else {
        sound.source2 = source;
        sound.currentSource = 1;
    }
    
    if (!sound.loopEnabled) return;
    
    sound.scheduledTime += bufferDuration;
    const timeToScheduleNext = (sound.scheduledTime - audioContext.currentTime - 0.1) * 1000;
    
    if (timeToScheduleNext > 0) {
        sound.scheduleTimeout = setTimeout(() => scheduleNextLoop(sound), timeToScheduleNext);
    } else {
        scheduleNextLoop(sound);
    }
}

export function stopSound(sound) {
    if (!sound.gainNode) {
        sound.isPlaying = false;
        return;
    }
    
    sound.isPlaying = false;
    
    if (sound.scheduleTimeout) {
        clearTimeout(sound.scheduleTimeout);
        sound.scheduleTimeout = null;
    }
    
    if (sound.fadeEnabled) {
        const currentTime = audioContext.currentTime;
        const currentVolume = sound.gainNode.gain.value;
        
        sound.gainNode.gain.cancelScheduledValues(currentTime);
        sound.gainNode.gain.setValueAtTime(currentVolume, currentTime);
        sound.gainNode.gain.linearRampToValueAtTime(0, currentTime + sound.fadeDuration);
        
        sound.fadeOutTimeout = setTimeout(() => {
            actuallyStopSound(sound);
        }, sound.fadeDuration * 1000 + 100);
    } else {
        actuallyStopSound(sound);
    }
}

function actuallyStopSound(sound) {
    if (sound.fadeOutTimeout) {
        clearTimeout(sound.fadeOutTimeout);
        sound.fadeOutTimeout = null;
    }
    
    if (sound.source1) {
        try {
            sound.source1.stop();
            sound.source1.disconnect();
        } catch (e) {}
        sound.source1 = null;
    }
    
    if (sound.source2) {
        try {
            sound.source2.stop();
            sound.source2.disconnect();
        } catch (e) {}
        sound.source2 = null;
    }
    
    if (sound.gainNode) {
        try {
            sound.gainNode.disconnect();
        } catch (e) {}
        sound.gainNode = null;
    }
}

export function updateMasterVolume(value) {
    const volume = value / 100;
    if (masterGainNode) {
        masterGainNode.gain.value = volume;
    }
    localStorage.setItem('masterVolume', value);
}
