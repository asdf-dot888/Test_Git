import { createServer, type Server } from "node:http";
import { createApp } from "./app.js";

export function startServer(port = Number(process.env.PORT) || 3001): Server {
  const server = createServer(createApp());
  server.listen(port);
  return server;
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
