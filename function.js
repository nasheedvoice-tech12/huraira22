const { onRequest } = require("firebase-functions/v2/https");
const app = require("./dist/server.cjs").app || require("./dist/server.cjs").default || require("./dist/server.cjs");

exports.api = onRequest({ 
  region: "us-central1", 
  memory: "512MiB", 
  maxInstances: 10,
  timeoutSeconds: 60
}, app);
