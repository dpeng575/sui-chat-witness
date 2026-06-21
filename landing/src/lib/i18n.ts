export const locales = ['zh', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

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
    valueItems: Array<{ title: string; description: string }>;
    workflowTitle: string;
    workflowItems: Array<{ title: string; description: string }>;
    platformsTitle: string;
    installTitle: string;
    installSteps: string[];
    extensionInstallTitle: string;
    extensionInstallDescription: string;
    extensionInstallSteps: string[];
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
    openTx: string;
    downloadMarkdown: string;
    downloadOriginal: string;
    connectWallet: string;
    decrypting: string;
    missingSealFields: string;
    loginRequired: string;
    tableTitle: string;
    tablePlatform: string;
    tableMessages: string;
    tableCreated: string;
    tableWalrus: string;
    tableTransaction: string;
    tableActions: string;
    previousPage: string;
    nextPage: string;
    loadingPage: string;
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
      heroSubtitle: 'chat-witness 自动保存 ChatGPT、Claude、Gemini 和 Kimi 的关键对话，并用 Sui 与 Walrus 留下可验证记录。',
      primaryCta: '安装 Chrome 插件',
      secondaryCta: '查看控制台',
      valueTitle: '为什么需要对话见证',
      valueItems: [
        { title: '链上可验证', description: '每次存证都会写入 Sui 交易和 Witness Object，便于之后核验。' },
        { title: '内容加密', description: 'Markdown 内容通过 Seal 加密，下载解密需要钱包授权。' },
        { title: '跨平台保存', description: '统一保存主流 AI 对话平台的关键内容和元数据。' },
      ],
      workflowTitle: '工作流程',
      workflowItems: [
        { title: '捕获', description: 'Chrome 插件从当前 AI 对话页面提取消息。' },
        { title: '加密', description: '使用 Seal 对 Markdown 内容加密。' },
        { title: '存储', description: '加密文件上传到 Walrus。' },
        { title: '存证', description: 'Sui 交易记录 hash、平台和 Walrus File ID。' },
      ],
      platformsTitle: '支持 ChatGPT、Claude、Gemini 和 Kimi',
      installTitle: '三步开始',
      installSteps: ['安装浏览器插件', '连接钱包并登录', '在 AI 对话页面点击见证按钮'],
      extensionInstallTitle: '下载插件压缩包后安装',
      extensionInstallDescription: '如果浏览器不会自动安装插件，请下载 zip 文件并通过 Chrome 开发者模式手动加载。',
      extensionInstallSteps: ['下载 chat-witness 插件 zip 压缩包', '解压到本地固定目录，不要直接删除该目录', '打开 Chrome 扩展程序页面并开启开发者模式', '点击“加载已解压的扩展程序”，选择解压后的目录'],
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
      openTx: '查看交易',
      downloadMarkdown: '下载 Markdown',
      downloadOriginal: '下载原始文件',
      connectWallet: '连接钱包',
      decrypting: '正在解密...',
      missingSealFields: '缺少 Seal 解密字段，无法打开该记录。',
      loginRequired: '请先登录以查看你的见证记录。',
      tableTitle: '标题',
      tablePlatform: '平台',
      tableMessages: '消息数',
      tableCreated: '创建时间',
      tableWalrus: 'Walrus',
      tableTransaction: '交易',
      tableActions: '操作',
      previousPage: '上一页',
      nextPage: '下一页',
      loadingPage: '加载中...',
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
      heroSubtitle: 'chat-witness automatically preserves key conversations from ChatGPT, Claude, Gemini, and Kimi with verifiable records on Sui and Walrus.',
      primaryCta: 'Install Chrome extension',
      secondaryCta: 'Open dashboard',
      valueTitle: 'Why witness conversations',
      valueItems: [
        { title: 'Verifiable on-chain', description: 'Every witness creates a Sui transaction and Witness Object for later verification.' },
        { title: 'Encrypted content', description: 'Markdown content is Seal encrypted and requires wallet authorization to decrypt.' },
        { title: 'Cross-platform archive', description: 'Save key content and metadata from major AI conversation platforms.' },
      ],
      workflowTitle: 'Workflow',
      workflowItems: [
        { title: 'Capture', description: 'The Chrome extension extracts messages from the current AI chat page.' },
        { title: 'Encrypt', description: 'Seal encrypts the Markdown conversation.' },
        { title: 'Store', description: 'The encrypted file is uploaded to Walrus.' },
        { title: 'Witness', description: 'A Sui transaction records the hash, platform, and Walrus File ID.' },
      ],
      platformsTitle: 'Supports ChatGPT, Claude, Gemini, and Kimi',
      installTitle: 'Start in three steps',
      installSteps: ['Install the browser extension', 'Connect your wallet and sign in', 'Click the witness button on an AI conversation page'],
      extensionInstallTitle: 'Install after downloading the extension zip',
      extensionInstallDescription: 'If the browser does not install it automatically, download the zip file and load it manually through Chrome developer mode.',
      extensionInstallSteps: ['Download the chat-witness extension zip file', 'Unzip it into a stable local folder and keep that folder', 'Open the Chrome extensions page and enable Developer mode', 'Click “Load unpacked” and select the unzipped folder'],
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
      openTx: 'Open transaction',
      downloadMarkdown: 'Download Markdown',
      downloadOriginal: 'Download original',
      connectWallet: 'Connect wallet',
      decrypting: 'Decrypting...',
      missingSealFields: 'Missing Seal decrypt fields, so this record cannot be opened.',
      loginRequired: 'Sign in first to view your witness records.',
      tableTitle: 'Title',
      tablePlatform: 'Platform',
      tableMessages: 'Messages',
      tableCreated: 'Created',
      tableWalrus: 'Walrus',
      tableTransaction: 'Transaction',
      tableActions: 'Actions',
      previousPage: 'Previous',
      nextPage: 'Next',
      loadingPage: 'Loading...',
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
