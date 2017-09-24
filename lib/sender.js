const Globals = require('./globals.js'),
      SonicCodec = require('./codec.js');

/**
 * Encodes text as audio streams.
 *
 * 1. Receives a string of text.
 * 2. Creates an oscillator.
 * 3. Converts characters into frequencies.
 * 4. Transmits frequencies, waiting in between appropriately.
 * @Constructor
 * @param {object} [params = {}] - configuration parameters
 * @param {number} [params.charDuration=0.2]    - length in second of each tone
 * @param {number} [params.rampDuration=0.001]  - ?
 * @param {obj}    [codec]                      - custom sonic codec (generally not needed)
 *
 */
const SonicSender = function(params) {
  params = params || {};
  this.charDuration = params.charDuration || 0.5;
  this.rampDuration = params.rampDuration || 0.001;
  this.codec = params.codec || new SonicCodec(params);
}

/**
 * Send string over soundwaves.
 *
 * @param {string}    input     - the string to send
 * @param {function} [callback] - optional callcack called when transmission is (approximately) complete
 *
 */
SonicSender.prototype.send = function(input, callback) {
  // Surround the word with start and end characters.
  input = this.codec.startChar + input + this.codec.endChar;
  console.log(`Sending "${input}" over soundwaves.`)
  // handle duplicate characters
  Globals.removeCapitals(Globals.removeDuplicates(input.split(''))).forEach((chr, i) => {
  // Use WAAPI to schedule the frequencies.
    const freq = this.codec.charToFreq(chr),
          time = Globals.audioContext.currentTime + this.charDuration * i;
    console.log(`Character ${chr} (frequency ${freq}Hz) at time ${time}.`);
    this.scheduleToneAt(freq, time, this.charDuration);
  });

  // If specified, callback after roughly the amount of time it would have
  // taken to transmit the token.
  if (callback) {
    const totalTime = this.charDuration * input.length;
    setTimeout(callback, totalTime * 1000);
  }
};

/**
 * Schedule a tone to be played
 *
 * @param {integer} freq      - the frequency of the tone
 * @param {integer} startTime - the time at which to schedule (since AudioContext was created)
 * @param {integer} duration  - the length of the tone
 *
 */
SonicSender.prototype.scheduleToneAt = function(freq, startTime, duration) {
  // Oscillator generates the tone itself
  const osc = Globals.audioContext.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;

  // GainNode will smoothly increase volume 0 -> max -> 0
  const gainNode = Globals.audioContext.createGain();
  gainNode.gain.value = 0;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + this.rampDuration);
  gainNode.gain.setValueAtTime(1, startTime + duration - this.rampDuration);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  // create audio graph
  // Oscillator -> Volume Control -> Output
  osc.connect(gainNode);
  gainNode.connect(Globals.audioContext.destination);

  // schedule playback
  osc.start(startTime);
};

module.exports = SonicSender;
