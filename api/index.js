// Vercel Serverless Function entrypoint
const server = require('./_server.js');
const app = server.default || server;

module.exports = app;
module.exports.default = app;
