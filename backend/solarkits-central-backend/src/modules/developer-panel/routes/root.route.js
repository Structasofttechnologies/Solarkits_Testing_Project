const express = require('express')
const router = express.Router()

const root_handler = require('../controller/root.handler');
const check_auth = require('../middlewares/check.auth');

require('../task_stream');
const { clients } = require('../sse');

router.get('/user-data', check_auth, root_handler.get_user_data);
router.get('/user-modules', check_auth, root_handler.get_user_modules);

router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ message: 'SSE connection established' })}`);

  clients.add(res);

  const heartbeat = setInterval(() => {
    res.write(`: keep-alive`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    res.end();
  });
});


module.exports = router