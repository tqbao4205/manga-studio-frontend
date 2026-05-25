/**
 * ── main.jsx ──
 * Điểm vào (entry point) của ứng dụng MangaFlow.
 *
 * 🎯 Mục đích:
 *   - Mount ứng dụng React vào DOM (#root)
 *   - Bọc ứng dụng trong StrictMode (phát hiện lỗi tiềm ẩn)
 *   - Bọc ứng dụng trong ErrorBoundary (bắt lỗi render để không crash toàn bộ trang)
 *
 * 🔄 Luồng xử lý:
 *   1. ReactDOM.createRoot gắn vào thẻ <div id="root"> trong index.html
 *   2. StrictMode kích hoạt kiểm tra development (double-invoke effect, v.v.)
 *   3. ErrorBoundary bắt lỗi React component tree
 *   4. App() là component gốc chứa toàn bộ Router và Pages
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/router";
import { AppProviders } from "./app/providers";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
