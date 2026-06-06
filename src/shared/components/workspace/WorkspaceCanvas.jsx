import { Fragment, useRef, useState, useCallback, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Transformer,
  Group,
  Image as KonvaImage,
  Circle,
  Line,
} from "react-konva";
import Konva from "konva";
import { useWorkspaceStore } from "../../../app/stores/workspaceStore";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import { REGION_COLORS } from "../../constants";
import { cn, formatRelativeTime } from "../../utils";
import { Avatar } from "../ui/avatar";
import { getLayerPlaceholder } from "../../utils/page-placeholder";
import { X, Send, Trash2 } from "lucide-react";

/*
 * ===== WorkspaceCanvas Component =====
 * Mục đích: Canvas chính của workspace, nơi hiển thị trang, layer, region, annotation, comment, v.v.
 * Hỗ trợ nhiều chế độ tương tác: select, draw, hand, pen, highlight, comment, text-annotation.
 * Sử dụng react-konva (Stage/Layer) để vẽ đồ họa vector với hiệu suất cao.
 * =====================================
 */

// --- Bộ đếm ID toàn cục cho region, annotation (tránh trùng lặp) ---
let nextId = 9999;
let regionCounter = 0;
let annotationIdCounter = 99000;

/**
 * Custom hook: tải ảnh trang từ URL
 * @param {string} src - URL của ảnh
 * @returns {{ image: HTMLImageElement|undefined, error: boolean }} - đối tượng ảnh + trạng thái lỗi
 */
function usePageImage(src) {
  const [state, setState] = useState({ image: undefined, error: false });
  useEffect(() => {
    if (!src) {
      setState({ image: undefined, error: false });
      return;
    }
    setState({ image: undefined, error: false });
    const el = new window.Image();
    el.onload = () => setState({ image: el, error: false });
    el.onerror = () => setState({ image: undefined, error: true });
    el.src = src;
  }, [src]);
  return state;
}

/**
 * Component con: hiển thị một layer (ảnh thật hoặc placeholder)
 * Layer là các lớp overlay chồng lên trang, có độ trong suốt riêng.
 */
function LayerImage({ layer, pw, ph }) {
  const { image: img } = usePageImage(layer.fileUrl || undefined);
  if (layer.fileUrl && img) {
    return (
      <KonvaImage
        image={img}
        x={0}
        y={0}
        width={pw}
        height={ph}
        opacity={layer.opacity}
        listening={false}
      />
    );
  }
  const placeholder = getLayerPlaceholder(
    layer.label || "",
    pw,
    ph,
    layer.opacity,
  );
  return (
    <KonvaImage
      image={placeholder}
      x={0}
      y={0}
      width={pw}
      height={ph}
      opacity={layer.opacity}
      listening={false}
    />
  );
}

/**
 * Component chính: Canvas workspace
 * Quản lý toàn bộ tương tác chuột/bàn phím, vẽ region/annotation, comment overlay.
 */
export function WorkspaceCanvas() {
  // --- Refs cho Konva Stage, Transformer, và container DOM ---
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const containerRef = useRef(null);

  // --- State từ stores (workspace, auth, ui) ---
  const currentPageId = useWorkspaceStore((s) => s.currentPageId);
  const pages = useWorkspaceStore((s) => s.pages);
  const regions = useWorkspaceStore((s) => s.regions);
  const layers = useWorkspaceStore((s) => s.layers);
  const allComments = useWorkspaceStore((s) => s.comments);
  const annotations = useWorkspaceStore((s) => s.annotations);
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId);
  const selectedCommentId = useWorkspaceStore((s) => s.selectedCommentId);
  const selectedAnnotationId = useWorkspaceStore((s) => s.selectedAnnotationId);
  const zoom = useWorkspaceStore((s) => s.zoom);
  const mode = useWorkspaceStore((s) => s.mode);
  const selectRegion = useWorkspaceStore((s) => s.selectRegion);
  const selectComment = useWorkspaceStore((s) => s.selectComment);
  const selectAnnotation = useWorkspaceStore((s) => s.selectAnnotation);
  const updateRegion = useWorkspaceStore((s) => s.updateRegion);
  const deleteRegion = useWorkspaceStore((s) => s.deleteRegion);
  const addRegion = useWorkspaceStore((s) => s.addRegion);
  const addComment = useWorkspaceStore((s) => s.addComment);
  const replyComment = useWorkspaceStore((s) => s.replyComment);
  const updateComment = useWorkspaceStore((s) => s.updateComment);
  const deleteComment = useWorkspaceStore((s) => s.deleteComment);
  const addAnnotation = useWorkspaceStore((s) => s.addAnnotation);
  const deleteAnnotation = useWorkspaceStore((s) => s.deleteAnnotation);
  const hiddenRegionIds = useWorkspaceStore((s) => s.hiddenRegionIds);
  const mergeResult = useWorkspaceStore((s) => s.mergeResult);

  const visibleRegions = regions.filter((r) => !hiddenRegionIds.includes(r.id));
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  // --- Local state: các biến tạm thời trong quá trình vẽ ---
  const [containerSize, setContainerSize] = useState({ w: 700, h: 700 });
  const [drawStart, setDrawStart] = useState(null); // Điểm bắt đầu vẽ region (draw mode)
  const [drawCurrent, setDrawCurrent] = useState(null); // Điểm hiện tại khi kéo chuột
  const [commentPos, setCommentPos] = useState(null); // Vị trí comment đang nhập
  const [commentText, setCommentText] = useState(""); // Nội dung comment
  const [replyText, setReplyText] = useState(""); // Nội dung reply
  const [popupReplyText, setPopupReplyText] = useState(""); // Reply trong popup comment
  const [penPoints, setPenPoints] = useState(null); // Mảng tọa độ bút vẽ tự do
  const [annotationTextPos, setAnnotationTextPos] = useState(null); // Vị trí annotation dạng text
  const [annotationTextValue, setAnnotationTextValue] = useState("");
  const [penColor, setPenColor] = useState("#e63946"); // Màu bút vẽ
  const [highlightStart, setHighlightStart] = useState(null); // Điểm bắt đầu highlight
  const [highlightCurrent, setHighlightCurrent] = useState(null); // Điểm kết thúc highlight

  // --- Tính toán dữ liệu hiển thị ---
  const commentsOnPage = allComments.filter((c) => c.pageId === currentPageId && c.status !== 'RESOLVED');
  const selectedComment = allComments.find((c) => c.id === selectedCommentId);

  const page = pages.find((p) => p.id === currentPageId);
  const [mergeFallback, setMergeFallback] = useState(false);
  useEffect(() => { setMergeFallback(false); }, [mergeResult]);
  const pageImageUrl = (!mergeFallback && mergeResult) || (!mergeFallback && page?.finalImageUrl) || page?.originalImageUrl || page?.webImageUrl || undefined;
  const { image: pageImage, error: pageImageError } = usePageImage(pageImageUrl);
  const pw = page?.width || pageImage?.naturalWidth || 4200;
  const ph = page?.height || pageImage?.naturalHeight || 6000;

  // Tỉ lệ scale cơ bản: fit vừa container, tối đa 1 (không phóng to)
  const baseScale = Math.min(
    (containerSize.w - 40) / pw,
    (containerSize.h - 40) / ph,
    1,
  );
  const scale = baseScale * zoom; // Scale tổng (zoom * base)
  const stageW = pw * scale; // Kích thước Stage sau scale
  const stageH = ph * scale;

  // --- Effects ---

  // Reset vị trí Stage về center khi thoát chế độ hand (di chuyển)
  useEffect(() => {
    if (mode !== "hand" && stageRef.current) {
      stageRef.current.x((containerSize.w - stageW) / 2);
      stageRef.current.y((containerSize.h - stageH) / 2);
      stageRef.current.batchDraw();
    }
  }, [mode, stageW, stageH, containerSize]);

  // ResizeObserver: cập nhật kích thước container khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Attach Transformer vào region đang được chọn (cho phép resize/kéo)
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedRegionId !== null && mode === "select") {
      const node = stage.findOne(`#region-${selectedRegionId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedRegionId, regions, mode]);

  // Fallback: nếu merge image load lỗi (404), quay về originalImageUrl
  useEffect(() => {
    if (pageImageError && mergeResult && !mergeFallback) {
      setMergeFallback(true);
    }
  }, [pageImageError, mergeResult, mergeFallback]);

  /**
   * Lấy tọa độ chuột tương đối so với Stage (đã tính scale)
   */
  const getPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getRelativePointerPosition();
    return pos;
  }, []);

  /**
   * Xử lý click vào Stage: bỏ chọn region/annotation nếu click vào nền
   */
  const handleStageClick = useCallback(
    (e) => {
      if (e.target === e.target.getStage()) {
        selectRegion(null);
        selectAnnotation(null);
      }
    },
    [selectRegion, selectAnnotation],
  );

  /**
   * Gửi comment mới lên API qua store.
   * addComment() trong store sẽ gọi POST /api/v1/pages/{pageId}/comments
   * và trả về CommentResponse từ backend (có id thật, author từ JWT).
   */
  const submitComment = useCallback(() => {
    if (!commentPos || !commentText.trim() || !currentPageId || !user) return;
    addComment({
      content: commentText.trim(),
      posX: commentPos.x,
      posY: commentPos.y,
    });
    setCommentPos(null);
    setCommentText("");
  }, [commentPos, commentText, currentPageId, user, addComment]);

  /**
   * Gửi reply cho một comment cha qua API.
   * replyComment() trong store sẽ gọi POST /api/v1/comments/{parentId}/replies
   * và tự động cập nhật replyCount của comment cha.
   */
  const handleReplySubmit = useCallback(
    async (parentComment) => {
      if (!replyText.trim() || !user || !currentPageId) return;
      await replyComment(parentComment.id, replyText.trim());
      addToast({ title: "Reply added", variant: "success" });
      setReplyText("");
    },
    [replyText, user, currentPageId, replyComment, addToast],
  );

  /**
   * Cập nhật vị trí region khi kéo thả
   */
  const handleRegionDragMove = useCallback(
    (e, region) => {
      updateRegion(region.id, {
        x: Math.round(e.target.x()),
        y: Math.round(e.target.y()),
      });
    },
    [updateRegion],
  );

  /**
   * Xử lý kết thúc transform (resize) region
   * Tính lại kích thước thực từ scaleX/scaleY sau đó reset scale về 1
   */
  const handleTransformEnd = useCallback(
    (e, region) => {
      const node = e.target;
      const newX = Math.round(node.x());
      const newY = Math.round(node.y());
      const newW = Math.max(Math.round(region.width * node.scaleX()), 50);
      const newH = Math.max(Math.round(region.height * node.scaleY()), 50);
      node.x(newX);
      node.y(newY);
      node.scaleX(1);
      node.scaleY(1);
      updateRegion(region.id, { x: newX, y: newY, width: newW, height: newH });
    },
    [updateRegion],
  );

  /**
   * Xử lý MouseDown: bắt đầu vẽ theo từng chế độ
   * - draw: ghi nhận điểm bắt đầu region
   * - pen: bắt đầu ghi nhận điểm bút vẽ
   * - highlight: ghi nhận điểm bắt đầu highlight
   * - text-annotation: hiển thị ô nhập text
   */
  const handleMouseDown = useCallback(
    (_e) => {
      const pos = getPos();
      if (!pos) return;
      const x = Math.round(Math.max(0, Math.min(pw, pos.x)));
      const y = Math.round(Math.max(0, Math.min(ph, pos.y)));

      switch (mode) {
        case "draw":
          setDrawStart({ x, y });
          setDrawCurrent({ x, y });
          break;
        case "pen":
          setPenPoints([x, y]);
          break;
        case "highlight":
          setHighlightStart({ x, y });
          setHighlightCurrent({ x, y });
          break;
        case "text-annotation":
          setAnnotationTextPos({ x, y });
          setAnnotationTextValue("");
          break;
      }
    },
    [mode, pw, ph, getPos],
  );

  /**
   * Xử lý MouseMove: cập nhật preview khi đang vẽ
   */
  const handleMouseMove = useCallback(
    (_e) => {
      const pos = getPos();
      if (!pos) return;

      switch (mode) {
        case "draw":
          if (!drawStart) return;
          setDrawCurrent({
            x: Math.round(Math.max(0, Math.min(pw, pos.x))),
            y: Math.round(Math.max(0, Math.min(ph, pos.y))),
          });
          break;
        case "pen":
          if (!penPoints) return;
          setPenPoints([
            ...penPoints,
            Math.round(Math.max(0, Math.min(pw, pos.x))),
            Math.round(Math.max(0, Math.min(ph, pos.y))),
          ]);
          break;
        case "highlight":
          if (!highlightStart) return;
          setHighlightCurrent({
            x: Math.round(Math.max(0, Math.min(pw, pos.x))),
            y: Math.round(Math.max(0, Math.min(ph, pos.y))),
          });
          break;
      }
    },
    [mode, drawStart, penPoints, highlightStart, pw, ph, getPos],
  );

  /**
   * Xử lý MouseUp: kết thúc hành động vẽ và lưu đối tượng vào store
   * - comment: hiển thị ô nhập comment tại vị trí click
   * - draw: tạo region mới từ vùng đã kéo
   * - pen: tạo annotation pen stroke
   * - highlight: tạo annotation highlight
   */
  const handleMouseUp = useCallback(
    (_e) => {
      const pos = getPos();

      if (mode === "comment" && !commentPos && pos) {
        const x = Math.round(Math.max(0, Math.min(pw, pos.x)));
        const y = Math.round(Math.max(0, Math.min(ph, pos.y)));
        setCommentPos({ x, y });
        setCommentText("");
        return;
      }

      switch (mode) {
        case "draw":
          if (!drawStart || !drawCurrent) break;
          {
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const w = Math.max(Math.abs(drawCurrent.x - drawStart.x), 50);
            const h = Math.max(Math.abs(drawCurrent.y - drawStart.y), 50);
            if (currentPageId && w >= 50 && h >= 50) {
              const n = ++regionCounter;
              addRegion({
                id: ++nextId,
                pageId: currentPageId,
                regionType: "OTHER",
                label: `Region ${n}`,
                x,
                y,
                width: w,
                height: h,
                status: "PENDING",
                sortOrder: n,
                createdAt: new Date().toISOString(),
              });
            }
          }
          setDrawStart(null);
          setDrawCurrent(null);
          break;

        case "pen":
          if (penPoints && penPoints.length >= 4 && currentPageId) {
            addAnnotation({
              id: ++annotationIdCounter,
              pageId: currentPageId,
              type: "pen",
              points: [...penPoints],
              color: penColor,
              strokeWidth: 2,
              createdAt: new Date().toISOString(),
            });
          }
          setPenPoints(null);
          break;

        case "highlight":
          if (highlightStart && highlightCurrent && currentPageId) {
            const hx = Math.min(highlightStart.x, highlightCurrent.x);
            const hy = Math.min(highlightStart.y, highlightCurrent.y);
            const hw = Math.max(
              Math.abs(highlightCurrent.x - highlightStart.x),
              10,
            );
            const hh = Math.max(
              Math.abs(highlightCurrent.y - highlightStart.y),
              10,
            );
            addAnnotation({
              id: ++annotationIdCounter,
              pageId: currentPageId,
              type: "highlight",
              x: hx,
              y: hy,
              width: hw,
              height: hh,
              color: "#ffeb3b",
              opacity: 0.3,
              createdAt: new Date().toISOString(),
            });
          }
          setHighlightStart(null);
          setHighlightCurrent(null);
          break;
      }
    },
    [
      mode,
      commentPos,
      pw,
      ph,
      drawStart,
      drawCurrent,
      penPoints,
      highlightStart,
      highlightCurrent,
      currentPageId,
      addRegion,
      addAnnotation,
      penColor,
      getPos,
    ],
  );

  /**
   * Xử lý phím tắt:
   * - Escape: hủy thao tác hiện tại và bỏ chọn
   * - Delete/Backspace: xóa region hoặc annotation đang chọn
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (selectedCommentId) {
          selectComment(null);
          return;
        }
        if (selectedAnnotationId) {
          selectAnnotation(null);
          return;
        }
        if (drawStart) {
          setDrawStart(null);
          setDrawCurrent(null);
          return;
        }
        if (commentPos) {
          setCommentPos(null);
          setCommentText("");
          return;
        }
        if (penPoints) {
          setPenPoints(null);
          return;
        }
        if (annotationTextPos) {
          setAnnotationTextPos(null);
          setAnnotationTextValue("");
          return;
        }
        if (highlightStart) {
          setHighlightStart(null);
          setHighlightCurrent(null);
          return;
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && mode === "select") {
        // Không xoá region khi đang gõ trong ô input/text
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (selectedRegionId !== null) {
          e.preventDefault();
          deleteRegion(selectedRegionId);
        } else if (selectedAnnotationId !== null) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotationId);
          addToast({ title: "Annotation deleted", variant: "info" });
        }
      }
    },
    [
      selectedRegionId,
      selectedCommentId,
      selectedAnnotationId,
      mode,
      deleteRegion,
      deleteAnnotation,
      drawStart,
      commentPos,
      penPoints,
      annotationTextPos,
      highlightStart,
      selectComment,
      selectAnnotation,
      addToast,
    ],
  );

  // Đăng ký / hủy đăng ký lắng nghe sự kiện bàn phím
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // --- Render: trạng thái rỗng (chưa chọn trang) ---
  if (!currentPageId) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center h-full min-h-[300px]"
      >
        <p className="text-sm text-workspace-text-secondary/60">
          Select a page to begin
        </p>
      </div>
    );
  }

  // --- Render chính ---
  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full overflow-hidden relative",
        mode === "draw" && "cursor-crosshair",
        mode === "hand" && "cursor-grab",
        mode === "comment" && "cursor-cell",
        mode === "pen" && "cursor-crosshair",
        mode === "highlight" && "cursor-crosshair",
        mode === "text-annotation" && "cursor-text",
      )}
    >
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        x={(containerSize.w - stageW) / 2}
        y={(containerSize.h - stageH) / 2}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={mode === "hand"}
      >
        <Layer>
          {/* Nền trang trắng với viền */}
          <Rect
            x={0}
            y={0}
            width={pw}
            height={ph}
            fill="#ffffff"
            stroke="#2a2a4a"
            strokeWidth={1}
          />

          {/* Ảnh gốc của trang (scan/chụp) */}
          {page?.originalImageUrl && pageImage && (
            <KonvaImage
              image={pageImage}
              x={0}
              y={0}
              width={pw}
              height={ph}
              listening={false}
            />
          )}

          {/* Các layer overlay xếp chồng (sắp xếp theo sortOrder) */}
          {[...layers]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((layer) => {
              // Bỏ qua virtual base layer vì đã được render ở background
              if (layer.virtual) return null;
              if (!layer.visible) return null;
              return (
                <LayerImage
                  key={`layer-${layer.id}`}
                  layer={layer}
                  pw={pw}
                  ph={ph}
                />
              );
            })}

          {/* Các region (vùng chú thích) trên trang */}
          {visibleRegions.map((r) => {
            const color = REGION_COLORS[r.regionType] || "#6b7280";
            const isSelected = selectedRegionId === r.id;
            return (
              <Fragment key={r.id}>
                <Group
                  id={`region-${r.id}`}
                  x={r.x}
                  y={r.y}
                  scaleX={1}
                  scaleY={1}
                  draggable={mode === "select"}
                  onClick={(e) => {
                    if (mode !== "select") return;
                    e.cancelBubble = true;
                    selectRegion(selectedRegionId === r.id ? null : r.id);
                  }}
                  onDragMove={(e) => handleRegionDragMove(e, r)}
                  onDragEnd={(e) => handleRegionDragMove(e, r)}
                  onTransformEnd={(e) => handleTransformEnd(e, r)}
                >
                  <Rect
                    width={r.width}
                    height={r.height}
                    fill={`${color}20`}
                    stroke={isSelected ? color : `${color}70`}
                    strokeWidth={isSelected ? 2 / scale : 1 / scale}
                    cornerRadius={2}
                  />
                </Group>
                {/* Nhãn region */}
                <Text
                  text={r.label || r.regionType}
                  x={r.x + 4 / scale}
                  y={r.y + 4 / scale}
                  fontSize={Math.max(12, 11 / scale)}
                  fontFamily="Inter, sans-serif"
                  fill={color}
                  fontStyle="600"
                />
              </Fragment>
            );
          })}

          {/* Transformer cho phép resize region được chọn */}
          <Transformer
            ref={transformerRef}
            keepRatio={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 50 || newBox.height < 50) return oldBox;
              return newBox;
            }}
          />

          {/* Preview khi đang vẽ region (draw mode) */}
          {drawStart && drawCurrent && mode === "draw" && (
            <Rect
              x={Math.min(drawStart.x, drawCurrent.x)}
              y={Math.min(drawStart.y, drawCurrent.y)}
              width={Math.max(Math.abs(drawCurrent.x - drawStart.x), 1)}
              height={Math.max(Math.abs(drawCurrent.y - drawStart.y), 1)}
              stroke="#4fc3f7"
              strokeWidth={1.5 / scale}
              dash={[6 / scale, 3 / scale]}
              cornerRadius={2}
            />
          )}

          {/* Preview nét bút (pen mode) */}
          {penPoints && penPoints.length >= 2 && (
            <Line
              points={penPoints}
              stroke={penColor}
              strokeWidth={2 / scale}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}

          {/* Preview highlight */}
          {highlightStart && highlightCurrent && (
            <Rect
              x={Math.min(highlightStart.x, highlightCurrent.x)}
              y={Math.min(highlightStart.y, highlightCurrent.y)}
              width={Math.max(
                Math.abs(highlightCurrent.x - highlightStart.x),
                1,
              )}
              height={Math.max(
                Math.abs(highlightCurrent.y - highlightStart.y),
                1,
              )}
              fill="#ffeb3b"
              opacity={0.3}
              stroke="#fdd835"
              strokeWidth={1 / scale}
              listening={false}
            />
          )}

          {/* Annotations đã lưu: pen, highlight, text */}
          {annotations.map((a) => {
            if (a.pageId !== currentPageId) return null;
            const isSelected = selectedAnnotationId === a.id;
            if (a.type === "pen") {
              return (
                <Line
                  key={`ann-pen-${a.id}`}
                  points={a.points}
                  stroke={isSelected ? "#4fc3f7" : a.color || "#e63946"}
                  strokeWidth={(a.strokeWidth || 2) / scale}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (mode === "select")
                      selectAnnotation(
                        selectedAnnotationId === a.id ? null : a.id,
                      );
                  }}
                />
              );
            }
            if (a.type === "highlight") {
              return (
                <Rect
                  key={`ann-highlight-${a.id}`}
                  x={a.x}
                  y={a.y}
                  width={a.width}
                  height={a.height}
                  fill={a.color || "#ffeb3b"}
                  opacity={a.opacity || 0.3}
                  stroke={isSelected ? "#4fc3f7" : "#fdd835"}
                  strokeWidth={isSelected ? 2 / scale : 0.5 / scale}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (mode === "select")
                      selectAnnotation(
                        selectedAnnotationId === a.id ? null : a.id,
                      );
                  }}
                />
              );
            }
            if (a.type === "text") {
              const ts = 16 / scale;
              const tw = Math.max(
                (a.text?.length || 5) * ts * 0.65,
                80 / scale,
              );
              const th = 28 / scale;
              return (
                <Fragment key={`ann-text-${a.id}`}>
                  <Rect
                    x={a.x}
                    y={a.y}
                    width={tw}
                    height={th}
                    fill="#1a1a2e"
                    fillAfterStrokeEnabled
                    stroke={isSelected ? "#4fc3f7" : "#9ca3af"}
                    strokeWidth={isSelected ? 2 / scale : 1.5 / scale}
                    cornerRadius={4 / scale}
                    shadowColor="#000"
                    shadowBlur={8 / scale}
                    shadowOpacity={0.3}
                    shadowEnabled
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (mode === "select")
                        selectAnnotation(
                          selectedAnnotationId === a.id ? null : a.id,
                        );
                    }}
                  />
                  <Text
                    x={a.x + 6 / scale}
                    y={a.y + 5 / scale}
                    text={a.text || ""}
                    fontSize={ts}
                    fontFamily="Inter, sans-serif"
                    fill="#f0f0f8"
                    fontStyle="500"
                  />
                </Fragment>
              );
            }
            return null;
          })}

          {/* Comment markers — dùng posX/posY từ backend CommentResponse */}
          {commentsOnPage.map((c) => {
            const isSelected = selectedCommentId === c.id;
            const r = isSelected ? 14 / scale : 10 / scale;
            const cx = c.posX ?? c.positionX;
            const cy = c.posY ?? c.positionY;
            if (cx == null || cy == null) return null;
            return (
              <Group
                key={`comment-${c.id}`}
                x={cx}
                y={cy}
                onClick={(e) => {
                  e.cancelBubble = true;
                  selectComment(selectedCommentId === c.id ? null : c.id);
                }}
              >
                <Circle
                  radius={r}
                  fill={c.status === 'RESOLVED' ? '#16a34a' : '#f59e0b'}
                  stroke="#fff"
                  strokeWidth={1.5 / scale}
                  offsetX={r}
                  offsetY={r}
                />
              </Group>
            );
          })}

          {/* Temporary pin marker while typing new comment */}
          {commentPos && (
            <Circle
              x={commentPos.x}
              y={commentPos.y}
              radius={10 / scale}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={1.5 / scale}
              offsetX={10 / scale}
              offsetY={10 / scale}
            />
          )}
        </Layer>
      </Stage>

      {/* Overlay nhập text annotation (xuất hiện khi click text-annotation mode) */}
      {annotationTextPos &&
        (() => {
          const s = stageRef.current;
          const sx = s ? s.x() : (containerSize.w - stageW) / 2;
          const sy = s ? s.y() : (containerSize.h - stageH) / 2;
          return (
            <div
              className="absolute z-20"
              style={{
                left: sx + annotationTextPos.x * scale,
                top: sy + annotationTextPos.y * scale - 40,
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-xl"
                style={{
                  backgroundColor: "#1a1a2e",
                  border: "1.5px solid #9ca3af",
                }}
              >
                <input
                  autoFocus
                  value={annotationTextValue}
                  onChange={(e) => setAnnotationTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && annotationTextValue.trim()) {
                      addAnnotation({
                        id: ++annotationIdCounter,
                        pageId: currentPageId,
                        type: "text",
                        x: annotationTextPos.x,
                        y: annotationTextPos.y,
                        text: annotationTextValue.trim(),
                        color: "#e63946",
                        createdAt: new Date().toISOString(),
                      });
                      setAnnotationTextPos(null);
                      setAnnotationTextValue("");
                    }
                    if (e.key === "Escape") {
                      setAnnotationTextPos(null);
                      setAnnotationTextValue("");
                    }
                  }}
                  placeholder="Type annotation text..."
                  className="bg-transparent text-base text-white placeholder:text-white/30 outline-none"
                  style={{
                    minWidth: 160,
                    width: Math.max(160, annotationTextValue.length * 10 + 28),
                  }}
                />
                <button
                  onClick={() => {
                    if (annotationTextValue.trim()) {
                      addAnnotation({
                        id: ++annotationIdCounter,
                        pageId: currentPageId,
                        type: "text",
                        x: annotationTextPos.x,
                        y: annotationTextPos.y,
                        text: annotationTextValue.trim(),
                        color: "#e63946",
                        createdAt: new Date().toISOString(),
                      });
                      setAnnotationTextPos(null);
                      setAnnotationTextValue("");
                    }
                  }}
                  className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          );
        })()}

      {/* Overlay nhập comment — xuất hiện khi click ở comment mode, style đồng bộ với popup xem comment */}
      {commentPos &&
        (() => {
          const s = stageRef.current;
          const sx = s ? s.x() : (containerSize.w - stageW) / 2;
          const sy = s ? s.y() : (containerSize.h - stageH) / 2;
          return (
            <div
              className="absolute z-20"
              style={{
                left: sx + commentPos.x * scale + 20,
                top: sy + commentPos.y * scale - 40,
              }}
            >
              <div className="bg-surface border border-outline-variant/30 px-3.5 py-2.5 shadow-xl w-64 rounded-xl">
                {/* Header hint */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {user?.displayName?.[0] || '?'}
                  </div>
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {user?.displayName || 'You'}
                  </span>
                  <span className="ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-status-warning/15 text-status-warning">
                    New
                  </span>
                </div>

                {/* Input */}
                <textarea
                  autoFocus
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full bg-surface-container-high text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none rounded-lg px-2.5 py-1.5 border border-outline-variant/20 focus:border-primary/50 transition-colors"
                />
                <div className="flex items-center justify-end gap-2 mt-1.5">
                  <button
                    onClick={() => {
                      setCommentPos(null);
                      setCommentText("");
                    }}
                    className="text-[10px] text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim()}
                    className="text-[10px] font-semibold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary/80 transition-colors"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Popup comment khi click marker — hiển thị nội dung + reply inline */}
      {selectedComment &&
        (() => {
          const s = stageRef.current;
          const sx = s ? s.x() : (containerSize.w - stageW) / 2;
          const sy = s ? s.y() : (containerSize.h - stageH) / 2;
          const cx = selectedComment.posX ?? selectedComment.positionX;
          const cy = selectedComment.posY ?? selectedComment.positionY;
          if (cx == null || cy == null) return null;
          return (
            <div
              className="absolute z-20"
              style={{
                left: sx + cx * scale + 20,
                top: sy + cy * scale - 40,
              }}
            >
              <div className="bg-surface border border-outline-variant/30 px-3.5 py-2.5 shadow-xl w-64 rounded-xl">
                {/* Header: avatar + tên + status */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {(selectedComment.authorName || '?')[0]}
                  </div>
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {selectedComment.authorName || 'Unknown'}
                  </span>
                  <span className={`ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                    selectedComment.status === 'RESOLVED'
                      ? 'bg-status-success/15 text-status-success'
                      : 'bg-status-warning/15 text-status-warning'
                  }`}>
                    {selectedComment.status === 'RESOLVED' ? 'Resolved' : 'Active'}
                  </span>
                </div>

                {/* Nội dung comment */}
                <p className="text-xs text-on-surface/80 leading-relaxed mb-2.5 whitespace-pre-wrap break-words">
                  {selectedComment.content}
                </p>

                {/* Reply input */}
                <div className="border-t border-outline-variant/20 pt-2 mt-1">
                  <textarea
                    value={popupReplyText}
                    onChange={(e) => setPopupReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full bg-surface-container-high text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none rounded-lg px-2.5 py-1.5 border border-outline-variant/20 focus:border-primary/50 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      {user?.id === selectedComment.authorId && (
                        <button
                          onClick={async () => {
                            await deleteComment(selectedComment.id);
                            selectComment(null);
                            addToast({ title: 'Comment deleted', variant: 'info' });
                          }}
                          className="text-[10px] text-status-danger hover:text-status-danger/80 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await updateComment(selectedComment.id, {
                            status: selectedComment.status === 'RESOLVED' ? 'ACTIVE' : 'RESOLVED',
                          });
                          addToast({
                            title: selectedComment.status === 'RESOLVED' ? 'Reopened' : 'Resolved',
                            variant: 'success',
                          });
                        }}
                        className="text-[10px] text-primary hover:text-primary/80 transition-colors ml-2"
                      >
                        {selectedComment.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selectComment(null)}
                        className="text-[10px] text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={async () => {
                          if (!popupReplyText.trim()) return;
                          await replyComment(selectedComment.id, popupReplyText.trim());
                          setPopupReplyText("");
                          addToast({ title: 'Reply added', variant: 'success' });
                        }}
                        disabled={!popupReplyText.trim()}
                        className="text-[10px] font-semibold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary/80 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
