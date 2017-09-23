const Globals = require('./globals.js')

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
  this.freqMin = params.freqMin || 18000;
  this.freqMax = params.freqMax || 19500;
  this.freqError = params.freqError || 50;
  this.alphabetString = params.alphabet || Globals.ALPHABET;
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

module.exports = SonicCodec
