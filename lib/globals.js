const ALPHABET = '\n abcdefghijklmnopqrstuvwxyz0123456789,.!?@#*';
const audioContext = new window.AudioContext || new webkitAudioContext();

const removeDuplicates = (charArray, repeatChar = '#') => {
  for (let i=1; i<charArray.length; ++i) {
    if (charArray[i-1] === charArray[i]) {
      charArray[i] = repeatChar;
    }
  }
  return charArray;
};

const removeCapitals = (charArray, capitalChar = '@') => {
  for (let i=0; i<charArray.length; ++i) {
    if (isUpperCase(charArray[i]) === true) {
      charArray[i] = charArray[i].toLowerCase();
      charArray.splice(i, 0, capitalChar)
    }
  }
  return charArray;
};

const restoreDuplicates = (charArray, repeatChar = '#') => {
  for (let i=1; i<charArray.length; ++i) {
    if (charArray[i] === repeatChar) {
      charArray[i] = charArray[i-1];
    }
  }
  return charArray;
};

const restoreCapitals = (charArray, capitalChar = '@') => {
  for (let i=0; i<charArray.length; ++i) {
    if (charArray[i] == capitalChar) {
      charArray[i+1] = charArray[i+1].toUpperCase();
      charArray.splice(i,1);
      i--;
    }
  }
  return charArray;
}

const isUpperCase = char => {
  if(char.toLowerCase() != char)
    return true;
  else
    return false;
}

module.exports = {
  ALPHABET,
  audioContext,
  removeDuplicates,
  restoreDuplicates,
  removeCapitals,
  restoreCapitals
};
