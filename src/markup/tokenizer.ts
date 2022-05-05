import { BBCodeStartToken, BBCodeTag, ITokenizer, Token, WakabamarkStartToken } from '../models/markup';

export class Tokenizer implements ITokenizer {
  protected static readonly _urlPattern =
    'https?:\\/\\/' + // Protocol
    '(?:[^?#@[\\]\\s]+@)?' + // Optional HTTP Basic Auth
    '(?:[^.[\\]\\s-][^?#\\/[\\]\\s]*|\\[[0-9a-f:]+](?::\\d+)?)' + // Hostname or IPv6
    '(?:\\/[^\\/?#[\\]\\s]*)*' + // Path parts
    '(?:\\?[^#[\\]\\s]+)?' + // Optional query
    '(?:#[^[\\]\\s]+)?'; // Optional fragment;

  protected static readonly _tokenPattern =
    '(' +
    '\\[code][\\s\\S]*?\\[\\/code]|' + // Match code tag pair as a single token
    '\\[(?:[bius]|su[pb]|spoiler)]|' + // BBCode start tags
    '\\[color=#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})]|' + // BBCode color start tag
    '\\[size=[1-9]\\d?]|' + // BBCode size start tag
    '\\[\\/(?:[bius]|su[pb]|spoiler|color|size)]|' + // BBCode end tags
    '>>\\d+|^>.*?$|\\*\\*|\\*|%%|~~|\\n|' + // Reflink, quote, WakabaMark tokens, new line
    `${Tokenizer._urlPattern}|` + // Links
    '##\\d{1,2}d\\d{1,4}##' + // Dice
    ')';

  protected static readonly _carriageReturnRegExp = new RegExp('\r', 'g');
  protected static readonly _urlRegExp = new RegExp(Tokenizer._urlPattern, 'ig');
  protected static readonly _tokenRegExp = new RegExp(Tokenizer._tokenPattern, 'img');

  public tokenize(text: string): Token[] {
    text = text.replace(Tokenizer._carriageReturnRegExp, '');

    const tokens = text.split(Tokenizer._tokenRegExp).filter((token) => token.length);
    const openWMTags: string[] = [];
    let result: Token[] = [];
    let index = 0;
    tokens.forEach((token) => {
      let matches: RegExpMatchArray | null = null;
      if (token.match(/^\n$/) !== null) {
        result.push({ type: 'newline', index, text: token });
      } else if ((matches = token.match(/^>>(\d+)$/)) !== null) {
        const postID = +matches[1];

        result.push({ type: 'reflink', index, text: token, postID });
      } else if ((matches = token.match(/^>(.*?)$/)) !== null) {
        const quote = matches[1];

        result.push({ type: 'quote', index, text: token, quote });
      } else if (token.match(/^(\*\*|\*|%%|~~)$/) !== null) {
        const openTagIndex = openWMTags.indexOf(token);
        if (openTagIndex === -1) {
          openWMTags.push(token);
          result.push({ type: 'wm_start', index, text: token });
        } else {
          openWMTags.splice(openTagIndex, 1);
          result.push({ type: 'wm_end', index, text: token });
        }
      } else if ((matches = token.match(/^\[([bius]|su[pb]|spoiler)]$/i)) !== null) {
        const tag = matches[1] as BBCodeTag;

        result.push({ type: 'bb_start', index, text: token, tag });
      } else if ((matches = token.match(/^\[(color)=(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8}))]$/i)) !== null) {
        const tag = matches[1] as BBCodeTag;
        const value = matches[2];

        result.push({ type: 'bb_start', index, text: token, tag, value });
      } else if ((matches = token.match(/^\[(size)=([1-9]\d?)]$/i)) !== null) {
        const tag = matches[1] as BBCodeTag;
        const value = matches[2];

        result.push({ type: 'bb_start', index, text: token, tag, value });
      } else if ((matches = token.match(/^\[\/([bius]|su[pb]|spoiler|color|size)]$/i)) !== null) {
        const tag = matches[1] as BBCodeTag;

        result.push({ type: 'bb_end', index, text: token, tag });
      } else if ((matches = token.match(/^\[code]([\s\S]*?)\[\/code]$/i)) !== null) {
        const tag = 'code';
        const text = matches[1];

        result.push({ type: 'bb_start', index, text: '[code]', tag });
        index++;

        result.push({ type: 'text', index, text });
        index++;

        result.push({ type: 'bb_end', index, text: '[/code]', tag });
      } else if ((matches = token.match(new RegExp(`^(${Tokenizer._urlPattern})$`, 'i'))) !== null) {
        const url = matches[1];

        result.push({ type: 'link', index, text: token, url });
      } else if ((matches = token.match(/^##(\d{1,2})d(\d{1,4})##$/i)) !== null) {
        const count = +matches[1];
        const max = +matches[2];

        result.push({ type: 'dice', index, text: token, count, max });
      } else {
        result.push({ type: 'text', index, text: token });
      }

      index++;
    });

    result = this.convertUnpairedTagsToText(result);

    return this.mergeTokens(result);
  }

  protected convertUnpairedTagsToText(tokens: Token[]): Token[] {
    const openTags: BBCodeStartToken[] = [];
    const openWMTags: WakabamarkStartToken[] = [];
    tokens.forEach((token, index) => {
      switch (token.type) {
        case 'bb_start':
          openTags.push({ ...token, index });
          break;

        case 'bb_end':
          {
            let openTagFound = false;
            for (let i = openTags.length - 1; i >= 0; i--) {
              if (openTags[i].tag === token.tag) {
                openTagFound = true;
                openTags.splice(i, 1);
                break;
              }
            }

            if (!openTagFound) {
              tokens[index] = { type: 'text', index, text: token.text };
            }
          }
          break;

        case 'wm_start':
          openWMTags.push({ ...token, index });
          break;

        case 'wm_end':
          {
            let openTagFound = false;
            for (let i = openWMTags.length - 1; i >= 0; i--) {
              if (openWMTags[i].text === token.text) {
                openTagFound = true;
                openWMTags.splice(i, 1);
                break;
              }
            }

            if (!openTagFound) {
              tokens[index] = { type: 'text', index, text: token.text };
            }
          }
          break;
      }
    });

    openTags.forEach((token) => {
      tokens[token.index] = { type: 'text', index: token.index, text: token.text };
    });

    openWMTags.forEach((token) => {
      tokens[token.index] = { type: 'text', index: token.index, text: token.text };
    });

    return tokens;
  }

  protected mergeTokens(tokens: Token[]): Token[] {
    for (let i = 0; i < tokens.length - 1; i++) {
      const first = tokens[i];
      const second = tokens[i + 1];
      if (first.type === 'text' && second.type === 'text') {
        const text = first.text + second.text;
        const { index } = first;

        tokens[i] = { type: 'text', index, text };
        tokens.splice(i + 1, 1);

        i--;
      }
    }

    return tokens;
  }
}

export default Tokenizer;
