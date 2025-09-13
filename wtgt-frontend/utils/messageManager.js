const sendMessage = (input, ws) => {
    const content = input.trim();

    if(content) {
        ws.send(JSON.stringify({type: "message", content: input.value}));
        input.value = "";
    }
};

export {
    sendMessage
};