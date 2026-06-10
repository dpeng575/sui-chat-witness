export const locales = ['zh', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export type Dictionary = {
  nav: {
    product: string;
    install: string;
    faq: string;
    dashboard: string;
    signIn: string;
    signOut: string;
  };
  landing: {
    badge: string;
    heroTitle: string;
    heroSubtitle: string;
    primaryCta: string;
    secondaryCta: string;
    valueTitle: string;
    valueItems: string[];
    workflowTitle: string;
    workflowItems: string[];
    platformsTitle: string;
    installTitle: string;
    installSteps: string[];
    faqTitle: string;
    faqs: Array<{ question: string; answer: string }>;
    finalTitle: string;
    finalCta: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    totalRecords: string;
    latestWitness: string;
    platforms: string;
    records: string;
    empty: string;
    refresh: string;
    loadMore: string;
    openTx: string;
    downloadMarkdown: string;
    downloadOriginal: string;
    connectWallet: string;
    decrypting: string;
    missingSealFields: string;
    loginRequired: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  zh: {
    nav: {
      product: '产品',
      install: '安装',
      faq: '常见问题',
      dashboard: '控制台',
      signIn: '登录',
      signOut: '退出',
    },
    landing: {
      badge: 'Sui + Walrus 上的 AI 对话见证层',
      heroTitle: '为每一次 AI 对话生成可信见证',
      heroSubtitle: 'Sui-Seal 自动保存 ChatGPT、Claude、Gemini 和 Kimi 的关键对话，并用 Sui 与 Walrus 留下可验证记录。',
      primaryCta: '安装 Chrome 插件',
      secondaryCta: '查看控制台',
      valueTitle: '为什么需要对话见证',
      valueItems: ['跨平台保存重要 AI 回答', '用链上交易证明内容存在时间', '用 Walrus 保留原文与附件'],
      workflowTitle: '工作流程',
      workflowItems: ['在支持的 AI 平台打开插件', '选择需要保存的对话内容', '生成加密存档、Walrus Blob 和 Sui 见证交易'],
      platformsTitle: '支持 ChatGPT、Claude、Gemini 和 Kimi',
      installTitle: '三步开始',
      installSteps: ['安装浏览器插件', '连接钱包并登录', '在 AI 对话页面点击见证按钮'],
      faqTitle: '常见问题',
      faqs: [
        { question: '会公开我的对话内容吗？', answer: '不会。内容先加密后再上传，链上只保存可验证的见证信息。' },
        { question: '需要自己管理存储吗？', answer: '不需要。插件会处理 Walrus 上传和 Sui 交易流程。' },
        { question: '可以导出记录吗？', answer: '可以。控制台支持下载 Markdown 和原始存档。' },
      ],
      finalTitle: '把重要 AI 对话变成长期可信资产',
      finalCta: '立即开始见证',
    },
    dashboard: {
      title: '见证控制台',
      subtitle: '查看、解密和导出你的 AI 对话见证记录。',
      totalRecords: '总记录数',
      latestWitness: '最新见证',
      platforms: '平台',
      records: '记录',
      empty: '还没有见证记录。',
      refresh: '刷新',
      loadMore: '加载更多',
      openTx: '查看交易',
      downloadMarkdown: '下载 Markdown',
      downloadOriginal: '下载原始文件',
      connectWallet: '连接钱包',
      decrypting: '正在解密...',
      missingSealFields: '缺少 Seal 解密字段，无法打开该记录。',
      loginRequired: '请先登录以查看你的见证记录。',
    },
  },
  en: {
    nav: {
      product: 'Product',
      install: 'Install',
      faq: 'FAQ',
      dashboard: 'Dashboard',
      signIn: 'Sign in',
      signOut: 'Sign out',
    },
    landing: {
      badge: 'AI conversation witness layer on Sui + Walrus',
      heroTitle: 'Create trusted witnesses for your AI conversations',
      heroSubtitle: 'Sui-Seal automatically preserves key conversations from ChatGPT, Claude, Gemini, and Kimi with verifiable records on Sui and Walrus.',
      primaryCta: 'Install Chrome extension',
      secondaryCta: 'Open dashboard',
      valueTitle: 'Why witness conversations',
      valueItems: ['Save important AI answers across platforms', 'Prove when content existed with on-chain transactions', 'Keep source text and attachments on Walrus'],
      workflowTitle: 'Workflow',
      workflowItems: ['Open the extension on a supported AI platform', 'Choose the conversation content to preserve', 'Create an encrypted archive, Walrus blob, and Sui witness transaction'],
      platformsTitle: 'Supports ChatGPT, Claude, Gemini, and Kimi',
      installTitle: 'Start in three steps',
      installSteps: ['Install the browser extension', 'Connect your wallet and sign in', 'Click the witness button on an AI conversation page'],
      faqTitle: 'FAQ',
      faqs: [
        { question: 'Will my conversation be public?', answer: 'No. Content is encrypted before upload, and only verifiable witness metadata is stored on-chain.' },
        { question: 'Do I need to manage storage myself?', answer: 'No. The extension handles Walrus uploads and Sui transactions for you.' },
        { question: 'Can I export records?', answer: 'Yes. The dashboard supports Markdown and original archive downloads.' },
      ],
      finalTitle: 'Turn important AI conversations into durable trusted assets',
      finalCta: 'Start witnessing',
    },
    dashboard: {
      title: 'Witness dashboard',
      subtitle: 'View, decrypt, and export your AI conversation witness records.',
      totalRecords: 'Total records',
      latestWitness: 'Latest witness',
      platforms: 'Platforms',
      records: 'Records',
      empty: 'No witness records yet.',
      refresh: 'Refresh',
      loadMore: 'Load more',
      openTx: 'Open transaction',
      downloadMarkdown: 'Download Markdown',
      downloadOriginal: 'Download original',
      connectWallet: 'Connect wallet',
      decrypting: 'Decrypting...',
      missingSealFields: 'Missing Seal decrypt fields, so this record cannot be opened.',
      loginRequired: 'Sign in first to view your witness records.',
    },
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = nextLocale;
    return `/${segments.join('/')}`;
  }

  if (segments.length === 0) {
    return `/${nextLocale}`;
  }

  return `/${nextLocale}/${segments.join('/')}`;
}
