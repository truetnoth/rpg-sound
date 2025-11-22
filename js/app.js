// app.js - Главный файл приложения
import { 
    sounds, audioContext, initAudio, playSound, stopSound, 
    updateMasterVolume, getIconForSound, shouldEnableFadeByDefault 
} from './audio-engine.js';
import { 
    initIndexedDB, saveAudioToIndexedDB, loadAudioFromIndexedDB, 
    loadAllAudioFromIndexedDB, deleteAudioFromIndexedDB 
} from './storage.js';
import { 
    renderSoundboard, showNotification, toggleTrackMenu, 
    stopAllTracks, clearAll 
} from './ui-controller.js';

// Инициализация приложения
async function initApp() {
    try {
        initAudio();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        await initIndexedDB();
        await loadSavedSounds();
        
        const savedMasterVolume = localStorage.getItem('masterVolume');
        if (savedMasterVolume) {
            document.getElementById('master-volume').value = savedMasterVolume;
            document.getElementById('master-volume-value').textContent = savedMasterVolume + '%';
        }
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
    }
}

// Загрузка сохраненных звуков
async function loadSavedSounds() {
    try {
        const savedFiles = await loadAllAudioFromIndexedDB();
        
        if (savedFiles.length === 0) {
            renderSoundboard();
            return;
        }

        const soundboard = document.getElementById('soundboard');
        soundboard.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <h3>Загрузка сохраненных треков...</h3>
                <p>Найдено файлов: ${savedFiles.length}</p>
            </div>
        `;

        for (const fileData of savedFiles) {
            try {
                const buffer = await audioContext.decodeAudioData(fileData.audioData.slice(0));
                
                const sound = {
                    id: fileData.id,
                    name: fileData.metadata.name,
                    buffer: buffer,
                    source1: null,
                    source2: null,
                    gainNode: null,
                    isPlaying: false,
                    volume: fileData.metadata.volume || 0.7,
                    icon: fileData.metadata.icon,
                    currentSource: 1,
                    scheduledTime: 0,
                    fadeEnabled: fileData.metadata.fadeEnabled !== undefined ? fileData.metadata.fadeEnabled : true,
                    fadeDuration: fileData.metadata.fadeDuration || 2.0,
                    loopEnabled: fileData.metadata.loopEnabled !== undefined ? fileData.metadata.loopEnabled : true
                };
                
                sounds.push(sound);
            } catch (error) {
                console.error('Ошибка декодирования файла:', fileData.name, error);
            }
        }

        renderSoundboard();
    } catch (error) {
        console.error('Ошибка при загрузке звуков:', error);
        renderSoundboard();
    }
}

// Обработка загрузки файлов
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('audio/')) {
            loadAudioFile(file);
        }
    });
}

// Загрузка аудиофайла
async function loadAudioFile(file) {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const arrayBuffer = e.target.result;
        
        try {
            const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            const soundId = Date.now() + Math.random();
            const metadata = {
                name: file.name.replace(/\.[^/.]+$/, ""),
                volume: 0.7,
                icon: getIconForSound(file.name),
                fadeEnabled: shouldEnableFadeByDefault(file.name),
                fadeDuration: 2.0,
                loopEnabled: true
            };
            
            const sound = {
                id: soundId,
                name: metadata.name,
                buffer: buffer,
                source1: null,
                source2: null,
                gainNode: null,
                isPlaying: false,
                volume: metadata.volume,
                icon: metadata.icon,
                currentSource: 1,
                scheduledTime: 0,
                fadeEnabled: metadata.fadeEnabled,
                fadeDuration: metadata.fadeDuration,
                loopEnabled: metadata.loopEnabled
            };
            
            sounds.push(sound);
            
            try {
                await saveAudioToIndexedDB(soundId, file.name, arrayBuffer, metadata);
            } catch (error) {
                console.error('Ошибка сохранения в IndexedDB:', error);
                showNotification(`⚠️ ${file.name} загружен, но не сохранен`, 'warning');
            }
            
            renderSoundboard();
        } catch (error) {
            console.error('Ошибка декодирования аудио:', error);
            showNotification(`❌ Не удалось загрузить: ${file.name}`, 'error');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Переключение воспроизведения звука
function toggleSound(soundId) {
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;

    if (sound.isPlaying) {
        stopSound(sound);
    } else {
        playSound(sound);
    }
    
    renderSoundboard();
}

// Обновление громкости звука
async function updateSoundVolume(soundId, value) {
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    sound.volume = value / 100;
    if (sound.gainNode) {
        sound.gainNode.gain.value = sound.volume;
    }
    
    try {
        const fileData = await loadAudioFromIndexedDB(soundId);
        fileData.metadata.volume = sound.volume;
        await saveAudioToIndexedDB(
            soundId, 
            fileData.name, 
            fileData.audioData, 
            fileData.metadata
        );
    } catch (error) {
        console.error('Ошибка обновления громкости:', error);
    }
}

// Переключение fade из меню
async function toggleFadeFromMenu(soundId, event) {
    event.stopPropagation();
    
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    sound.fadeEnabled = !sound.fadeEnabled;
    
    try {
        const fileData = await loadAudioFromIndexedDB(soundId);
        fileData.metadata.fadeEnabled = sound.fadeEnabled;
        await saveAudioToIndexedDB(
            soundId, 
            fileData.name, 
            fileData.audioData, 
            fileData.metadata
        );
    } catch (error) {
        console.error('Ошибка обновления метаданных:', error);
    }
    
    document.getElementById(`menu-${soundId}`).classList.remove('show');
    renderSoundboard();
}

// Переключение loop из меню
async function toggleLoopFromMenu(soundId, event) {
    event.stopPropagation();
    
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;
    
    sound.loopEnabled = !sound.loopEnabled;
    
    try {
        const fileData = await loadAudioFromIndexedDB(soundId);
        fileData.metadata.loopEnabled = sound.loopEnabled;
        await saveAudioToIndexedDB(
            soundId, 
            fileData.name, 
            fileData.audioData, 
            fileData.metadata
        );
    } catch (error) {
        console.error('Ошибка обновления метаданных:', error);
    }
    
    document.getElementById(`menu-${soundId}`).classList.remove('show');
    renderSoundboard();
}

// Удаление звука из меню
async function deleteSoundFromMenu(soundId, event) {
    event.stopPropagation();
    
    const sound = sounds.find(s => s.id === soundId);
    if (sound) {
        sound.isPlaying = false;
        
        if (sound.scheduleTimeout) {
            clearTimeout(sound.scheduleTimeout);
            sound.scheduleTimeout = null;
        }
        if (sound.fadeOutTimeout) {
            clearTimeout(sound.fadeOutTimeout);
            sound.fadeOutTimeout = null;
        }
        
        stopSound(sound);
        
        try {
            await deleteAudioFromIndexedDB(soundId);
        } catch (error) {
            console.error('Ошибка удаления из IndexedDB:', error);
        }
    }
    
    sounds.splice(sounds.findIndex(s => s.id === soundId), 1);
    renderSoundboard();
}

// Закрытие всех меню при клике вне них
document.addEventListener('click', (event) => {
    if (!event.target.closest('.track-menu') && !event.target.closest('.track-menu-button')) {
        document.querySelectorAll('.track-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Предотвращение случайного закрытия при активных звуках
window.addEventListener('beforeunload', (e) => {
    const hasActiveSounds = sounds.some(s => s.isPlaying);
    if (hasActiveSounds) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker зарегистрирован'))
        .catch(err => console.log('Ошибка регистрации Service Worker:', err));
}

// Экспорт функций в глобальную область для onclick handlers
window.initApp = initApp;
window.handleFiles = handleFiles;
window.toggleSound = toggleSound;
window.updateSoundVolume = updateSoundVolume;
window.toggleTrackMenu = toggleTrackMenu;
window.toggleFadeFromMenu = toggleFadeFromMenu;
window.toggleLoopFromMenu = toggleLoopFromMenu;
window.deleteSoundFromMenu = deleteSoundFromMenu;
window.updateMasterVolume = updateMasterVolume;
window.stopAllTracks = stopAllTracks;
window.clearAllStorage = clearAll;
