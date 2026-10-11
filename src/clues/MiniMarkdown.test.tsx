import { render } from '@testing-library/react';
import { MiniMarkdown } from './MiniMarkdown';

describe('MiniMarkdown', () => {
  it('renders paragraphs, line breaks, bold and italic', () => {
    const { container } = render(<MiniMarkdown text={'Dear **Paul**,\nI *miss* you.\n\nYours'} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].querySelector('strong')?.textContent).toBe('Paul');
    expect(paragraphs[0].querySelector('em')?.textContent).toBe('miss');
    expect(paragraphs[0].querySelectorAll('br')).toHaveLength(1);
    expect(paragraphs[1].textContent).toBe('Yours');
  });

  it('leaves unmatched asterisks as text', () => {
    const { container } = render(<MiniMarkdown text={'5 * 3'} />);
    expect(container.textContent).toBe('5 * 3');
  });
});
