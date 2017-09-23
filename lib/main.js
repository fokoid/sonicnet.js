const Codec = require('./codec.js'),
      Sender = require('./sender.js'),
      Receiver = require('./receiver.js');

module.exports = {
  Codec: SonicCodec,
  Sender: SonicSender,
  Receiver: SonicReceiver
};
