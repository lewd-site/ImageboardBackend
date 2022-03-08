import { IParser, Node, Style, Token } from '../models/markup';

interface OpenSpanBase {
  readonly startIndex: number;
}

type WakabamarkOpenSpan = OpenSpanBase & {
  readonly type: 'wm';
  readonly text: string;
};

type BBCodeOpenSpan = OpenSpanBase & {
  readonly type: 'bb';
  readonly tag: string;
  readonly value?: string;
};

type OpenSpan = WakabamarkOpenSpan | BBCodeOpenSpan;

interface StyleSpan {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly style: Style;
  readonly value?: string;
}

export class Parser implements IParser {
  protected static readonly _textTokenTypes = ['text', 'newline', 'quote', 'reflink', 'link'];

  public parse(tokens: Token[]): Node[] {
    const styleSpans = this.getStyleSpans(tokens);
    const textTokens = tokens.filter((token) => Parser._textTokenTypes.indexOf(token.type) !== -1);

    const nodes = textTokens.map((token) => {
      let node: Node;
      switch (token.type) {
        case 'text':
        default:
          node = { type: 'text', text: token.text };
          break;

        case 'newline':
          node = { type: 'newline' };
          break;

        case 'quote':
          node = { type: 'style', style: 'quote', value: token.quote, children: [{ type: 'text', text: token.text }] };
          break;

        case 'reflink':
          node = { type: 'reflink', postID: token.postID, threadID: token.threadID };
          break;

        case 'link':
          node = { type: 'link', text: token.text, url: token.url, icon: token.icon };
          break;
      }

      const tokenStyleSpans = styleSpans.filter((span) => {
        return token.index >= span.startIndex && token.index <= span.endIndex;
      });

      for (let index = tokenStyleSpans.length - 1; index >= 0; index--) {
        const span = tokenStyleSpans[index];
        node = { type: 'style', style: span.style, value: span.value, children: [node] };
      }

      return node;
    });

    return this.mergeNodes(nodes);
  }

  protected getStyleSpans(tokens: Token[]): StyleSpan[] {
    let spans: StyleSpan[] = [];
    const openSpans: OpenSpan[] = [];
    tokens.forEach((token) => {
      switch (token.type) {
        case 'bb_start':
          openSpans.push({
            type: 'bb',
            startIndex: token.index,
            tag: token.tag,
            value: token.value,
          });
          break;

        case 'bb_end':
          for (let index = openSpans.length - 1; index >= 0; index--) {
            const openSpan = openSpans[index];

            let style: Style;
            if (openSpan.type === 'bb' && openSpan.tag === token.tag) {
              switch (openSpan.tag) {
                case 'b':
                  style = 'bold';
                  break;

                case 'i':
                  style = 'italic';
                  break;

                case 'u':
                  style = 'underline';
                  break;

                case 's':
                  style = 'strike';
                  break;

                case 'sup':
                  style = 'superscript';
                  break;

                case 'sub':
                  style = 'subscript';
                  break;

                case 'spoiler':
                  style = 'spoiler';
                  break;

                case 'code':
                  style = 'code';
                  break;

                case 'color':
                  style = 'color';
                  break;

                case 'size':
                  style = 'size';
                  break;

                default:
                  throw new Error(`Unknown tag: ${openSpan.tag}`);
              }

              spans.push({
                startIndex: openSpan.startIndex,
                endIndex: token.index,
                style,
                value: openSpan.value,
              });

              openSpans.splice(index, 1);
              break;
            }
          }
          break;

        case 'wm_start':
          openSpans.push({
            type: 'wm',
            startIndex: token.index,
            text: token.text,
          });
          break;

        case 'wm_end':
          for (let index = openSpans.length - 1; index >= 0; index--) {
            const openSpan = openSpans[index];

            let style: Style;
            if (openSpan.type === 'wm' && openSpan.text === token.text) {
              switch (openSpan.text) {
                case '**':
                  style = 'bold';
                  break;

                case '*':
                  style = 'italic';
                  break;

                case '~~':
                  style = 'strike';
                  break;

                case '%%':
                  style = 'spoiler';
                  break;

                default:
                  console.log(openSpan);
                  throw new Error(`Unknown tag: ${openSpan.text}`);
              }

              spans.push({
                startIndex: openSpan.startIndex,
                endIndex: token.index,
                style,
              });

              openSpans.splice(index, 1);
              break;
            }
          }
          break;
      }
    });

    spans = this.fixOverlaps(spans);
    spans.sort((first, second) => {
      if (first.startIndex === second.startIndex) {
        return first.endIndex - second.endIndex;
      }

      return first.startIndex - second.startIndex;
    });

    return spans;
  }

  protected fixOverlaps(spans: StyleSpan[]): StyleSpan[] {
    for (let i = 0; i < spans.length - 1; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const first = spans[i];
        const second = spans[j];

        if (
          first.startIndex < second.startIndex &&
          first.endIndex > second.startIndex &&
          first.endIndex < second.endIndex
        ) {
          spans[i] = { ...first, endIndex: second.startIndex };
          spans.push({ ...first, startIndex: second.startIndex });
        } else if (
          second.startIndex > second.startIndex &&
          second.startIndex < first.startIndex &&
          second.endIndex > second.endIndex
        ) {
          spans[j] = { ...second, endIndex: first.endIndex };
          spans.push({ ...second, startIndex: first.endIndex });
        }
      }
    }

    return spans;
  }

  protected mergeNodes(nodes: Node[]): Node[] {
    for (let i = 0; i < nodes.length - 1; i++) {
      const first = nodes[i];
      const second = nodes[i + 1];

      if (
        first.type === 'style' &&
        second.type === 'style' &&
        first.style === second.style &&
        first.value === second.value
      ) {
        const { style, value } = first;
        const children = this.mergeNodes([...first.children, ...second.children]);

        nodes[i] = { type: 'style', style, value, children };
        nodes.splice(i + 1, 1);

        i--;
      } else if (first.type === 'text' && second.type === 'text') {
        const text = first.text + second.text;

        nodes[i] = { type: 'text', text };
        nodes.splice(i + 1, 1);

        i--;
      }
    }

    return nodes;
  }
}

export default Parser;
