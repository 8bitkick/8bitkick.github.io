const AI_EMOJI = "🤖";
const USER_EMOJI = "😊";
const TOOL_EMOJI = "🦾";

export function addCollapsableElement(consoleLine, details) {
    // Create the button element
    const output = document.getElementById("output");
    var button = document.createElement('button');
    button.textContent =`${TOOL_EMOJI} ${consoleLine}`;
    button.className = 'collapsible ai-tool';
    const container = document.getElementById("output");
        // Create the content div
        var contentDiv = document.createElement('div');
        contentDiv.className = 'content tool-info';
        contentDiv.innerHTML = `${details}`;
        // Append the button and content div to the container
        container.appendChild(button);
        container.appendChild(contentDiv);

        // Initially hide the content
        contentDiv.style.maxHeight = null;

        output.scrollTop = output.scrollHeight;
}

export function log(text, level = "ai-default", details = "") {

    const output = document.getElementById("output");
    const lastChild = output.lastElementChild;

    if (text.includes("Status") && lastChild && lastChild.innerHTML.includes("Status")){lastChild.innerHTML +=".";return;}
    if (lastChild && lastChild.classList.contains("ai-debug", "ai-info")) lastChild.remove();

    if (details) {
        this.addCollapsableElement(text, details);
        return;
    }

    switch (true) {
        case level.includes("ai-info"):
            output.innerHTML += `<div class="message ${level}">${AI_EMOJI} ${text}</div>`;
        break;
        case level.includes("ai-output"):
                output.innerHTML += `<div class="message ${level}">${AI_EMOJI} ${text}</div>`;
            break;
        case level.includes("user-"):
            output.innerHTML += `<div class="message ${level}">${USER_EMOJI} ${text}</div>`;
            // Handle user-specific logic here
            break;
        case level.includes("ai-tool"):
            output.innerHTML += `<div class="message ${level}">${TOOL_EMOJI} ${text}</div>`;
            break;
        default:
            output.innerHTML += `<div class="message ${level}">${text}</div>`;
            break;
    }


    output.scrollTop = output.scrollHeight;
}