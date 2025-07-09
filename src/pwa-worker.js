const uploadedAudioFiles = [];

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);

	// Handle POST to /add-songs
	if (event.request.method === "POST" && url.pathname === "/add-songs") {
		event.respondWith(
			(async () => {
				try {
					const formData = await event.request.formData();
					const audioFiles = formData.getAll("audio");

					// Append files to global array
					for (const file of audioFiles) {
						uploadedAudioFiles.push(file);
					}

					// Redirect back to main page
					return Response.redirect("/", 303);
				} catch (err) {
					console.error("[SW] Failed to parse formData:", err);
					return new Response("Bad Request", { status: 400 });
				}
			})()
		);
		return;
	}

	// Handle GET to /get-uploaded-audio
	if (event.request.method === "GET" && url.pathname === "/get-uploaded-audio") {
		event.respondWith(
			(async () => {
				const files = uploadedAudioFiles.splice(0); // Clear the array after reading
				const serialized = await Promise.all(
					files.map(async (file) => ({
						name: file.name,
						type: file.type,
						size: file.size,
						data: Array.from(new Uint8Array(await file.arrayBuffer())),
					}))
				);

				return new Response(JSON.stringify(serialized), {
					headers: { "Content-Type": "application/json" },
				});
			})()
		);
	}
});
