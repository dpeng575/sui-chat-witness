
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

function getImageSrc(img: Element): string {
  let src = img.getAttribute('src') || '';

  // 如果没有 src，尝试 data-src 或其他懒加载属性
  if (!src) {
    src = img.getAttribute('data-src') || '';
  }
  if (!src) {
    src = img.getAttribute('data-url') || '';
  }
  if (!src) {
    src = img.getAttribute('data-original') || '';
  }

  // 如果是 blob 或 data URL，直接使用
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }

  // 如果是相对路径，转换成绝对路径
  if (src && !src.startsWith('http')) {
    try {
      src = new URL(src, window.location.href).href;
    } catch {
      // 如果转换失败，保留原样
    }
  }

  return src;
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
      const src = getImageSrc(element);
      const alt = element.getAttribute('alt') || '';
      const title = element.getAttribute('title') || '';

      if (src) {
        if (title) {
          return `![${alt}](${src} "${title}")`;
        }
        return `![${alt}](${src})`;
      }
      // 如果找不到 src，尝试处理子元素（有些图片在容器里）
      return htmlToMarkdown(element);

    case 'picture':
      // 处理 picture 标签，找 img
      const img = element.querySelector('img');
      if (img) {
        return processElement(img);
      }
      return htmlToMarkdown(element);

    case 'figure':
      // 处理 figure 标签，提取图片和 caption
      let figureContent = '';
      const figureImg = element.querySelector('img');
      const figcaption = element.querySelector('figcaption');

      if (figureImg) {
        figureContent += processElement(figureImg);
      }
      if (figcaption) {
        figureContent += `\n\n*${figcaption.textContent?.trim() || ''}*\n\n`;
      }
      if (!figureImg && !figcaption) {
        figureContent = htmlToMarkdown(element);
      }
      return figureContent || '';

    case 'blockquote':
      const quoted = htmlToMarkdown(element).trim().split('\n').map(line => `> ${line}`).join('\n');
      return `${quoted}\n\n`;

    case 'hr':
      return `---\n\n`;

    case 'table':
      return tableToMarkdown(element);

    // 处理可能包含图片的容器
    case 'div':
    case 'span':
    default:
      // 如果这个元素看起来只包含图片，专门处理
      const childImgs = element.querySelectorAll('img');
      if (childImgs.length === 1 && !element.textContent?.trim()) {
        return processElement(childImgs[0]) + '\n';
      }
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

