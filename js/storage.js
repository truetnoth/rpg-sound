// storage.js - Работа с IndexedDB
let db = null;

// Инициализация IndexedDB
export function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('DnDSoundboardDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('audioFiles')) {
                const objectStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
                objectStore.createIndex('name', 'name', { unique: false });
            }
        };
    });
}

// Сохранение аудиофайла в IndexedDB
export function saveAudioToIndexedDB(id, name, arrayBuffer, metadata) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['audioFiles'], 'readwrite');
        const objectStore = transaction.objectStore('audioFiles');
        
        const data = {
            id: id,
            name: name,
            audioData: arrayBuffer,
            metadata: metadata,
            timestamp: Date.now()
        };
        
        const request = objectStore.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Загрузка аудиофайла из IndexedDB
export function loadAudioFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['audioFiles'], 'readonly');
        const objectStore = transaction.objectStore('audioFiles');
        const request = objectStore.get(id);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result);
            } else {
                reject(new Error('Audio file not found'));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Загрузка всех аудиофайлов из IndexedDB
export function loadAllAudioFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['audioFiles'], 'readonly');
        const objectStore = transaction.objectStore('audioFiles');
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Удаление аудиофайла из IndexedDB
export function deleteAudioFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['audioFiles'], 'readwrite');
        const objectStore = transaction.objectStore('audioFiles');
        const request = objectStore.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Очистка всего хранилища
export function clearAllStorage() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['audioFiles'], 'readwrite');
        const objectStore = transaction.objectStore('audioFiles');
        const request = objectStore.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
