export default class MessageManager {
    constructor() {
        this.ws = new WebSocket("ws://localhost:3000");
        this.isOpen = false;

        this.ws.onopen = () => {
            this.isOpen = true;
        };

        this.ws.onclose = () => {
            this.isOpen = false;
            console.warn("WebSocket closed");
        };

        this.ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (this.onMessageCallback) {
                this.onMessageCallback(msg);
            }
        };
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    sendMessage(content) {
        if (this.isOpen && content) {
            this.ws.send(JSON.stringify({ type: "message", content }));
        } else {
            console.warn("WebSocket not open. Message not sent.");
        }
    }
}
