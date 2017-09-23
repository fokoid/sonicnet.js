const ALPHABET = '\n abcdefghijklmnopqrstuvwxyz0123456789,.!?@*';
const audioContext = new window.AudioContext || new webkitAudioContext();
/** A ring buffer
 *  @Constructor
 */
const RingBuffer = function(maxLength) {
  this.array = [];
  this.maxLength = maxLength;
}

RingBuffer.prototype.get = function(index) {
  if (index >= this.array.length) {
    return null;
  }
  return this.array[index];
};

RingBuffer.prototype.last = function() {
  if (this.array.length === 0) {
    return null;
  }
  return this.array[this.array.length - 1];
}

RingBuffer.prototype.add = function(value) {
  // Append to the end, remove from the front.
  this.array.push(value);
  if (this.array.length >= this.maxLength) {
    this.array.splice(0, 1);
  }
};

RingBuffer.prototype.length = function() {
  // Return the actual size of the array.
  return this.array.length;
};

RingBuffer.prototype.clear = function() {
  this.array = [];
};

RingBuffer.prototype.copy = function() {
  // Returns a copy of the ring buffer.
  var out = new RingBuffer(this.maxLength);
  out.array = this.array.slice(0);
  return out;
};

RingBuffer.prototype.remove = function(index, length) {
  //console.log('Removing', index, 'through', index+length);
  this.array.splice(index, length);
};
/**
 * A simple sonic encoder/decoder for character => frequency (and back).
 * @Constructor
 *
 * @param {object}    [params={}] - contains configuration for codec
 * @param {integer}   [params.freqMin=18500] -  minimum listening frequency
 * @param {integer}   [params.freqMax=19500] - maximum listening frequency
 * @param {integer}   [params.freqError=50]  - maximum tolerance allowed outside range [freqMin, freqMax]
 * @param {character} [params.startChar='^'] - the special start symbol, signals transmission start
 * @param {character} [params.nullChar='~']  - the special null symbol, passed in case of an error
 * @param {character} [params.endChar='$']   - the special end symbol, signals transmission end
 * @param {string}    [params.alphabetString]- the user defined charset for transmission, as a string
 *
 */
const SonicCodec = function(params) {
  params = params || {};
  this.freqMin = params.freqMin || 18500;
  this.freqMax = params.freqMax || 19500;
  this.freqError = params.freqError || 50;
  this.alphabetString = params.alphabet || ALPHABET;
  this.startChar = params.startChar || '^';
  this.nullChar = params.nullChar || '~';
  this.endChar = params.endChar || '$';
  // add start, null and end chars to alphabet
  // it's fine if these characters are also in user alphabet:
  // all the system really cares about is the index in the alphabet string
  this.alphabet = this.startChar
    + this.nullChar
    + this.alphabetString
    + this.endChar;
}

/**
 * Get difference between minimum and maximum frequencies.
 */
SonicCodec.prototype.freqRange = function() {
  return this.freqMax - this.freqMin;
}

/**
 * Given a character, convert to the corresponding frequency.
 */
SonicCodec.prototype.charToFreq = function(chr) {
  // Get the index of the character.
  let index = this.alphabet.indexOf(chr);
  if (index === -1) {
    // If this character isn't in the alphabet:
    // * report error in console
    // * send null char (which will be omitted by receiver)
    console.error(chr, 'is an invalid character.');
    index = 1
  }
  // Convert from index to frequency.
  const percent = index / this.alphabet.length,
        freqOffset = Math.round(this.freqRange() * percent);
  return this.freqMin + freqOffset;
};

/**
 * Given a frequency, convert to the corresponding character.
 */
SonicCodec.prototype.freqToChar = function(freq) {
  // If the frequency is out of the range.
  if (!(this.freqMin < freq && freq < this.freqMax)) {
    // If it's close enough to the min, clamp it (and same for max).
    if (this.freqMin - freq < this.freqError) {
      freq = this.freqMin;
    } else if (freq - this.freqMax < this.freqError) {
      freq = this.freqMax;
    } else {
      // Otherwise, report error.
      console.error(freq, 'is out of range.');
      return null;
    }
  }
  // Convert frequency to index to char.
  const percent = (freq - this.freqMin) / this.freqRange(),
        index = Math.round(this.alphabet.length * percent);
  return this.alphabet[index];
};
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
  this.charDuration = params.charDuration || 0.2;
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
  // Use WAAPI to schedule the frequencies.
  /* replaced by forEach: to be deleted
   * for (let i = 0; i < input.length; ++i) {
    const chr = input[i];
    const freq = this.coder.charToFreq(chr);
    const time = audioContext.currentTime + this.charDuration * i;
    this.scheduleToneAt(freq, time, this.charDuration);
  }
  */
  input.split('').forEach((chr, i) => {
    const freq = this.codec.charToFreq(chr),
          time = audioContext.currentTime + this.charDuration * i;
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
  const osc = audioContext.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;

  // GainNode will smoothly increase volume 0 -> max -> 0
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + this.rampDuration);
  gainNode.gain.setValueAtTime(1, startTime + duration - this.rampDuration);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  // create audio graph
  // Oscillator -> Volume Control -> Output
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // schedule playback
  osc.start(startTime);
};
/**
 * Extracts meaning from audio streams.
 *
 * (assumes audioContext is an AudioContext global variable.)
 *
 * 1. Listen to the microphone.
 * 2. Do an FFT on the input.
 * 3. Extract frequency peaks in the ultrasonic range.
 * 4. Keep track of frequency peak history in a ring buffer.
 * 5. Call back when a peak comes up often enough.
 * @Constructor
 * @param {object} [params = {}] - configuration parameters
 *
 */
const SonicReceiver = function(params) {
  params = params || {};
  this.peakThreshold = params.peakThreshold || -65;
  this.minRunLength = params.minRunLength || 2;
  this.coder = params.coder || new SonicCodec(params);
  // How long (in ms) to wait for the next character.
  this.timeout = params.timeout || 300;
  this.debug = !!params.debug;

  this.peakHistory = new RingBuffer(16);
  this.peakTimes = new RingBuffer(16);

  this.callbacks = {};

  this.buffer = '';
  this.state = State.IDLE;
  this.isRunning = false;
  this.iteration = 0;
}

var State = {
  IDLE: 1,
  RECV: 2
};

/**
 * Start processing the audio stream.
 */
SonicReceiver.prototype.start = function() {
  // Start listening for microphone. Continue init in onStream.
  var constraints = {
    audio: { optional: [{ echoCancellation: false }] }
  };
  navigator.webkitGetUserMedia(constraints,
      this.onStream_.bind(this), this.onStreamError_.bind(this));
};

/**
 * Stop processing the audio stream.
 */
SonicReceiver.prototype.stop = function() {
  this.isRunning = false;
  this.track.stop();
};

SonicReceiver.prototype.on = function(event, callback) {
  if (event == 'message') {
    this.callbacks.message = callback;
  }
  if (event == 'character') {
    this.callbacks.character = callback;
  }
};

SonicReceiver.prototype.setDebug = function(value) {
  this.debug = value;

  var canvas = document.querySelector('canvas');
  if (canvas) {
    // Remove it.
    canvas.parentElement.removeChild(canvas);
  }
};

SonicReceiver.prototype.fire_ = function(callback, arg) {
  if (typeof(callback) === 'function') {
    callback(arg);
  }
};

SonicReceiver.prototype.onStream_ = function(stream) {
  // Store MediaStreamTrack for stopping later. MediaStream.stop() is deprecated
  // See https://developers.google.com/web/updates/2015/07/mediastream-deprecations?hl=en
  this.track = stream.getTracks()[0];

  // Setup audio graph.
  var input = audioContext.createMediaStreamSource(stream);
  var analyser = audioContext.createAnalyser();
  input.connect(analyser);
  // Create the frequency array.
  this.freqs = new Float32Array(analyser.frequencyBinCount);
  // Save the analyser for later.
  this.analyser = analyser;
  this.isRunning = true;
  // Do an FFT and check for inaudible peaks.
  this.raf_(this.loop.bind(this));
};

SonicReceiver.prototype.onStreamError_ = function(e) {
  console.error('Audio input error:', e);
};

/**
 * Given an FFT frequency analysis, return the peak frequency in a frequency
 * range.
 */
SonicReceiver.prototype.getPeakFrequency = function() {
  // Find where to start.
  var start = this.freqToIndex(this.coder.freqMin);
  // TODO: use first derivative to find the peaks, and then find the largest peak.
  // Just do a max over the set.
  var max = -Infinity;
  var index = -1;
  for (var i = start; i < this.freqs.length; i++) {
    if (this.freqs[i] > max) {
      max = this.freqs[i];
      index = i;
    }
  }
  // Only care about sufficiently tall peaks.
  if (max > this.peakThreshold) {
    return this.indexToFreq(index);
  }
  return null;
};

SonicReceiver.prototype.loop = function() {
  this.analyser.getFloatFrequencyData(this.freqs);
  // Sanity check the peaks every 5 seconds.
  if ((this.iteration + 1) % (60 * 5) == 0) {
    this.restartServerIfSanityCheckFails();
  }
  // Calculate peaks, and add them to history.
  var freq = this.getPeakFrequency();
  if (freq) {
    var char = this.coder.freqToChar(freq);
    // DEBUG ONLY: Output the transcribed char.
    if (this.debug) {
      console.log('Transcribed char: ' + char);
    }
    this.peakHistory.add(char);
    this.peakTimes.add(new Date());
  } else {
    // If no character was detected, see if we've timed out.
    var lastPeakTime = this.peakTimes.last();
    if (lastPeakTime && new Date() - lastPeakTime > this.timeout) {
      // Last detection was over 300ms ago.
      this.state = State.IDLE;
      if (this.debug) {
        console.log('Token', this.buffer, 'timed out');
      }
      this.peakTimes.clear();
    }
  }
  // Analyse the peak history.
  this.analysePeaks();
  // DEBUG ONLY: Draw the frequency response graph.
  if (this.debug) {
    this.debugDraw_();
  }
  if (this.isRunning) {
    this.raf_(this.loop.bind(this));
  }
  this.iteration += 1;
};

SonicReceiver.prototype.indexToFreq = function(index) {
  var nyquist = audioContext.sampleRate/2;
  return nyquist/this.freqs.length * index;
};

SonicReceiver.prototype.freqToIndex = function(frequency) {
  var nyquist = audioContext.sampleRate/2;
  return Math.round(frequency/nyquist * this.freqs.length);
};

/**
 * Analyses the peak history to find true peaks (repeated over several frames).
 */
SonicReceiver.prototype.analysePeaks = function() {
  // Look for runs of repeated characters.
  var char = this.getLastRun();
  if (!char) {
    return;
  }
  if (this.state == State.IDLE) {
    // If idle, look for start character to go into recv mode.
    if (char == this.coder.startChar) {
      this.buffer = '';
      this.state = State.RECV;
    }
  } else if (this.state == State.RECV) {
    // If receiving, look for character changes.
    if (char != this.lastChar &&
        char != this.coder.startChar && char != this.coder.endChar) {
      this.buffer += char;
      this.lastChar = char;
      this.fire_(this.callbacks.character, char);
    }
    // Also look for the end character to go into idle mode.
    if (char == this.coder.endChar) {
      this.state = State.IDLE;
      this.fire_(this.callbacks.message, this.buffer);
      this.buffer = '';
    }
  }
};

SonicReceiver.prototype.getLastRun = function() {
  var lastChar = this.peakHistory.last();
  var runLength = 0;
  // Look at the peakHistory array for patterns like ajdlfhlkjxxxxxx$.
  for (var i = this.peakHistory.length() - 2; i >= 0; i--) {
    var char = this.peakHistory.get(i);
    if (char == lastChar) {
      runLength += 1;
    } else {
      break;
    }
  }
  if (runLength > this.minRunLength) {
    // Remove it from the buffer.
    this.peakHistory.remove(i + 1, runLength + 1);
    return lastChar;
  }
  return null;
};

/**
 * DEBUG ONLY.
 */
SonicReceiver.prototype.debugDraw_ = function() {
  var canvas = document.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  }
  canvas.width = document.body.offsetWidth;
  canvas.height = 480;
  drawContext = canvas.getContext('2d');
  // Plot the frequency data.
  for (var i = 0; i < this.freqs.length; i++) {
    var value = this.freqs[i];
    // Transform this value (in db?) into something that can be plotted.
    var height = value + 400;
    var offset = canvas.height - height - 1;
    var barWidth = canvas.width/this.freqs.length;
    drawContext.fillStyle = 'black';
    drawContext.fillRect(i * barWidth, offset, 1, 1);
  }
};

/**
 * A request animation frame shortcut. This one is intended to work even in
 * background pages of an extension.
 */
SonicReceiver.prototype.raf_ = function(callback) {
  var isCrx = !!(window.chrome && chrome.extension);
  if (isCrx) {
    setTimeout(callback, 1000/60);
  } else {
    requestAnimationFrame(callback);
  }
};

SonicReceiver.prototype.restartServerIfSanityCheckFails = function() {
  // Strange state 1: peaks gradually get quieter and quieter until they
  // stabilize around -800.
  if (this.freqs[0] < -300) {
    console.error('freqs[0] < -300. Restarting.');
    this.restart();
    return;
  }
  // Strange state 2: all of the peaks are -100. Check just the first few.
  var isValid = true;
  for (var i = 0; i < 10; i++) {
    if (this.freqs[i] == -100) {
      isValid = false;
    }
  }
  if (!isValid) {
    console.error('freqs[0:10] == -100. Restarting.');
    this.restart();
  }
}

SonicReceiver.prototype.restart = function() {
  //this.stop();
  //this.start();
  //window.location.reload();
};
