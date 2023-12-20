import { Assistant } from "./assistant.js";
import { assistantConfig } from "./assistantConfig.js";
import { VoiceInput } from "./voiceInput.js";
import { World } from "./world.js";
import * as test from "./test.js";
import * as chat from "./chat.js";


export class App {
    constructor() {

        // Risky but cool way to get the API key from the URL

        const urlParams = new URLSearchParams(window.location.search);

        this.testMode = urlParams.get('testMode') || 0;

        this.apiKey = urlParams.get('apiKey');

        if (!this.apiKey) {
            this.waitForKey();
        } else {
            this.main();
        }

        const container = document.getElementById('output');

        container.addEventListener('click', function (event) {
            // Check if the clicked element has the 'collapsible' class
            if (event.target.classList.contains('collapsible')) {
                // Toggle the 'active' class
                event.target.classList.toggle('active');
                var content = event.target.nextElementSibling;

                // Toggle the max height
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            }
        });
    }


    async runText(text) {
        chat.log(text, "user-input");
        await this.assistant.addMessage(text);
        await this.assistant.runAssistant();

        // Poll until the response is complete
        await this.assistant.pollStatusUntilComplete(this.world);

        // Continue with the rest of the process
        const response3 = await this.assistant.getResponses();
        console.log(response3);
        chat.log("" + response3.data[0].content[0].text.value, "ai-output");
    }

    async test() {
        console.log("Test");
        if (this.testMode == 1) {
            chat.log("ai-debug", "ai-debug");
            chat.log("ai-info", "ai-info");
            chat.log("ai-warning", "ai-warning");
            chat.log("ai-error", "ai-error");
            chat.log("user-input", "user-input");
            chat.log("ai-output", "ai-output");
            chat.log("tool-info", "tool-info");
            for (let i = 0; i < test.calls.length; i++) {
                this.assistant.runToolCall(test.calls[i], this.world);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (this.testMode == 2) {
            setTimeout(async () => {
                for (let i = 0; i < test.prompts.length; i++) {
                    await this.runText(test.prompts[i]);
                    await new Promise(r => setTimeout(r, 500));
                }
            }, 1000);
        }
    }

    async main() {
        this.world = new World();

        // this.assistant = await new Assistant(this.apiKey, assistantConfig);
        // await this.assistant.createAssistant();
        await this.assistant.createThread();

        this.voiceInput = await new VoiceInput(this.apiKey);

        this.world.onSelectStart = async () => {
            chat.log("Recording 🎙️");
            this.voiceInput.startRecording();
        }

        this.world.onSelectEnd = async () => {
            chat.log("Recording stopped");
            this.voiceInput.stopRecording();
        }

        this.voiceInput.action = async (text) => {
            this.runText(text);
        };

        chat.log("Hold mic button to speak to me<br>e.g. 'Build a snowman'");
        if (this.testMode > 0) this.test("");
    }

async waitForKey() {
      
                document.getElementById('apiKeyForm').addEventListener('submit', async function(event) {
                    event.preventDefault(); // Prevents the default form submit action (page reload)
                    this.apiKey = document.getElementById('apiKeyInput').value;
                    document.getElementById('apiKeyInput').value = " ";
                    this.assistant = await new Assistant(this.apiKey, assistantConfig);
                    let response = await this.assistant.createAssistant();
                    if (response.error) {
                        chat.log("OpenAI API key failed", "ai-error");
                    }
                    else {
                        this.main();
                    }
                  
                }.bind(this))


}
}

