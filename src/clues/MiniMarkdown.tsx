import { Fragment, type ReactNode } from 'react';

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;

function renderInline(line: string, keyPrefix: string): ReactNode[] {
  return line.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function MiniMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <>
      {paragraphs.map((paragraph, p) => (
        <p key={p}>
          {paragraph.split('\n').map((line, l) => (
            <Fragment key={l}>
              {l > 0 && <br />}
              {renderInline(line, `${p}-${l}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
