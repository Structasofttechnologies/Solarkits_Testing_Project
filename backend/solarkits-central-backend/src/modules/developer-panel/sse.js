const clients = new Set();

function sendEvent(data) {
  for (const res of clients) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

module.exports = { clients, sendEvent };
