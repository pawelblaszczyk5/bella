import { createServerFileRoute } from "@tanstack/react-start/server";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, n/no-process-env -- that's temporary solution
const ELECTRIC_BASE_URL = process.env["ELECTRIC_BASE_URL"]!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, n/no-process-env -- that's temporary solution
const ELECTRIC_SECRET = process.env["ELECTRIC_SECRET"]!;

const serve = async ({ request }: { request: Request }) => {
	const url = new URL(request.url);
	const originUrl = new URL("/v1/shape", ELECTRIC_BASE_URL);

	url.searchParams.forEach((value, key) => {
		// Pass through the Electric protocol query parameters.
		if (["cursor", "handle", "live", "offset"].includes(key)) {
			originUrl.searchParams.set(key, value);
		}
	});

	originUrl.searchParams.set("table", "message");
	originUrl.searchParams.set("secret", ELECTRIC_SECRET);

	const response = await fetch(originUrl);
	const headers = new Headers(response.headers);

	headers.delete("content-encoding");
	headers.delete("content-length");

	return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

export const ServerRoute = createServerFileRoute("/api/messages").methods({ GET: serve });
