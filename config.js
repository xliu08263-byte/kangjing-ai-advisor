window.APP_CONFIG = {
  // 推荐：用后端代理保存大模型 API Key，前端只填代理地址。
  // 本地代理示例：node model-proxy-example.js
  // modelProxyUrl: "http://127.0.0.1:8787/api/ai-report",
  modelProxyUrl: "",

  // 仅本地演示可用：直接从浏览器调用 OpenAI-compatible 接口会暴露 API Key，
  // 发布到公网时不要把真实 Key 写在这里。
  modelApiUrl: "",
  modelApiKey: "",
  modelName: "",
  modelTemperature: 0.25,

  // 如果模型支持图片/视觉能力，保持 true，页面会把上传图片压缩后一起发给大模型。
  // 如果使用纯文本模型，请改成 false。
  sendImagesToModel: true,
  modelImageMaxSize: 960,
  modelImageQuality: 0.78,
};
