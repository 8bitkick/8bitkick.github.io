// Inferface with OpenAI assistant from the browser for prototyping
// https://platform.openai.com/docs/assistants/overview
//
// Simplified assuming single thread for now
// TODO: Interruping the assistant before it finishes breaks things. Should cancel old thread and create a new one

const COLOR_FUNC = "ai-tool";
const COLOR_ERROR = "error";

import * as chat from "./chat.js";

export class Assistant {
    constructor(apiKey, config) {
        this.apiKey = apiKey;
        this.config = config;
        this.baseUrl = 'https://api.openai.com/v1';
    }

    async listAssistants() {
        const url = `${this.baseUrl}/assistants`;
        const body = {
            limit: 1000
        };
        const response = await this._get(url, body);
        console.log(response);
        return response;
    }

    async deleteAssistant(assistantId) {
        const url = `${this.baseUrl}/assistants/${assistantId}`;
        const response = await this._delete(url);
        chat.log(`Deleted ${assistantId}`, "ai-debug");
        return response;
    }

    async createAssistant() {
        let existingAssistants = await this.listAssistants();
        if (existingAssistants.error) {
            return {error: "error"};
        }


        chat.log(`\nCleaning old assistants`, "ai-debug");
        for (let i = 0; i < existingAssistants.data.length; i++) {
            if (existingAssistants.data[i].name === this.config.name) {
                await this.deleteAssistant(existingAssistants.data[i].id);
            }
        }

        const url = `${this.baseUrl}/assistants`;
        const body = {
            instructions: this.config.instructions,
            name: this.config.name,
            tools: this.config.tools,
            model: this.config.model
        };

        const response = await this._post(url, body);
        this.assistantId = response.id;
        // set this text in DOM element console-title
        chat.log(`${this.config.model} READY`, "ai-output");
        return response;
    }

    async createThread() {
        const url = `${this.baseUrl}/threads`;
        const response = await this._post(url, {});
        this.threadId = response.id;
        chat.log(`Thread ${this.threadId}`, "ai-debug");

        return await response;
    }

    async addMessage(message) {
        const url = `${this.baseUrl}/threads/${this.threadId}/messages`;
        const body = {
            role: "user",
            content: message
        };

        return await this._post(url, body);
    }

    async runAssistant() {
        const url = `${this.baseUrl}/threads/${this.threadId}/runs`;
        const body = {
            assistant_id: this.assistantId
        };

        const response = await this._post(url, body);
        this.runId = response.id;
        chat.log(`Run created with id ${this.runId}`, "ai-debug");

        return await response;
    }

    async checkRunStatus() {
        const url = `${this.baseUrl}/threads/${this.threadId}/runs/${this.runId}`;
        const response = await this._get(url);
        console.log(response);
        chat.log(`Status ${response.status}`, "ai-debug");
        return await response;
    }

    async submitToolOutputs(output) {
        const url = `${this.baseUrl}/threads/${this.threadId}/runs/${this.runId}/submit_tool_outputs`;
        const body = {
            tool_outputs: output
        };
        return await this._post(url, body);
    }

    async getResponses() {
        const url = `${this.baseUrl}/threads/${this.threadId}/messages`;
        const response = await this._get(url);
        console.log(response);
        // chat.log(`Responses ${response.data.length}`, "ai-debug");
        return response;
    }

    async pollStatusUntilComplete(world) {
        let status = await this.checkRunStatus();

        while (status.status !== "completed") {
            await new Promise(r => setTimeout(r, 1000));
            status = await this.checkRunStatus();
            let tool_outputs = [];

            if (status.status === "requires_action") {
                // Handle required actions
                const tool_calls = status.required_action.submit_tool_outputs.tool_calls;
                for (let i = 0; i < tool_calls.length; i++) {
                    tool_outputs.push(await this.runToolCall(tool_calls[i], world));
                }
                await this.submitToolOutputs(tool_outputs);
            }
        }
        return status;
    }

    outputArgs(params) {
        // Destructure the parameters
        const { objectName, objectType, material, color, scale, position, rotation } = params;

        // Format color, scale, and position
        const colorStr = color ? `color (${color.r},${color.g},${color.b})` : '';
        const scaleStr = scale ? `scale (${scale.x.toFixed(2)},${scale.y.toFixed(2)},${scale.z.toFixed(2)})` : '';
        const positionStr = position ? `position (${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z.toFixed(1)})` : '';
        const rotationStr = rotation ? `rotation (${rotation.x.toFixed(0)},${rotation.y.toFixed(0)},${rotation.z.toFixed(0)})` : '';
        const materialStr = material ? material : '';
        const objectTypeName = objectType ? `${objectType}` : '';

        let outputArray = [materialStr, objectTypeName,colorStr, scaleStr, positionStr, rotationStr];

        outputArray = outputArray.filter(function (el) { return el != ''; });

        return outputArray.join("\n");
    }

    async runToolCall(tool_call, world) {
        const tool_call_id = tool_call.id;
        const tool_function = tool_call.function.name;

        if (!tool_call.function.arguments) {
            chat.log("No arguments provided for " + tool_function, COLOR_ERROR);
            return;
        }

        let args = JSON.parse(tool_call.function.arguments);
        //chat.log("" + tool_function + " " + args.objectName, COLOR_FUNC);

        // Default rotation to 0,0,0 if undefined
        const defaultRotation = { x: 0, y: 0, z: 0 };
        args.rotation = args.rotation || defaultRotation;

        // Convert degrees to radians
        args.rotation.x = args.rotation.x * Math.PI / 180;
        args.rotation.y = args.rotation.y * Math.PI / 180;
        args.rotation.z = args.rotation.z * Math.PI / 180;

        // RUN ACTION HERE
        let output = {};
        switch (tool_function) {
            case "add_object":
                output = world.addObjectWithAnimation(args);//add_object(args);
                chat.log(`Added ${args.objectName}`, "ai-tool", this.outputArgs(args));
                break;
            case "modify_object":
                const newArgs = args.newAttributes;
                newArgs.objectName = args.objectName;
                world.modify_object(newArgs);
                chat.log(`Modified ${args.objectName}`, "ai-tool", this.outputArgs(newArgs));
                output.success = true;
                break;
            case "remove_object":
                world.remove_object(args);
                output.success = true;
                break;
            default:
                chat.log("Function not supported: " + tool_function, COLOR_ERROR);
                output.success = true;
                output.error = "Function not supported: " + tool_function;
                output = {
                    success: false,
                    error: "Function not supported: " + tool_function,
                    description: "Tell the user you couldn't do the action, but you can do these other actions"
                };
                break;
        }
        return { tool_call_id: tool_call_id, output: JSON.stringify(output) };
    }

    async _get(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'OpenAI-Beta': 'assistants=v1'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            return response.json();
        } catch (error) {
            console.log(error);
            // Handle the error here
            return { error: error };
        }
    }

    async _delete(url) {
        return fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'OpenAI-Beta': 'assistants=v1'
            }
        }).then(response => response.json());
    }

    async _post(url, body) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify(body)
        }).then(response => response.json());
    }
}