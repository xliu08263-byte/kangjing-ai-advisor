const startButton = document.querySelector("#startScan");
const uploadInputs = document.querySelectorAll(".tongue-file-input");
const selectedFileName = document.querySelector("#selectedFileName");
const tonguePreview = document.querySelector("#tonguePreview");
const tonguePreviewGrid = document.querySelector("#tonguePreviewGrid");
const clearTongueImages = document.querySelector("#clearTongueImages");
const reportStatus = document.querySelector("#reportStatus");
const reportScoreValue = document.querySelector("#reportScoreValue");
const reportScoreLabel = document.querySelector("#reportScoreLabel");
const reportSummary = document.querySelector("#reportSummary");
const reportImageCount = document.querySelector("#reportImageCount");
const reportQuality = document.querySelector("#reportQuality");
const reportLight = document.querySelector("#reportLight");
const reportTone = document.querySelector("#reportTone");
const reportSuggestions = document.querySelector("#reportSuggestions");
const generateAiReport = document.querySelector("#generateAiReport");
const modelReportPanel = document.querySelector("#modelReportPanel");
const modelReportStatus = document.querySelector("#modelReportStatus");
const modelReportContent = document.querySelector("#modelReportContent");
const modelBadge = document.querySelector("#modelBadge");
const intakeForm = document.querySelector("#intakeForm");
const workflowForm = document.querySelector("#workflowForm");
const customerReportView = document.querySelector("#customerReportView");
const advisorReportView = document.querySelector("#advisorReportView");
const reportCover = document.querySelector("#reportCover");
const coverCustomerName = document.querySelector("#coverCustomerName");
const coverCustomerCode = document.querySelector("#coverCustomerCode");
const coverGeneratedAt = document.querySelector("#coverGeneratedAt");
const coverObservationCount = document.querySelector("#coverObservationCount");
const coverFollowUp = document.querySelector("#coverFollowUp");
const reportTabs = document.querySelectorAll("[data-report-view]");
const modelProgressSteps = document.querySelectorAll("#modelProgress [data-step]");
const copyReport = document.querySelector("#copyReport");
const shareReport = document.querySelector("#shareReport");
const printReport = document.querySelector("#printReport");
const reportHistoryList = document.querySelector("#reportHistoryList");
const clearHistory = document.querySelector("#clearHistory");

const maxTongueImages = 3;
const historyStorageKey = "healthTongueReports";
const appConfig = {
  modelProxyUrl: "",
  modelApiUrl: "",
  modelApiKey: "",
  modelName: "",
  modelTemperature: 0.25,
  sendImagesToModel: true,
  modelImageMaxSize: 960,
  modelImageQuality: 0.78,
  ...(window.APP_CONFIG || {}),
};

let tongueImages = [];
let latestModelPayload = null;
let latestReports = {
  activeView: "customer",
  customerText: "",
  advisorText: "",
};
let latestReportData = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percent(value) {
  return `${Math.round(value)}%`;
}

function formatFileSize(bytes) {
  if (!bytes) return "未知";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function classifyQuality(score) {
  if (score >= 82) return "清晰";
  if (score >= 64) return "可用";
  return "建议重拍";
}

function classifyLight(brightness, contrast) {
  if (brightness < 35) return "偏暗";
  if (brightness > 82) return "偏亮";
  if (contrast < 13) return "偏平";
  return "较均匀";
}

function classifyWarmTone(warmRatio) {
  if (warmRatio >= 56) return "偏暖";
  if (warmRatio <= 34) return "偏冷";
  return "自然";
}

function setModelBadge() {
  const ready = Boolean(appConfig.modelProxyUrl || (appConfig.modelApiUrl && appConfig.modelApiKey && appConfig.modelName));
  if (!modelBadge) return;
  modelBadge.textContent = ready ? `大模型已接入${appConfig.modelName ? `：${appConfig.modelName}` : ""}` : "大模型待配置";
  modelBadge.classList.toggle("is-ready", ready);
}

function getFieldValue(id) {
  return document.querySelector(`#${id}`)?.value?.trim() || "";
}

function getCustomerProfile() {
  return {
    customerName: getFieldValue("customerName") || "未命名客户",
    customerCode: getFieldValue("customerCode") || "",
    ageGroup: getFieldValue("ageGroup") || "未填写",
    sleepQuality: getFieldValue("sleepQuality") || "未填写",
    bowelStatus: getFieldValue("bowelStatus") || "未填写",
    waterIntake: getFieldValue("waterIntake") || "未填写",
    dietPreference: getFieldValue("dietPreference") || "未填写",
    stressLevel: getFieldValue("stressLevel") || "未填写",
    customerNotes: getFieldValue("customerNotes") || "未填写",
  };
}

function mergeCustomerProfile(existing = {}, incoming = getCustomerProfile()) {
  const defaults = {
    customerName: "未命名客户",
    customerCode: "",
    ageGroup: "未填写",
    sleepQuality: "未填写",
    bowelStatus: "未填写",
    waterIntake: "未填写",
    dietPreference: "未填写",
    stressLevel: "未填写",
    customerNotes: "未填写",
  };
  return Object.fromEntries(
    Object.keys(defaults).map((key) => {
      const value = incoming[key];
      const fallback = existing[key];
      return [key, value && value !== defaults[key] ? value : fallback || defaults[key]];
    }),
  );
}

function formatProfileLine(profile) {
  return [
    `客户：${profile.customerName}`,
    `编号：${profile.customerCode || "自动生成"}`,
    `年龄段：${profile.ageGroup}`,
    `睡眠：${profile.sleepQuality}`,
    `排便：${profile.bowelStatus}`,
    `饮水：${profile.waterIntake}`,
    `饮食：${profile.dietPreference}`,
    `压力：${profile.stressLevel}`,
    `补充：${profile.customerNotes}`,
  ].join("；");
}

function getServiceWorkflow() {
  return {
    advisorName: getFieldValue("advisorName") || "未填写",
    followUpDate: getFieldValue("followUpDate") || "未设置",
    sessionNotes: getFieldValue("sessionNotes") || "未填写",
  };
}

function mergeServiceWorkflow(existing = {}, incoming = getServiceWorkflow()) {
  const defaults = {
    advisorName: "未填写",
    followUpDate: "未设置",
    sessionNotes: "未填写",
  };
  return Object.fromEntries(
    Object.keys(defaults).map((key) => {
      const value = incoming[key];
      const fallback = existing[key];
      return [key, value && value !== defaults[key] ? value : fallback || defaults[key]];
    }),
  );
}

function formatDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildAutoCustomerCode(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `JK${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function enrichReportMeta(payload) {
  const now = new Date();
  const profile = payload.customerProfile || getCustomerProfile();
  const workflow = payload.serviceWorkflow || getServiceWorkflow();
  const customerCode = profile.customerCode || buildAutoCustomerCode(now);
  payload.customerProfile = {
    ...profile,
    customerCode,
  };
  payload.serviceWorkflow = workflow;
  payload.reportMeta = {
    generatedAt: formatDateTime(now),
    observationCount: `${payload.imageSummary?.length || 0}张图片`,
  };
  return payload;
}

function setModelProgress(activeStep = "", doneSteps = []) {
  modelProgressSteps.forEach((step) => {
    const stepName = step.dataset.step;
    step.classList.toggle("is-active", stepName === activeStep);
    step.classList.toggle("is-done", doneSteps.includes(stepName));
  });
}

function imageToBitmapData(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const data = context.getImageData(0, 0, size, size).data;
      URL.revokeObjectURL(url);
      resolve({ data, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

async function analyzeImageFile(file) {
  const bitmap = await imageToBitmapData(file);
  if (!bitmap) {
    return {
      width: 0,
      height: 0,
      brightness: 0,
      contrast: 0,
      warmRatio: 0,
      qualityScore: 0,
      qualityLabel: "需重拍",
      lightLabel: "未识别",
      toneLabel: "未识别",
      sizeText: formatFileSize(file.size),
    };
  }

  const luminanceValues = [];
  let warmPixels = 0;
  for (let index = 0; index < bitmap.data.length; index += 4) {
    const red = bitmap.data[index];
    const green = bitmap.data[index + 1];
    const blue = bitmap.data[index + 2];
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    luminanceValues.push(luminance);
    if (red > blue + 16 && red > green * 0.82) warmPixels += 1;
  }

  const avgLuminance = average(luminanceValues);
  const variance = average(luminanceValues.map((value) => (value - avgLuminance) ** 2));
  const brightness = clamp((avgLuminance / 255) * 100, 0, 100);
  const contrast = clamp((Math.sqrt(variance) / 70) * 100, 0, 100);
  const warmRatio = clamp((warmPixels / luminanceValues.length) * 100, 0, 100);
  const resolutionScore = clamp((Math.min(bitmap.width, bitmap.height) / 1200) * 100, 35, 100);
  const lightScore = clamp(100 - Math.abs(brightness - 58) * 1.12, 0, 100);
  const contrastScore = clamp(contrast * 1.55, 0, 100);
  const qualityScore = Math.round(resolutionScore * 0.34 + lightScore * 0.34 + contrastScore * 0.32);

  return {
    width: bitmap.width,
    height: bitmap.height,
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    warmRatio: Math.round(warmRatio),
    qualityScore,
    qualityLabel: classifyQuality(qualityScore),
    lightLabel: classifyLight(brightness, contrast),
    toneLabel: classifyWarmTone(warmRatio),
    sizeText: formatFileSize(file.size),
  };
}

function buildModelPayload(imageAnalysis = []) {
  return {
    serviceContext: {
      role: "大健康营养服务顾问",
      focus: "舌象记录、肠道代谢沟通、营养调理随访",
      boundary: "仅作营养服务沟通参考，不作诊断、治疗、用药或疾病判断",
    },
    customerProfile: getCustomerProfile(),
    serviceWorkflow: getServiceWorkflow(),
    imageSummary: imageAnalysis.map((item, index) => ({
      index: index + 1,
      width: item.width,
      height: item.height,
      brightness: item.brightness,
      contrast: item.contrast,
      warmRatio: item.warmRatio,
      qualityScore: item.qualityScore,
      qualityLabel: item.qualityLabel,
      lightLabel: item.lightLabel,
      toneLabel: item.toneLabel,
      sizeText: item.sizeText,
    })),
    outputIntent: "生成客户能看懂、顾问能用于沟通的大健康舌象营养观察报告",
  };
}

function getModelContent(data) {
  return (
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.delta?.content ||
    data?.data?.content ||
    data?.content ||
    data?.message ||
    ""
  );
}

function buildModelPrompt(payload) {
  return `请以一位从事大健康营养服务20年的专业顾问视角，生成一份客户能看懂的“舌象营养观察报告”。

要求：
1. 中文输出，专业、稳妥、易懂，不制造焦虑。
2. 必须明确边界：仅用于大健康营养服务沟通参考，不作诊断、治疗、用药或疾病判断。
3. 不使用“确诊、治疗、治愈、病变”等医疗结论式表达。
4. 请按两个大标题输出：“客户简明版”和“顾问专业版”。
5. 客户简明版要少术语、重行动，包含：这次照片能不能参考、本周先做什么、什么时候需要咨询专业人士。
6. 顾问专业版要包含：图片质量、观察线索、需要补充询问的问题、营养与生活方式沟通建议、复拍与随访建议、专业边界。
7. 如果图片少于2张或清晰度不足，先提示补拍，再给出可参考方向。

图片质量数据：
${JSON.stringify(payload?.imageSummary || [], null, 2)}

服务背景：
${JSON.stringify(payload?.serviceContext || {}, null, 2)}

客户日常状态：
${JSON.stringify(payload?.customerProfile || {}, null, 2)}

顾问服务记录：
${JSON.stringify(payload?.serviceWorkflow || {}, null, 2)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function resizeImageForModel(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const maxSize = Number(appConfig.modelImageMaxSize) || 960;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", Number(appConfig.modelImageQuality) || 0.78));
    };
    image.onerror = async () => {
      URL.revokeObjectURL(url);
      resolve(await readFileAsDataUrl(file));
    };
    image.src = url;
  });
}

async function buildModelImageParts() {
  if (!appConfig.sendImagesToModel || !tongueImages.length) return [];
  const images = await Promise.all(tongueImages.map((item) => resizeImageForModel(item.file)));
  return images.map((url) => ({
    type: "image_url",
    image_url: { url },
  }));
}

async function buildLargeModelRequest(payload) {
  const imageParts = await buildModelImageParts();
  const prompt = buildModelPrompt(payload);
  const request = {
    messages: [
      {
        role: "system",
        content:
          "你是大健康营养服务顾问，擅长把舌象记录、饮食作息和肠道代谢沟通转成客户听得懂的营养服务建议。",
      },
      {
        role: "user",
        content: imageParts.length ? [{ type: "text", text: prompt }, ...imageParts] : prompt,
      },
    ],
    temperature: Number(appConfig.modelTemperature) || 0.25,
  };
  if (appConfig.modelName) request.model = appConfig.modelName;
  return request;
}

function hasProxyModelConfig() {
  return Boolean(appConfig.modelProxyUrl);
}

function hasDirectModelConfig() {
  return Boolean(appConfig.modelApiUrl && appConfig.modelApiKey && appConfig.modelName);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { message: text };
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
  }
  return data;
}

async function requestLargeModelReport(payload) {
  if (hasProxyModelConfig()) {
    const request = await buildLargeModelRequest(payload);
    return fetchJson(appConfig.modelProxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, payload }),
    });
  }
  if (hasDirectModelConfig()) {
    const request = await buildLargeModelRequest(payload);
    return fetchJson(appConfig.modelApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.modelApiKey}`,
      },
      body: JSON.stringify(request),
    });
  }
  return null;
}

function describeAverage(imageSummary, key) {
  return Math.round(average(imageSummary.map((item) => Number(item[key]) || 0)));
}

function buildPersonalizedActions(profile) {
  const actions = [];
  const waterIntake = profile.waterIntake || "";
  const sleepQuality = profile.sleepQuality || "";
  const bowelStatus = profile.bowelStatus || "";
  const dietPreference = profile.dietPreference || "";
  const stressLevel = profile.stressLevel || "";

  if (waterIntake.includes("偏少")) {
    actions.push("把饮水放到本周第一优先级：上午、下午各固定一次补水，并记录到每天总量。");
  }

  if (sleepQuality.includes("入睡慢") || sleepQuality.includes("熬夜")) {
    actions.push("先固定入睡前30分钟的节奏，减少夜间加餐和久看屏幕，连续观察一周。");
  }

  if (bowelStatus.includes("不规律") || bowelStatus.includes("偏干")) {
    actions.push("连续记录排便时间、形态和餐后感受，饮食中增加蔬菜、全谷和适量水分。");
  }

  if (
    dietPreference.includes("外食") ||
    dietPreference.includes("夜宵") ||
    dietPreference.includes("油腻") ||
    dietPreference.includes("甜")
  ) {
    actions.push("晚餐先做减法：少油、少甜、少夜宵，主食和蛋白质保持规律，不做极端控制。");
  }

  if (stressLevel.includes("较高")) {
    actions.push("每天安排10分钟轻运动或放松呼吸，把压力、睡眠和食欲变化一起记录。");
  }

  const defaults = [
    "每天记录饮水量和排便情况，连续记录3-7天。",
    "晚餐尽量清淡，减少夜宵、过甜和过油食物。",
    "固定同一时间复拍一次，用趋势辅助后续沟通。",
  ];

  return [...new Set([...actions, ...defaults])].slice(0, 3);
}

function sectionsToText(title, sections) {
  return [
    title,
    "",
    ...sections.flatMap((section, index) => {
      const lines = [`${index + 1}. ${section.title}`];
      if (section.body) lines.push(section.body);
      if (section.items?.length) {
        lines.push(...section.items.map((item) => `- ${item}`));
      }
      return [...lines, ""];
    }),
  ].join("\n").trim();
}

function buildLocalReportData(payload) {
  const imageSummary = payload?.imageSummary || [];
  const profile = payload?.customerProfile || getCustomerProfile();
  const workflow = payload?.serviceWorkflow || getServiceWorkflow();
  const imageCount = imageSummary.length;
  const avgQuality = describeAverage(imageSummary, "qualityScore");
  const avgBrightness = describeAverage(imageSummary, "brightness");
  const avgContrast = describeAverage(imageSummary, "contrast");
  const avgWarmTone = describeAverage(imageSummary, "warmRatio");
  const qualityLabel = classifyQuality(avgQuality);
  const lightLabel = classifyLight(avgBrightness, avgContrast);
  const toneLabel = classifyWarmTone(avgWarmTone);
  const customerActions = buildPersonalizedActions(profile);
  const imageLines = imageSummary
    .map(
      (item) =>
        `- 图片${item.index}：${item.width}x${item.height}，${item.sizeText}，清晰度${item.qualityScore}分，光线${item.lightLabel}，色调${item.toneLabel}`,
    )
    .join("\n");
  const photoAdvice = [
    imageCount < 2 ? "建议再补1-2张不同角度照片，至少包含舌面正面和舌根方向。" : "",
    avgBrightness < 35 ? "当前图片偏暗，建议移到自然白光处重拍，避免阴影覆盖舌面。" : "",
    avgBrightness > 82 ? "当前图片偏亮，建议关闭强闪光或远离直射强光，保留舌面纹理。" : "",
    avgContrast < 13 ? "当前反差偏低，建议对焦后再拍，保持镜头和口部约一掌距离。" : "",
    avgQuality < 64 ? "当前清晰度不足，建议重拍后再用于客户沟通。" : "",
  ].filter(Boolean);

  const customerSections = [
    {
      title: "本周先做三件事",
      items: customerActions,
    },
    {
      title: "这次照片能不能参考",
      body: `本次读取${imageCount}张图片，整体为“${qualityLabel}”。光线${lightLabel}，色调${toneLabel}。如果后续能固定同一时间、同一光线复拍，更容易看到趋势。`,
    },
    {
      title: "先从日常习惯做调整",
      items: [
        "先保证三餐规律，不急着做复杂调理。",
        "观察饮水、排便、睡眠和餐后感受，这些比单次照片更有参考价值。",
        profile.customerNotes !== "未填写" ? `客户补充：${profile.customerNotes}` : "可以继续补充近期饮食、熬夜、压力或运动情况。",
      ],
    },
    {
      title: "本周可执行建议",
      items: customerActions,
    },
    workflow.followUpDate !== "未设置"
      ? {
          title: "下次复盘时间",
          body: `建议在 ${workflow.followUpDate} 前后复盘饮水、排便、睡眠和复拍图片。`,
        }
      : {
          title: "下次复盘时间",
          body: "建议7天后复盘一次饮水、排便、睡眠和复拍图片。",
        },
    {
      title: "需要说明的边界",
      body: "这份报告用于大健康营养服务沟通参考，不作为诊断、治疗、用药或疾病判断依据。如有持续疼痛、出血、明显白斑或长期不适，应咨询专业人士。",
      boundary: true,
    },
  ];

  const advisorSections = [
    {
      title: "图片质量与基础数据",
      body: `综合清晰度${avgQuality}分（${qualityLabel}），平均亮度${percent(avgBrightness)}，反差${percent(avgContrast)}，暖色比例${percent(avgWarmTone)}，光线${lightLabel}，色调${toneLabel}。`,
      items: imageLines ? imageLines.split("\n").map((line) => line.replace(/^- /, "")) : ["暂无有效图片数据。"],
    },
    {
      title: "客户日常状态",
      body: formatProfileLine(profile),
    },
    {
      title: "顾问沟通记录",
      body: [
        `服务顾问：${workflow.advisorName}`,
        `下次随访：${workflow.followUpDate}`,
        `本次记录：${workflow.sessionNotes}`,
      ].join("；"),
    },
    {
      title: "沟通优先级",
      items: [
        imageCount < 2 ? "优先补拍不同角度图片，再进入正式沟通。" : "图片数量满足基础观察，可进入客户沟通。",
        "先问近3天饮食、饮水、排便、睡眠、压力，不用单独围绕舌象下结论。",
        "建议把客户关注点转成可执行动作：饮水、膳食纤维、规律作息、复拍随访。",
      ],
    },
    {
      title: "复拍与服务动作",
      items: photoAdvice.length
        ? photoAdvice
        : ["当前图片可用于基础沟通。若要更完整，建议补充舌面、舌根、舌下三个角度。"],
    },
    {
      title: "专业边界",
      body: "报告用于营养服务沟通参考，不替代专业医疗诊断。避免使用确诊、治疗、治愈等表达。",
      boundary: true,
    },
  ];

  return {
    customerSections,
    advisorSections,
    customerText: sectionsToText("客户简明版舌象营养观察报告", customerSections),
    advisorText: sectionsToText("顾问专业版舌象营养观察报告", advisorSections),
  };
}

function buildSectionsFromText(content) {
  return [
    {
      title: "大模型报告正文",
      body: content,
    },
    {
      title: "专业边界",
      body: "本报告用于大健康营养服务沟通参考，不作为诊断、治疗、用药或疾病判断依据。",
      boundary: true,
    },
  ];
}

function sliceModelSection(content, startPattern, nextPattern) {
  const start = content.search(startPattern);
  if (start < 0) return "";
  const rest = content.slice(start);
  const next = rest.slice(1).search(nextPattern);
  return next >= 0 ? rest.slice(0, next + 1).trim() : rest.trim();
}

function buildModelReportDataFromContent(content) {
  const customerText = sliceModelSection(content, /客户.{0,6}版/, /顾问.{0,6}版/) || content;
  const advisorText = sliceModelSection(content, /顾问.{0,6}版/, /客户.{0,6}版/) || content;
  return {
    customerSections: buildSectionsFromText(customerText),
    advisorSections: buildSectionsFromText(advisorText),
    customerText,
    advisorText,
  };
}

function renderReportSections(container, sections) {
  container.replaceChildren(
    ...sections.map((section, index) => {
      const details = document.createElement("details");
      details.className = "report-section";
      details.open = index < 2;

      const summary = document.createElement("summary");
      summary.textContent = section.title;
      details.append(summary);

      if (section.body) {
        const paragraph = document.createElement("p");
        paragraph.className = section.boundary ? "boundary-copy" : "";
        paragraph.textContent = section.body;
        details.append(paragraph);
      }

      if (section.items?.length) {
        const list = document.createElement("ul");
        section.items.forEach((item) => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          list.append(listItem);
        });
        details.append(list);
      }

      return details;
    }),
  );
}

function setActiveReportView(view) {
  latestReports.activeView = view;
  reportTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.reportView === view);
  });
  customerReportView.hidden = view !== "customer";
  advisorReportView.hidden = view !== "advisor";
}

function getStoredReports() {
  try {
    const items = JSON.parse(localStorage.getItem(historyStorageKey) || "[]");
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

function setStoredReports(items) {
  try {
    localStorage.setItem(historyStorageKey, JSON.stringify(items.slice(0, 10)));
  } catch (error) {
    modelReportStatus.textContent = "本地历史保存失败，报告仍可复制或打印";
  }
}

function buildHistorySnapshot(reportData, rawText = "") {
  const profile = latestModelPayload?.customerProfile || getCustomerProfile();
  const workflow = latestModelPayload?.serviceWorkflow || getServiceWorkflow();
  const reportMeta = latestModelPayload?.reportMeta || {};
  return {
    id: String(Date.now()),
    savedAt: formatDateTime(),
    customerName: profile.customerName || "未命名客户",
    customerCode: profile.customerCode || "--",
    generatedAt: reportMeta.generatedAt || formatDateTime(),
    followUpDate: workflow.followUpDate || "未设置",
    observationCount: reportMeta.observationCount || `${latestModelPayload?.imageSummary?.length || 0}张图片`,
    reportData,
    rawText: rawText || reportData.advisorText,
    payload: {
      serviceContext: latestModelPayload?.serviceContext || {},
      customerProfile: profile,
      serviceWorkflow: workflow,
      imageSummary: latestModelPayload?.imageSummary || [],
      reportMeta,
      outputIntent: latestModelPayload?.outputIntent || "",
    },
  };
}

function saveReportHistory(reportData, rawText = "") {
  if (!reportHistoryList || !latestModelPayload?.reportMeta) return;
  const snapshot = buildHistorySnapshot(reportData, rawText);
  const existing = getStoredReports();
  setStoredReports([snapshot, ...existing].slice(0, 10));
  renderReportHistory();
}

function renderReportHistory() {
  if (!reportHistoryList) return;
  const items = getStoredReports();
  reportHistoryList.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "暂无历史报告。";
    reportHistoryList.append(empty);
    if (clearHistory) clearHistory.hidden = true;
    return;
  }

  if (clearHistory) clearHistory.hidden = false;
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.customerName || "未命名客户";
    const meta = document.createElement("p");
    meta.textContent = `编号 ${item.customerCode || "--"} · ${item.generatedAt || item.savedAt || "--"} · ${item.observationCount || "--"}`;
    content.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "text-button";
    restoreButton.textContent = "载入";
    restoreButton.addEventListener("click", () => restoreReportHistory(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "text-button danger-action";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => deleteReportHistory(item.id));

    actions.append(restoreButton, deleteButton);
    card.append(content, actions);
    reportHistoryList.append(card);
  });
}

function setFieldValue(id, value = "") {
  const field = document.querySelector(`#${id}`);
  if (!field) return;
  if (field.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  field.value = value === "未填写" || value === "未设置" ? "" : value;
}

function syncFormsFromPayload(payload) {
  const profile = payload?.customerProfile || {};
  const workflow = payload?.serviceWorkflow || {};
  setFieldValue("customerName", profile.customerName);
  setFieldValue("customerCode", profile.customerCode);
  setFieldValue("ageGroup", profile.ageGroup);
  setFieldValue("sleepQuality", profile.sleepQuality);
  setFieldValue("bowelStatus", profile.bowelStatus);
  setFieldValue("waterIntake", profile.waterIntake);
  setFieldValue("dietPreference", profile.dietPreference);
  setFieldValue("stressLevel", profile.stressLevel);
  setFieldValue("customerNotes", profile.customerNotes);
  setFieldValue("advisorName", workflow.advisorName);
  setFieldValue("followUpDate", workflow.followUpDate);
  setFieldValue("sessionNotes", workflow.sessionNotes);
}

function restoreReportHistory(item) {
  latestModelPayload = {
    serviceContext: item.payload?.serviceContext || {},
    customerProfile: item.payload?.customerProfile || {},
    serviceWorkflow: item.payload?.serviceWorkflow || {},
    imageSummary: item.payload?.imageSummary || [],
    reportMeta: item.payload?.reportMeta || {},
    outputIntent: item.payload?.outputIntent || "",
  };
  syncFormsFromPayload(latestModelPayload);
  modelReportPanel.hidden = false;
  modelReportStatus.textContent = "已载入本地历史报告";
  setReportOutput(item.reportData, item.rawText, { save: false });
  modelReportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteReportHistory(id) {
  setStoredReports(getStoredReports().filter((item) => item.id !== id));
  renderReportHistory();
}

function clearReportHistory() {
  setStoredReports([]);
  renderReportHistory();
}

function openReportSectionsForPrint() {
  document.querySelectorAll(".model-report-panel details").forEach((section) => {
    section.open = true;
  });
}

function setReportOutput(reportData, rawText = "", options = { save: true }) {
  latestReportData = reportData;
  latestReports = {
    activeView: latestReports.activeView || "customer",
    customerText: reportData.customerText,
    advisorText: reportData.advisorText,
  };
  renderReportSections(customerReportView, reportData.customerSections);
  renderReportSections(advisorReportView, reportData.advisorSections);
  modelReportContent.textContent = rawText || reportData.advisorText;
  updateReportCover();
  setActiveReportView(latestReports.activeView);
  if (options.save) saveReportHistory(reportData, rawText);
}

function updateReportCover() {
  if (!latestModelPayload?.reportMeta) return;
  const profile = latestModelPayload.customerProfile || getCustomerProfile();
  const workflow = latestModelPayload.serviceWorkflow || getServiceWorkflow();
  reportCover.hidden = false;
  coverCustomerName.textContent = profile.customerName || "未命名客户";
  coverCustomerCode.textContent = profile.customerCode || "--";
  coverGeneratedAt.textContent = latestModelPayload.reportMeta.generatedAt || "--";
  coverObservationCount.textContent = latestModelPayload.reportMeta.observationCount || "--";
  coverFollowUp.textContent = workflow.followUpDate || "未设置";
}

function setReportSuggestions(lines) {
  reportSuggestions.replaceChildren(
    ...lines.map((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      return paragraph;
    }),
  );
}

function showLocalAiReport(statusText = "本地专业报告已生成") {
  modelReportPanel.hidden = false;
  modelReportStatus.textContent = statusText;
  setReportOutput(buildLocalReportData(latestModelPayload));
  modelReportPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateTonguePreview() {
  selectedFileName.textContent = tongueImages.length
    ? `已选择 ${tongueImages.length}/${maxTongueImages} 张：${tongueImages.map((item) => item.name).join("、")}`
    : `已选择 0/${maxTongueImages} 张`;

  tonguePreview.hidden = tongueImages.length === 0;
  tonguePreviewGrid.replaceChildren(
    ...tongueImages.map((item, index) => {
      const thumb = document.createElement("div");
      thumb.className = "preview-thumb";

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = `舌象图片 ${index + 1}`;

      const badge = document.createElement("span");
      badge.className = "preview-index";
      badge.textContent = String(index + 1);

      thumb.append(img, badge);
      return thumb;
    }),
  );
}

function resetModelReport() {
  modelReportPanel.hidden = true;
  modelReportStatus.textContent = "等待生成";
  modelReportContent.textContent = "上传舌象图片后，点击“生成AI深度报告”。";
  customerReportView.replaceChildren();
  advisorReportView.replaceChildren();
  reportCover.hidden = true;
  latestReports = {
    activeView: "customer",
    customerText: "",
    advisorText: "",
  };
  latestReportData = null;
  setActiveReportView("customer");
  setModelProgress("", []);
}

function resetAnalysis() {
  latestModelPayload = null;
  reportStatus.textContent = "等待上传图片";
  reportScoreValue.textContent = "--";
  reportScoreLabel.textContent = "待生成";
  reportSummary.textContent = "上传图片后，系统会先判断图片清晰度、光线和色调，再生成客户可读的营养沟通参考。";
  reportImageCount.textContent = "0/3";
  reportQuality.textContent = "--";
  reportLight.textContent = "--";
  reportTone.textContent = "--";
  setReportSuggestions(["先上传2-3张清晰图片，报告会更完整。"]);
  resetModelReport();
}

function showProcessingStatus() {
  reportStatus.textContent = `正在读取 ${tongueImages.length} 张图片`;
  reportScoreValue.textContent = "--";
  reportScoreLabel.textContent = "整理中";
  reportSummary.textContent = "正在整理图片质量、光线、色彩倾向和营养沟通参考，请稍候。";
  reportImageCount.textContent = `${tongueImages.length}/3`;
  reportQuality.textContent = "--";
  reportLight.textContent = "--";
  reportTone.textContent = "--";
  setReportSuggestions(["系统正在生成客户可见摘要。"]);
}

async function updateAnalysisReport() {
  if (!tongueImages.length) {
    resetAnalysis();
    return;
  }

  showProcessingStatus();
  const analyses = await Promise.all(tongueImages.map((item) => analyzeImageFile(item.file)));
  latestModelPayload = buildModelPayload(analyses);

  const avgQuality = Math.round(average(analyses.map((item) => item.qualityScore)));
  const avgBrightness = Math.round(average(analyses.map((item) => item.brightness)));
  const avgContrast = Math.round(average(analyses.map((item) => item.contrast)));
  const avgWarmTone = Math.round(average(analyses.map((item) => item.warmRatio)));
  const completeScore = tongueImages.length >= 3 ? 96 : tongueImages.length === 2 ? 84 : 68;
  const finalScore = Math.round(avgQuality * 0.72 + completeScore * 0.28);
  const qualityLabel = classifyQuality(finalScore);
  const lightLabel = classifyLight(avgBrightness, avgContrast);
  const toneLabel = classifyWarmTone(avgWarmTone);

  reportStatus.textContent = `已读取 ${tongueImages.length} 张图片`;
  reportScoreValue.textContent = String(finalScore);
  reportScoreLabel.textContent = qualityLabel;
  reportSummary.textContent =
    `本次摘要：图片质量${qualityLabel}，光线${lightLabel}，色调倾向${toneLabel}。建议结合饮食、饮水、排便、睡眠和近期压力做营养沟通。`;
  reportImageCount.textContent = `${tongueImages.length}/3`;
  reportQuality.textContent = qualityLabel;
  reportLight.textContent = lightLabel;
  reportTone.textContent = toneLabel;
  setReportSuggestions([
    tongueImages.length >= 2
      ? "图片数量已达到基础观察要求；补第3张可让舌面、舌根、舌下角度更完整。"
      : "当前只有1张，建议再补1-2张不同角度照片。",
    `平均亮度${percent(avgBrightness)}、反差${percent(avgContrast)}，可作为拍摄质量参考。`,
    "报告用于营养服务沟通参考，不作诊断、治疗或用药依据。",
  ]);
  resetModelReport();
}

function handleTongueUpload(input) {
  if (!input.files || input.files.length === 0) return;

  const nextFiles = Array.from(input.files)
    .filter((file) => !file.type || file.type.startsWith("image/"))
    .slice(0, maxTongueImages - tongueImages.length);

  if (nextFiles.length === 0) {
    reportStatus.textContent =
      tongueImages.length >= maxTongueImages ? "已满3张，如需更换请先清空重选。" : "请选择清晰的图片文件。";
    input.value = "";
    return;
  }

  const startCount = tongueImages.length;
  nextFiles.forEach((file, index) => {
    tongueImages.push({
      file,
      name: file.name || `手机拍摄图片${startCount + index + 1}`,
      url: URL.createObjectURL(file),
    });
  });

  updateTonguePreview();
  input.value = "";
  window.setTimeout(updateAnalysisReport, 120);
}

function showDemoReport() {
  const demoAnalysis = [
    {
      width: 1280,
      height: 960,
      brightness: 58,
      contrast: 44,
      warmRatio: 48,
      qualityScore: 88,
      qualityLabel: "清晰",
      lightLabel: "较均匀",
      toneLabel: "自然",
      sizeText: "示例",
    },
    {
      width: 1280,
      height: 960,
      brightness: 62,
      contrast: 39,
      warmRatio: 51,
      qualityScore: 84,
      qualityLabel: "清晰",
      lightLabel: "较均匀",
      toneLabel: "自然",
      sizeText: "示例",
    },
  ];
  latestModelPayload = buildModelPayload(demoAnalysis);
  latestModelPayload.customerProfile = {
    customerName: "演示客户",
    customerCode: "DEMO-001",
    ageGroup: "31-45岁",
    sleepQuality: "入睡慢或容易醒",
    bowelStatus: "不规律",
    waterIntake: "一般，约1000-1500ml",
    dietPreference: "外食或夜宵较多",
    stressLevel: "较高，容易紧张或疲惫",
    customerNotes: "近期工作忙，晚睡，餐后偶尔胀。",
  };
  latestModelPayload.serviceWorkflow = {
    advisorName: "演示顾问",
    followUpDate: "7天后",
    sessionNotes: "先从晚餐结构、饮水记录和睡眠时间开始观察。",
  };
  reportStatus.textContent = "演示报告";
  reportScoreValue.textContent = "87";
  reportScoreLabel.textContent = "清晰";
  reportSummary.textContent =
    "这是演示摘要：图片清晰、光线较均匀、色调自然。正式使用时请上传客户本人同意使用的舌象图片。";
  reportImageCount.textContent = "示例";
  reportQuality.textContent = "清晰";
  reportLight.textContent = "较均匀";
  reportTone.textContent = "自然";
  setReportSuggestions([
    "演示数据适合给客户说明流程，真实报告会根据上传图片重新计算。",
    "建议同步沟通饮食、饮水、排便、睡眠和近期压力，让营养服务更完整。",
    "报告只用于大健康营养沟通，不作为身体问题判断依据。",
  ]);
  resetModelReport();
  startButton.textContent = "再次查看演示";
}

async function requestAiReport() {
  modelReportPanel.hidden = false;

  if (!latestModelPayload) {
    modelReportStatus.textContent = "请先上传图片";
    modelReportContent.textContent = "请先上传舌象图片，页面生成基础观察数据后再生成AI深度报告。";
    return;
  }

  const hasModel = hasProxyModelConfig() || hasDirectModelConfig();
  latestModelPayload.customerProfile = mergeCustomerProfile(latestModelPayload.customerProfile);
  latestModelPayload.serviceWorkflow = mergeServiceWorkflow(latestModelPayload.serviceWorkflow);
  enrichReportMeta(latestModelPayload);
  generateAiReport.disabled = true;
  setModelProgress("prepare", []);
  modelReportStatus.textContent = hasModel ? "正在调用大模型" : "未配置大模型";
  modelReportContent.textContent = hasModel ? "大模型正在读取图片和观察数据，请稍候。" : "未检测到大模型接口配置，正在生成本地专业报告。";
  modelReportPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    setModelProgress(hasModel ? "upload" : "generate", ["prepare"]);
    const data = await requestLargeModelReport(latestModelPayload);
    if (!data) {
      setModelProgress("", ["prepare", "generate"]);
      showLocalAiReport("未配置大模型，已生成本地专业报告");
      return;
    }

    setModelProgress("generate", ["prepare", "upload"]);
    const content = getModelContent(data);
    if (!content) {
      setModelProgress("", ["prepare", "upload", "generate"]);
      showLocalAiReport("大模型无正文，已转本地专业报告");
      return;
    }

    modelReportStatus.textContent = "大模型生成完成";
    setReportOutput(buildModelReportDataFromContent(content), content);
    setModelProgress("", ["prepare", "upload", "generate"]);
  } catch (error) {
    setModelProgress("", ["prepare", "generate"]);
    showLocalAiReport(`大模型不可用，已转本地专业报告：${error.message}`);
  } finally {
    generateAiReport.disabled = false;
  }
}

function getActiveReportText() {
  return latestReports.activeView === "advisor" ? latestReports.advisorText : latestReports.customerText;
}

async function writeTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand?.("copy");
    textarea.remove();
    if (!copied) throw new Error("浏览器阻止了自动复制，请手动选中报告内容复制。");
    return true;
  }
}

async function copyActiveReport() {
  const text = getActiveReportText();
  if (!text) {
    modelReportStatus.textContent = "暂无可复制报告";
    return;
  }
  await writeTextToClipboard(text);
  modelReportStatus.textContent = "报告已复制";
}

async function shareActiveReport() {
  const text = getActiveReportText();
  if (!text) {
    modelReportStatus.textContent = "暂无可分享报告";
    return;
  }
  if (navigator.share) {
    await navigator.share({ title: "舌象营养观察报告", text });
    modelReportStatus.textContent = "已打开分享";
    return;
  }
  await writeTextToClipboard(text);
  modelReportStatus.textContent = "当前浏览器不支持直接分享，已复制报告";
}

uploadInputs.forEach((input) => {
  input.addEventListener("change", () => handleTongueUpload(input));
});

clearTongueImages.addEventListener("click", () => {
  tongueImages.forEach((item) => URL.revokeObjectURL(item.url));
  tongueImages = [];
  uploadInputs.forEach((input) => {
    input.value = "";
  });
  updateTonguePreview();
  resetAnalysis();
});

startButton.addEventListener("click", showDemoReport);
generateAiReport.addEventListener("click", requestAiReport);
intakeForm.addEventListener("change", () => {
  if (latestModelPayload) latestModelPayload.customerProfile = mergeCustomerProfile(latestModelPayload.customerProfile);
});
workflowForm.addEventListener("change", () => {
  if (latestModelPayload) latestModelPayload.serviceWorkflow = mergeServiceWorkflow(latestModelPayload.serviceWorkflow);
});
reportTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveReportView(tab.dataset.reportView));
});
copyReport.addEventListener("click", () => {
  copyActiveReport().catch((error) => {
    modelReportStatus.textContent = `复制失败：${error.message}`;
  });
});
shareReport.addEventListener("click", () => {
  shareActiveReport().catch((error) => {
    modelReportStatus.textContent = `分享失败：${error.message}`;
  });
});
printReport.addEventListener("click", () => {
  openReportSectionsForPrint();
  window.print();
});
clearHistory?.addEventListener("click", clearReportHistory);
window.addEventListener("beforeprint", openReportSectionsForPrint);

setModelBadge();
resetAnalysis();
renderReportHistory();
