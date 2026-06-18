/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from "react";
import { Moon, Sun, Send, Plus, Trash2, Code2, Sparkles, Activity, Clock, FileDigit } from "lucide-react";
import { Header, RequestConfig, ResponseResult } from "./types";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [config, setConfig] = useState<RequestConfig>({
    url: "https://jsonplaceholder.typicode.com/todos/1",
    method: "GET",
    headers: [],
    data: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseResult | null>(null);
  
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  // Apply dark mode class to html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const addHeader = () => {
    setConfig({
      ...config,
      headers: [...config.headers, { id: crypto.randomUUID(), key: "", value: "" }],
    });
  };

  const removeHeader = (id: string) => {
    setConfig({
      ...config,
      headers: config.headers.filter((h) => h.id !== id),
    });
  };

  const updateHeader = (id: string, field: "key" | "value", value: string) => {
    setConfig({
      ...config,
      headers: config.headers.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    });
  };

  const handleSend = async () => {
    if (!config.url) return;
    
    setLoading(true);
    setResponse(null);
    setExplanation(null);
    
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({
        error: err.message,
        timeMs: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!response || response.error) return;
    
    setExplaining(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: response.status,
          headers: response.headers,
          data: response.data,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
         setExplanation(data.explanation);
      } else if (data.error) {
         setExplanation(`Lỗi: ${data.error}`);
      }
    } catch (err: any) {
      setExplanation("Xin lỗi, đã có lỗi kết nối khi yêu cầu phân tích.");
    } finally {
      setExplaining(false);
    }
  };

  const statusColor = (status?: number) => {
    if (!status) return "text-slate-500";
    if (status >= 200 && status < 300) return "text-emerald-500";
    if (status >= 300 && status < 400) return "text-blue-500";
    if (status >= 400 && status < 500) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">API Explorer</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gửi HTTP Request & Phân tích bằng AI</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Panel */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* URL & Method */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row focus-within:ring-2 focus-within:ring-indigo-500/50">
              <div className="relative">
                <select 
                  value={config.method}
                  onChange={(e) => setConfig({ ...config, method: e.target.value })}
                  className="appearance-none bg-slate-50 dark:bg-slate-800/50 h-full w-full md:w-32 px-4 py-3.5 font-medium border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 focus:outline-none dark:text-slate-100"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <input 
                type="text" 
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://api.example.com/data"
                className="flex-1 bg-transparent px-4 py-3.5 focus:outline-none dark:text-white"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !config.url}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <span className="animate-spin text-xl leading-none">⟳</span> : <Send className="w-4 h-4" />}
                <span className="hidden md:inline">Gửi</span>
              </button>
            </div>

            {/* Request Details Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-6">
              
              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Headers</h3>
                  <button onClick={addHeader} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Thêm Header
                  </button>
                </div>
                
                <div className="space-y-2">
                  {config.headers.length === 0 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Không có Header tùy chỉnh
                    </div>
                  )}
                  {config.headers.map((header) => (
                    <div key={header.id} className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Key" 
                        value={header.key}
                        onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Value" 
                        value={header.value}
                        onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button onClick={() => removeHeader(header.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              {['POST', 'PUT', 'PATCH'].includes(config.method) && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Request Body</h3>
                  <textarea 
                    value={config.data}
                    onChange={(e) => setConfig({ ...config, data: e.target.value })}
                    placeholder='{"key": "value"}'
                    className="w-full h-32 font-mono text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500 resize-none whitespace-pre"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Response Panel */}
          <div className="lg:col-span-7 flex flex-col h-full space-y-6">
            {!response && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20 h-full min-h-[400px]">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                  <Code2 className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Chưa có phản hồi</h3>
                <p className="text-sm text-slate-500 max-w-sm">Nhập địa chỉ URL và nhấn Gửi để xem dữ liệu phản hồi từ máy chủ.</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 h-full min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">Đang gửi yêu cầu...</p>
              </div>
            )}

            {response && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-6 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${statusColor(response.status)}`} />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</span>
                    <span className={`font-mono font-semibold ${statusColor(response.status)}`}>
                      {response.error ? 'Error' : `${response.status} ${response.statusText}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Time</span>
                    <span className="font-mono text-sm">{response.timeMs} ms</span>
                  </div>
                  {response.sizeBytes !== undefined && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FileDigit className="w-4 h-4" />
                      <span className="text-sm font-medium">Size</span>
                      <span className="font-mono text-sm">{(response.sizeBytes / 1024).toFixed(2)} KB</span>
                    </div>
                  )}
                  
                  {!response.error && (
                    <button 
                      onClick={handleExplain}
                      disabled={explaining}
                      className="ml-auto bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 dark:from-indigo-600 dark:to-purple-600 dark:hover:from-indigo-500 dark:hover:to-purple-500 dark:text-white text-amber-900 border border-amber-400/50 dark:border-transparent px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                      {explaining ? <span className="animate-spin">⟳</span> : <Sparkles className="w-3.5 h-3.5" />}
                      Phân Tích AI
                    </button>
                  )}
                </div>

                {/* AI Explanation Area */}
                <AnimatePresence>
                  {explanation && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-b border-purple-100 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5 overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-400 font-semibold text-sm">
                          <Sparkles className="w-4 h-4" />
                          <span>Giải thích từ AI</span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                          {/* Format basic markdown using simple tags or prefer react-markdown if available */}
                          <ReactMarkdown>{explanation}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Raw Body Content */}
                <div className="flex-1 p-4 bg-[#1E1E1E] overflow-auto max-h-[600px]">
                  {response.error ? (
                    <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                      Lỗi yêu cầu: {response.error}
                      {'\n'}Mã lỗi: {response.code}
                    </div>
                  ) : (
                    <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap word-break-all">
                      {response.data || "Không có phản hồi."}
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

