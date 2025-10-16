const readline = require("node:readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer));
    });
};

(async () => {
    while(true) {
        const input = await ask(`Hello: `);
        console.log(`Hello ${input}`); 
    }
})();