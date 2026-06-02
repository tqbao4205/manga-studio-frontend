/**
 * ─────────────────────────────────────────────
 *  websocket.js — STOMP WebSocket Client
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Quản lý kết nối WebSocket giữa frontend và backend.
 *   - Dùng STOMP protocol trên SockJS để real-time communication.
 *   - Backend push event đến /topic/user/{userId} → frontend subscribe.
 *
 * 🔗 Liên kết:
 *   - backend WebSocketConfig.java: endpoint /ws, broker /topic
 *   - backend WebSocketService.java: sendToUser(userId, type, data)
 *   - authStore.js: gọi connect/disconnect khi login/logout
 *
 * 🧠 Cách dùng:
 *   // Kết nối khi user login
 *   import { connectWebSocket, disconnectWebSocket } from './websocket'
 *
 *   // Định nghĩa handler xử lý các event
 *   const handleMessage = (type, data) => {
 *     switch (type) {
 *       case 'INVITATION_SENT':
 *         // ASSISTANT có lời mời mới — refetch danh sách
 *         break
 *       case 'INVITATION_ACCEPTED':
 *       case 'INVITATION_REJECTED':
 *         // MANGAKA biết assistant đã phản hồi — cập nhật UI
 *         break
 *     }
 *   }
 *
 *   // Gọi connect khi user đăng nhập
 *   connectWebSocket(userId, handleMessage)
 *
 *   // Gọi disconnect khi user logout
 *   disconnectWebSocket()
 *
 * 📦 Dependencies:
 *   - @stomp/stompjs: Thư viện STOMP client cho JavaScript
 *   - sockjs-client:  Fallback transport khi WebSocket không hoạt động
 */

import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// ─── Biến toàn cục ───
// Giữ reference đến STOMP client để disconnect sau này
let stompClient = null

// Callback xử lý message — được set khi connect
let messageHandler = null

// ─── Config ───

/**
 * BACKEND_URL: URL của backend server.
 *
 * Trong môi trường development (Vite):
 *   - Frontend chạy ở http://localhost:5173
 *   - Backend chạy ở http://localhost:8080
 *   - Vite proxy chỉ forward /api → backend, KHÔNG forward /ws
 *   → WebSocket phải kết nối trực tiếp tới backend: http://localhost:8080
 *
 * Khi deploy production:
 *   - Backend thường chạy cùng domain hoặc subdomain
 *   - WS_ENDPOINT sẽ thay đổi theo môi trường
 */
const BACKEND_URL = 'http://localhost:8080'
const WS_ENDPOINT = `${BACKEND_URL}/ws`

// ────────────────────────────────────────────────
//  1. CONNECT — Kết nối WebSocket đến backend
// ────────────────────────────────────────────────
/**
 * Thiết lập kết nối STOMP WebSocket.
 *
 * Luồng hoạt động:
 *   1. Tạo STOMP Client với SockJS (fallback nếu WebSocket không khả dụng)
 *   2. Client tự động kết nối đến backend endpoint /ws
 *   3. Khi kết nối thành công (onConnect):
 *      - Subscribe vào topic /topic/user/{userId}
 *      - Mỗi khi backend push message → callback onMessage được gọi
 *   4. Nếu mất kết nối (onDisconnect) → tự động reconnect
 *   5. Nếu lỗi (onStompError) → log lỗi để debug
 *
 * @param {number}   userId   - ID của user hiện tại (lấy từ authStore.user.id)
 * @param {function} onMessage - Callback khi nhận được message từ backend
 *                               onMessage(type: string, data: any)
 *
 * @returns {object}   - STOMP client instance (để debug hoặc kiểm tra trạng thái)
 */
export function connectWebSocket(userId, onMessage) {
  // ─── Validation ───
  // Chỉ kết nối nếu có userId hợp lệ
  if (!userId) {
    console.warn('[WS] Cannot connect: userId is missing')
    return null
  }

  // Nếu đã có kết nối còn sống → hủy kết nối cũ rồi tạo mới
  // (tránh duplicate subscription khi user login lại)
  if (stompClient?.active) {
    console.warn('[WS] Already connected. Disconnecting first...')
    disconnectWebSocket()
  }

  // Lưu callback handler để dùng trong onConnect
  messageHandler = onMessage

  // ─── Tạo STOMP Client ───
  /**
   * Client: Class chính của @stomp/stompjs.
   *
   * Cấu hình:
   *   - webSocketFactory: Hàm trả về WebSocket instance (dùng SockJS)
   *   - onConnect:        Callback khi kết nối STOMP thành công
   *   - onDisconnect:     Callback khi mất kết nối
   *   - onStompError:     Callback khi có lỗi STOMP
   *   - reconnectDelay:   Tự động reconnect sau 5000ms nếu mất kết nối
   *   - heartbeatIncoming/Outgoing: Ping/pong giữ kết nối sống
   */
  stompClient = new Client({
    // ⚙️ Dùng SockJS thay vì native WebSocket
    // SockJS tự động chọn transport tốt nhất: WebSocket → XHR → JSONP
    webSocketFactory: () => new SockJS(WS_ENDPOINT),

    // ─── Kết nối thành công ───
    onConnect: () => {
      console.log(`[WS] Connected successfully as user ${userId}`)

      // Subscribe vào topic cá nhân của user
      // Backend push message đến /topic/user/{userId}
      // → Frontend nhận được message realtime
      stompClient.subscribe(`/topic/user/${userId}`, (message) => {
        try {
          // Parse message body từ JSON string
          const payload = JSON.parse(message.body)

          /**
           * payload format từ backend (WebSocketService.java):
           * {
           *   "type": "INVITATION_SENT",        // Loại sự kiện
           *   "data": { id: 1, seriesId: 5, ... }  // Dữ liệu DTO
           * }
           */

          // Log message nhận được để debug
          console.log(`[WS] Received: ${payload.type}`, payload.data)

          // Gọi callback đã đăng ký
          if (messageHandler) {
            messageHandler(payload.type, payload.data)
          }
        } catch (err) {
          // Nếu message không phải JSON hợp lệ → log lỗi
          console.error('[WS] Failed to parse message:', err, message.body)
        }
      })
    },

    // ─── Mất kết nối ───
    onDisconnect: () => {
      console.log('[WS] Disconnected')
    },

    // ─── Lỗi STOMP ───
    onStompError: (frame) => {
      console.error('[WS] STOMP error:', frame.headers['message'])
    },

    // ─── Cấu hình khác ───

    // Tự động thử kết nối lại sau 5 giây nếu mất kết nối
    reconnectDelay: 5000,

    // Heartbeat: giữ kết nối sống — client gửi ping mỗi 10s, mong đợi pong từ server mỗy 10s
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  })

  // ─── Kích hoạt kết nối ───
  // Client.activate() bắt đầu quá trình kết nối đến backend
  stompClient.activate()

  return stompClient
}

// ────────────────────────────────────────────────
//  2. DISCONNECT — Ngắt kết nối WebSocket
// ────────────────────────────────────────────────
/**
 * Ngắt kết nối WebSocket khi user logout.
 *
 * Luồng:
 *   1. Kiểm tra stompClient có tồn tại và đang active không
 *   2. Nếu có → gọi deactivate() để hủy kết nối
 *   3. Reset stompClient = null
 *   4. Reset messageHandler = null
 */
export function disconnectWebSocket() {
  if (stompClient) {
    // deactivate(): Hủy kết nối STOMP + đóng WebSocket
    stompClient.deactivate()
    stompClient = null
    messageHandler = null
    console.log('[WS] Disconnected successfully')
  }
}
