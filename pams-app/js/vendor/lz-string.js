/*! LZ-String (https://github.com/pieroxy/lz-string/) */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LZString = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const keyStrBase64 =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  const compressToBase64 = (input) => {
    if (input == null) return '';
    let res = LZString._compress(input, 6, (a) => keyStrBase64.charAt(a));
    switch (res.length % 4) {
      default:
      case 0:
        return res;
      case 1:
        return res + '===';
      case 2:
        return res + '==';
      case 3:
        return res + '=';
    }
  };

  const decompressFromBase64 = (input) => {
    if (input == null) return '';
    if (input === '') return null;
    return LZString._decompress(
      input.length,
      32,
      (index) => getBaseValue(keyStrBase64, input.charAt(index))
    );
  };

  const getBaseValue = (alphabet, character) => {
    if (!alphabetMap[alphabet]) {
      alphabetMap[alphabet] = {};
      for (let i = 0; i < alphabet.length; i += 1) {
        alphabetMap[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return alphabetMap[alphabet][character];
  };

  const alphabetMap = {};

  const LZString = {
    compressToBase64,
    decompressFromBase64,
    _compress: (uncompressed, bitsPerChar, getCharFromInt) => {
      if (uncompressed == null) return '';
      let i;
      let value;
      const contextDictionary = {};
      const contextDictionaryToCreate = {};
      let contextC = '';
      let contextW = '';
      let contextEnlargeIn = 2;
      let contextDictSize = 3;
      let contextNumBits = 2;
      const contextData = [];
      let contextDataVal = 0;
      let contextDataPosition = 0;

      for (let ii = 0; ii < uncompressed.length; ii += 1) {
        contextC = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(contextDictionary, contextC)) {
          contextDictionary[contextC] = contextDictSize++;
          contextDictionaryToCreate[contextC] = true;
        }

        const contextWC = contextW + contextC;
        if (Object.prototype.hasOwnProperty.call(contextDictionary, contextWC)) {
          contextW = contextWC;
        } else {
          if (
            Object.prototype.hasOwnProperty.call(
              contextDictionaryToCreate,
              contextW
            )
          ) {
            if (contextW.charCodeAt(0) < 256) {
              for (i = 0; i < contextNumBits; i += 1) {
                contextDataVal <<= 1;
                if (contextDataPosition === bitsPerChar - 1) {
                  contextDataPosition = 0;
                  contextData.push(getCharFromInt(contextDataVal));
                  contextDataVal = 0;
                } else {
                  contextDataPosition += 1;
                }
              }
              value = contextW.charCodeAt(0);
              for (i = 0; i < 8; i += 1) {
                contextDataVal = (contextDataVal << 1) | (value & 1);
                if (contextDataPosition === bitsPerChar - 1) {
                  contextDataPosition = 0;
                  contextData.push(getCharFromInt(contextDataVal));
                  contextDataVal = 0;
                } else {
                  contextDataPosition += 1;
                }
                value >>= 1;
              }
            } else {
              value = 1;
              for (i = 0; i < contextNumBits; i += 1) {
                contextDataVal = (contextDataVal << 1) | value;
                if (contextDataPosition === bitsPerChar - 1) {
                  contextDataPosition = 0;
                  contextData.push(getCharFromInt(contextDataVal));
                  contextDataVal = 0;
                } else {
                  contextDataPosition += 1;
                }
                value = 0;
              }
              value = contextW.charCodeAt(0);
              for (i = 0; i < 16; i += 1) {
                contextDataVal = (contextDataVal << 1) | (value & 1);
                if (contextDataPosition === bitsPerChar - 1) {
                  contextDataPosition = 0;
                  contextData.push(getCharFromInt(contextDataVal));
                  contextDataVal = 0;
                } else {
                  contextDataPosition += 1;
                }
                value >>= 1;
              }
            }
            contextEnlargeIn -= 1;
            if (contextEnlargeIn === 0) {
              contextEnlargeIn = 2 ** contextNumBits;
              contextNumBits += 1;
            }
            delete contextDictionaryToCreate[contextW];
          } else {
            value = contextDictionary[contextW];
            for (i = 0; i < contextNumBits; i += 1) {
              contextDataVal = (contextDataVal << 1) | (value & 1);
              if (contextDataPosition === bitsPerChar - 1) {
                contextDataPosition = 0;
                contextData.push(getCharFromInt(contextDataVal));
                contextDataVal = 0;
              } else {
                contextDataPosition += 1;
              }
              value >>= 1;
            }
          }

          contextEnlargeIn -= 1;
          if (contextEnlargeIn === 0) {
            contextEnlargeIn = 2 ** contextNumBits;
            contextNumBits += 1;
          }
          contextDictionary[contextWC] = contextDictSize++;
          contextW = String(contextC);
        }
      }

      if (contextW !== '') {
        if (
          Object.prototype.hasOwnProperty.call(
            contextDictionaryToCreate,
            contextW
          )
        ) {
          if (contextW.charCodeAt(0) < 256) {
            for (i = 0; i < contextNumBits; i += 1) {
              contextDataVal <<= 1;
              if (contextDataPosition === bitsPerChar - 1) {
                contextDataPosition = 0;
                contextData.push(getCharFromInt(contextDataVal));
                contextDataVal = 0;
              } else {
                contextDataPosition += 1;
              }
            }
            value = contextW.charCodeAt(0);
            for (i = 0; i < 8; i += 1) {
              contextDataVal = (contextDataVal << 1) | (value & 1);
              if (contextDataPosition === bitsPerChar - 1) {
                contextDataPosition = 0;
                contextData.push(getCharFromInt(contextDataVal));
                contextDataVal = 0;
              } else {
                contextDataPosition += 1;
              }
              value >>= 1;
            }
          } else {
            value = 1;
            for (i = 0; i < contextNumBits; i += 1) {
              contextDataVal = (contextDataVal << 1) | value;
              if (contextDataPosition === bitsPerChar - 1) {
                contextDataPosition = 0;
                contextData.push(getCharFromInt(contextDataVal));
                contextDataVal = 0;
              } else {
                contextDataPosition += 1;
              }
              value = 0;
            }
            value = contextW.charCodeAt(0);
            for (i = 0; i < 16; i += 1) {
              contextDataVal = (contextDataVal << 1) | (value & 1);
              if (contextDataPosition === bitsPerChar - 1) {
                contextDataPosition = 0;
                contextData.push(getCharFromInt(contextDataVal));
                contextDataVal = 0;
              } else {
                contextDataPosition += 1;
              }
              value >>= 1;
            }
          }
          contextEnlargeIn -= 1;
          if (contextEnlargeIn === 0) {
            contextEnlargeIn = 2 ** contextNumBits;
            contextNumBits += 1;
          }
          delete contextDictionaryToCreate[contextW];
        } else {
          value = contextDictionary[contextW];
          for (i = 0; i < contextNumBits; i += 1) {
            contextDataVal = (contextDataVal << 1) | (value & 1);
            if (contextDataPosition === bitsPerChar - 1) {
              contextDataPosition = 0;
              contextData.push(getCharFromInt(contextDataVal));
              contextDataVal = 0;
            } else {
              contextDataPosition += 1;
            }
            value >>= 1;
          }
        }
        contextEnlargeIn -= 1;
        if (contextEnlargeIn === 0) {
          contextEnlargeIn = 2 ** contextNumBits;
          contextNumBits += 1;
        }
      }

      value = 2;
      for (i = 0; i < contextNumBits; i += 1) {
        contextDataVal = (contextDataVal << 1) | (value & 1);
        if (contextDataPosition === bitsPerChar - 1) {
          contextDataPosition = 0;
          contextData.push(getCharFromInt(contextDataVal));
          contextDataVal = 0;
        } else {
          contextDataPosition += 1;
        }
        value >>= 1;
      }

      while (true) {
        contextDataVal <<= 1;
        if (contextDataPosition === bitsPerChar - 1) {
          contextData.push(getCharFromInt(contextDataVal));
          break;
        }
        contextDataPosition += 1;
      }
      return contextData.join('');
    },

    _decompress: (length, resetValue, getNextValue) => {
      const dictionary = [];
      let next;
      let enlargeIn = 4;
      let dictSize = 4;
      let numBits = 3;
      const entry = [];
      let result;
      let w;
      let bits;
      let resb;
      let maxpower;
      let power;
      let c;
      let data = { val: getNextValue(0), position: resetValue, index: 1 };

      for (let i = 0; i < 3; i += 1) {
        dictionary[i] = i;
      }

      bits = 0;
      maxpower = 2 ** 2;
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch ((next = bits)) {
        case 0:
          bits = 0;
          maxpower = 2 ** 8;
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = String.fromCharCode(bits);
          break;
        case 1:
          bits = 0;
          maxpower = 2 ** 16;
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = String.fromCharCode(bits);
          break;
        case 2:
          return '';
        default:
          return null;
      }
      dictionary[3] = c;
      w = c;
      result = [c];
      while (true) {
        if (data.index > length) {
          return '';
        }

        bits = 0;
        maxpower = 2 ** numBits;
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch ((c = bits)) {
          case 0:
            bits = 0;
            maxpower = 2 ** 8;
            power = 1;
            while (power !== maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position === 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }

            dictionary[dictSize++] = String.fromCharCode(bits);
            c = dictSize - 1;
            enlargeIn -= 1;
            break;
          case 1:
            bits = 0;
            maxpower = 2 ** 16;
            power = 1;
            while (power !== maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position === 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }

            dictionary[dictSize++] = String.fromCharCode(bits);
            c = dictSize - 1;
            enlargeIn -= 1;
            break;
          case 2:
            return result.join('');
        }

        if (enlargeIn === 0) {
          enlargeIn = 2 ** numBits;
          numBits += 1;
        }

        if (dictionary[c]) {
          entry[0] = dictionary[c];
        } else {
          if (c === dictSize) {
            entry[0] = w + w.charAt(0);
          } else {
            return null;
          }
        }

        result.push(entry[0]);

        dictionary[dictSize++] = w + entry[0].charAt(0);
        enlargeIn -= 1;

        w = entry[0];

        if (enlargeIn === 0) {
          enlargeIn = 2 ** numBits;
          numBits += 1;
        }
      }
    }
  };

  return LZString;
});
