process.stdin.on("data", (data: Buffer): void => {
	process.stdout.write(data.toString());
});

setInterval((): void => {});