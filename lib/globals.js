const ALPHABET = '\n abcdefghijklmnopqrstuvwxyz0123456789,.!?@*';
const audioContext = new window.AudioContext || new webkitAudioContext();

const removeDuplicates = (charArray, repeatChar) => {
  for (let i=1; i<charArray.length; ++i) {
    if (charArray[i-1] === charArray[i]) {
      charArray[i] = repeatChar;
    }
  }
  return charArray;
};

const restoreDuplicates = (charArray, repeatChar) => {
  for (let i=1; i<charArray.length; ++i) {
    if (charArray[i] === repeatChar) {
      charArray[i] = charArray[i-1];
    }
  }
  return charArray;
};

module.exports = {
  ALPHABET,
  audioContext,
  removeDuplicates,
  restoreDuplicates
};
