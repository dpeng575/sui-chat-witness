(function(){console.log("Sui-Seal content script loaded on:",window.location.href);function e(){const o=window.location.hostname;return o.includes("chat.openai.com")?"ChatGPT":o.includes("claude.ai")?"Claude":o.includes("gemini.google.com")?"Gemini":o.includes("kimi.moonshot.cn")?"Kimi":null}const n=e();n&&console.log(`Detected platform: ${n}`);
})()
