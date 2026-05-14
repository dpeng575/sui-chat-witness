
export function htmlToMarkdown(element: Element): string {
  let markdown = '';

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as Element;
      markdown += processElement(elem);
    }
  }

  return markdown;
}

function processElement(element: Element): string {
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case 'h1':
      return `# ${element.textContent}\n\n`;
    case 'h2':
      return `## ${element.textContent}\n\n`;
    case 'h3':
      return `### ${element.textContent}\n\n`;
    case 'h4':
      return `#### ${element.textContent}\n\n`;
    case 'h5':
      return `##### ${element.textContent}\n\n`;
    case 'h6':
      return `###### ${element.textContent}\n\n`;

    case 'p':
      return `${htmlToMarkdown(element)}\n\n`;

    case 'br':
      return '\n';

    case 'strong':
    case 'b':
      return `**${htmlToMarkdown(element)}**`;

    case 'em':
    case 'i':
      return `*${htmlToMarkdown(element)}*`;

    case 'code':
      return `\`${htmlToMarkdown(element)}\``;

    case 'pre':
      const codeElem = element.querySelector('code');
      const language = codeElem?.getAttribute('data-language') || '';
      const code = codeElem ? codeElem.textContent : element.textContent;
      return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;

    case 'ul':
      let ulMarkdown = '';
      for (const li of element.querySelectorAll(':scope > li')) {
        ulMarkdown += `- ${htmlToMarkdown(li).trim()}\n`;
      }
      return `${ulMarkdown}\n`;

    case 'ol':
      let olMarkdown = '';
      let index = 1;
      for (const li of element.querySelectorAll(':scope > li')) {
        olMarkdown += `${index}. ${htmlToMarkdown(li).trim()}\n`;
        index++;
      }
      return `${olMarkdown}\n`;

    case 'a':
      const href = element.getAttribute('href') || '';
      return `[${htmlToMarkdown(element)}](${href})`;

    case 'img':
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      return `![${alt}](${src})`;

    case 'blockquote':
      const quoted = htmlToMarkdown(element).trim().split('\n').map(line => `> ${line}`).join('\n');
      return `${quoted}\n\n`;

    case 'hr':
      return `---\n\n`;

    case 'table':
      return tableToMarkdown(element);

    case 'div':
    case 'span':
    default:
      return htmlToMarkdown(element);
  }
}

function tableToMarkdown(table: Element): string {
  let markdown = '\n';

  // Get header row
  const thead = table.querySelector('thead');
  const headerRow = thead?.querySelector('tr') || table.querySelector('tr');

  if (headerRow) {
    const headers = Array.from(headerRow.querySelectorAll('th, td'));
    const headerTexts = headers.map(th => htmlToMarkdown(th).trim().replace(/\n/g, ' '));

    if (headerTexts.some(t => t)) {
      markdown += `| ${headerTexts.join(' | ')} |\n`;
      markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
    }
  }

  // Get body rows
  const tbody = table.querySelector('tbody') || table;
  const rows = tbody.querySelectorAll('tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    if (cells.length > 0) {
      const cellTexts = Array.from(cells).map(td => htmlToMarkdown(td).trim().replace(/\n/g, ' '));
      if (cellTexts.some(t => t)) {
        markdown += `| ${cellTexts.join(' | ')} |\n`;
      }
    }
  });

  return `${markdown}\n`;
}

