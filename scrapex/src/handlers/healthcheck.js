/**
 * Express route handler for `GET /health`. Returns a simple text response
 * indicating the server is alive.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export default async function handle(req, res) {
	res.send("Healthy");
}
