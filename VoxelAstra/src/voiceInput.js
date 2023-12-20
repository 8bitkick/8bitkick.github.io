import * as chat from "./chat.js";

export class VoiceInput {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.action = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const recordButton = document.getElementById('recordButton');
        if (recordButton) {
            recordButton.addEventListener('pointerdown', () => this.startRecording());
            recordButton.addEventListener('pointerup', () => this.stopRecording());
        } else {
            chat.log("Record button not found.", "red");
        }
    }

async startRecording() {
    //chat.log("Requesting microphone access...", "green");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
     // chat.log("Microphone access granted. Listening...", "green");
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = event => {
            this.audioChunks.push(event.data);
        };
        this.mediaRecorder.start();
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            chat.log("Microphone access denied by user or system.", "red");
        } else if (error.name === 'NotFoundError') {
            chat.log("No microphone detected.", "red");
        } else if (error.message.includes('shutdown')) {
            chat.log("Microphone access failed due to shutdown. Please ensure the device is active and try again.", "red");
        } else {
            chat.log("Error accessing microphone: " + error.message, "red");
        }
        console.error("Error accessing audio device:", error);
    }
}


    async stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
            this.mediaRecorder.stop();
            //chat.log("Processing recording...", "green");

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play(); // Playback for testing

                try {
                    await this.sendData(audioBlob);
                } catch (error) {
                    console.error("Error sending audio:", error);
                }
                this.audioChunks = [];
            };
        } else {
            chat.log("No recording in progress.", "red");
        }
    }

    async sendData(audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.mp3");
        formData.append("model", "whisper-1");

        try {
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API response error: ${response.status}`);
            }

            const data = await response.json();

            if (typeof data.text !== 'undefined') {
                this.action(data.text);
            } else {
                chat.log("No transcribed text received.", "red");
            }

        } catch (error) {
            console.error("Audio transcription error:", error);
            chat.log("Error in audio processing: " + error.message, "red");
        }
    }
}
