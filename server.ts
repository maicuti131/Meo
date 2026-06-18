import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios, { AxiosError } from "axios";
import dns from "dns";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";

const resolve = promisify(dns.resolve);
const app = express();
const PORT = 3000;

app.use(express.json());

// Set up rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// SSRF Protection: basic check
async function isUrlSafe(targetUrl: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(targetUrl);
    
    // Only allow HTTP and HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    const hostname = parsedUrl.hostname;
    
    // Block typical localhosts and private IPs via string matching
    const privateIPs = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.169.254' // AWS metadata
    ];
    if (privateIPs.includes(hostname)) return false;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;

    // Optional: resolve IP and check if it's private.
    // Simplifying here to avoid complex IP range checking logic,
    // but blocking obvious internal addresses.
    const addresses = await resolve(hostname);
    for (const ip of addresses) {
      if (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
        ip === '127.0.0.1' ||
        ip === '0.0.0.0'
      ) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false; // Invalid URL
  }
}

app.post("/api/request", async (req, res) => {
  const { url, method, headers, data } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL là bắt buộc." });
  }

  const isSafe = await isUrlSafe(url);
  if (!isSafe) {
    return res.status(400).json({ error: "URL không hợp lệ hoặc bị cấm do lý do bảo mật." });
  }

  const startTime = Date.now();

  try {
    const formattedHeaders = headers?.reduce((acc: any, h: any) => {
      if (h.key && h.value) acc[h.key] = h.value;
      return acc;
    }, {});

    const response = await axios({
      url,
      method: method || 'GET',
      headers: formattedHeaders,
      data: data && data.trim() !== '' ? data : undefined,
      timeout: 10000, // 10 seconds timeout
      validateStatus: () => true // Resolve all HTTP statuses
    });

    const responseTime = Date.now() - startTime;
    let size = 0;
    
    let rawData = response.data;
    if (typeof rawData === 'object') {
       rawData = JSON.stringify(rawData, null, 2);
    } else {
       rawData = String(rawData);
    }
    
    if (response.headers['content-length']) {
      size = parseInt(response.headers['content-length'] as string, 10);
    } else {
      size = new TextEncoder().encode(rawData).length;
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: rawData,
      timeMs: responseTime,
      sizeBytes: size,
    });
  } catch (err) {
    const error = err as AxiosError;
    const responseTime = Date.now() - startTime;
    res.json({
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
      timeMs: responseTime
    });
  }
});

app.post("/api/explain", async (req, res) => {
  const { status, headers, data } = req.body;
  if (!process.env.GEMINI_API_KEY) {
     return res.status(500).json({ error: "Chưa cấu hình API Key cho Gemini." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
Bạn là một chuyên gia về mạng và lập trình web.
Tôi vừa gửi một HTTP request và nhận được phản hồi như sau:
- Mã trạng thái (Status): ${status}
- Headers: ${JSON.stringify(headers)}
- Nội dung (Data): ${data.substring(0, 2000)} ${data.length > 2000 ? '... (cắt bớt do quá dài)' : ''}

Hãy giải thích phản hồi này cho tôi một cách rõ ràng, dễ hiểu bằng tiếng Việt.
- Mã trạng thái này có ý nghĩa gì trong ngữ cảnh này?
- Nội dung trả về cho biết điều gì? (Nếu là JSON, hãy tóm tắt ý chính. Nếu là HTML, hãy nói nội dung chính của trang web. Nếu lỗi, hãy giải thích nguyên nhân có thể.)
- Không cần giải thích chi tiết từng header trừ khi nó quan trọng cho việc hiểu phản hồi.
Chỉ trả về nội dung giải thích, không cần chào hỏi.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
       explanation: response.text
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Lỗi khi gọi AI API.", details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
