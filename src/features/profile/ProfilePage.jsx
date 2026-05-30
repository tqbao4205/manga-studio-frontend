import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import authService from "../../services/authService";
import uploadService from "../../services/uploadService";
import { Button } from "../../shared/components/ui/button";
import {
  Mail, User, AtSign, Camera, Shield, Clock,
  Sparkles, Loader2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Palette, Highlighter, Eraser,
} from "lucide-react";

// ─────────────────────────────────────────────
//  Màu sắc preset cho Text Color & Highlight
// ─────────────────────────────────────────────
const COLORS = [
  { label: "White", value: "#e5e1e4" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

// ─────────────────────────────────────────────
//  Kiểm tra file ảnh có hợp lệ không
// ─────────────────────────────────────────────
function isValidImageFile(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (!allowedTypes.includes(file.type)) return "Only JPG, PNG, GIF, WebP are allowed.";
  if (file.size > maxSize) return "File size must be less than 5MB.";
  return null;
}

// ─────────────────────────────────────────────
//  Component: Trang Edit Profile
// ─────────────────────────────────────────────
export function ProfilePage() {
  // ─── Store: thông tin user + toast ───
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);

  // ─── Form state ───
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  // ─── Avatar state ───
  // avatarPreview có 3 trạng thái:
  //   undefined = chưa thay đổi (dùng user.avatarUrl)
  //   null      = user muốn xoá avatar
  //   string    = base64 data URL của ảnh mới (preview tạm)
  const [avatarPreview, setAvatarPreview] = useState(undefined);
  // uploadingAvatar = true khi đang đọc file (hiển thị spinner nhỏ)
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ─── Rich Editor state ───
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  // ─── TipTap Editor ───
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Tell us about yourself..." }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline hover:text-primary/80" },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: user?.bio || "",
    editorProps: {
      attributes: { class: "outline-none min-h-[80px] text-base text-on-surface leading-relaxed" },
    },
    // Mỗi lần gõ → cập nhật bio state (HTML string)
    onUpdate: ({ editor }) => { setBio(editor.getHTML()); },
  });

  // Chưa đăng nhập → không render
  if (!user) return null;

  // ────────────────────────────────────────────
  //  handleAvatarUpload: user chọn file ảnh mới
  // ────────────────────────────────────────────
  //  1. Validate file (type + size)
  //  2. Upload lên Cloudinary qua uploadService
  //  3. Nhận URL từ Cloudinary → lưu vào avatarPreview
  //  4. Khi save, URL này được gửi xuống API lưu vào DB
  // ────────────────────────────────────────────
  const handleAvatarUpload = async (file) => {
    // Validate file
    const error = isValidImageFile(file);
    if (error) {
      addToast({ type: "error", title: "Invalid File", message: error });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Upload file lên Cloudinary → nhận URL
      const { url } = await uploadService.uploadAvatar(file);
      setAvatarPreview(url);
    } catch (err) {
      addToast({ type: "error", title: "Upload Failed", message: err.message || "Could not upload the file." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ────────────────────────────────────────────
  //  handleRemoveAvatar: xoá avatar
  // ────────────────────────────────────────────
  //  Set avatarPreview = null để hiển thị initials
  //  Khi save, avatarUrl = "" sẽ được gửi xuống API
  // ────────────────────────────────────────────
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
  };

  // ────────────────────────────────────────────
  //  handleSave: gửi toàn bộ thay đổi lên API
  // ────────────────────────────────────────────
  //  Request gửi đi: PATCH /api/auth/profile
  //  Body:
  //    { displayName, bio }                    — nếu avatar không đổi
  //    { displayName, bio, avatarUrl: "URL" } — nếu upload mới (URL từ Cloudinary)
  //    { displayName, bio, avatarUrl: "" }    — nếu xoá avatar
  // ────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Xác định avatarUrl sẽ gửi:
      //   avatarPreview === undefined → không gửi avatarUrl (giữ nguyên)
      //   avatarPreview === null      → gửi "" (xoá avatar)
      //   avatarPreview là string     → gửi Cloudinary URL (ảnh mới)
      const payload = { displayName, bio };
      if (avatarPreview !== undefined) {
        payload.avatarUrl = avatarPreview === null ? "" : avatarPreview;
      }

      // Gọi API: PATCH /api/auth/profile
      const updatedUser = await authService.updateProfile(payload);
      // Cập nhật store + localStorage
      setUser(updatedUser);
      // Reset avatarPreview về undefined (đã save xong)
      setAvatarPreview(undefined);
      addToast({ type: "success", title: "Profile Updated", message: "Your changes have been saved." });
    } catch (err) {
      addToast({ type: "error", title: "Update Failed", message: err.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────
  //  handleReset: reset toàn bộ form về giá trị gốc
  // ────────────────────────────────────────────
  const handleReset = () => {
    setDisplayName(user.displayName);
    setBio(user.bio || "");
    setAvatarPreview(undefined); // quay lại ảnh gốc từ store
    editor?.commands.setContent(user.bio || "");
  };

  // ────────────────────────────────────────────
  //  Xác định ảnh avatar sẽ hiển thị
  // ────────────────────────────────────────────
  //  avatarSrc = ảnh để show trong <img>
  //  hasAvatar = true nếu có ảnh (không show initials)
  // ────────────────────────────────────────────
  // avatarPreview = undefined → dùng user.avatarUrl (từ DB)
  // avatarPreview = null      → không có ảnh (show initials)
  // avatarPreview = string    → ảnh mới (Cloudinary URL)
  const avatarSrc = avatarPreview === undefined ? user.avatarUrl : avatarPreview;
  const hasAvatar = avatarSrc !== null && avatarSrc !== undefined && avatarSrc !== "";

  // ────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────
  return (
    <>
      {/* Styles cho ProseMirror (TipTap editor) */}
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; height: 0;
          pointer-events: none;
          color: rgba(149, 142, 154, 0.5);
        }
        .ProseMirror a { cursor: pointer; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #e5e1e4; }
        .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #e5e1e4; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror blockquote {
          border-left: 3px solid #8b5cf6;
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: #cbc3d7;
          font-style: italic;
        }
        .ProseMirror code {
          background: rgba(53, 52, 55, 0.8);
          color: #e9ddff;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .ProseMirror pre {
          background: #1b1b1d;
          border: 1px solid rgba(73, 68, 84, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          margin: 0.5rem 0;
        }
        .ProseMirror pre code {
          background: none; padding: 0; border-radius: 0;
        }
        .ProseMirror mark { border-radius: 0.125rem; padding: 0 0.125rem; }
        .ProseMirror p { margin-bottom: 0.25rem; }
      `}</style>

    <div className="space-y-panel-gap animate-fade-in px-10 py-10">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface mb-2">
          Edit Profile
        </h1>
        <p className="text-sm text-on-surface-variant/80">
          Manage your studio identity and profile information.
        </p>
      </div>

      {/* ─── Grid Layout: 2/3 trái + 1/3 phải ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-panel-gap items-start">
        {/* ═══ Left Column ═══ */}
        <div className="lg:col-span-2 space-y-panel-gap">

          {/* ── Card: Public Profile ── */}
          <section className="glass-panel p-8 rounded-xl">
            <h3 className="text-2xl font-semibold text-primary mb-6">Public Profile</h3>

            <div className="space-y-6">
              {/* ════════════════════════════════════════════ */}
              {/* Avatar Upload Section                      */}
              {/* ════════════════════════════════════════════ */}
              {/* Flow:
                  1. User click "Upload New" hoặc icon Camera
                  2. onclick → document.getElementById('avatar-upload').click()
                  3. File input onChange → handleAvatarUpload(file)
                  4. UploadService gửi file lên Cloudinary → nhận URL
                  5. setAvatarPreview(URL) → ảnh preview hiển thị
                  6. Khi user ấn Save, Cloudinary URL được gửi xuống API lưu vào DB
              */}
              <div className="flex flex-col sm:flex-row items-center gap-8 pb-6 border-b border-outline-variant/20">
                {/* Avatar circle + camera overlay */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-2xl">
                    {hasAvatar ? (
                      <img
                        src={avatarSrc}
                        alt={user.displayName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      // Fallback: chữ cái đầu của displayName
                      <div className="w-full h-full bg-primary-container flex items-center justify-center">
                        <span className="text-4xl font-bold text-on-primary-container">
                          {user.displayName?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Uploading spinner overlay */}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Camera icon button - click để chọn file ảnh mới */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-container text-on-primary-container rounded-lg flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
                  >
                    <Camera size={20} />
                    {/* Hidden file input - chỉ nhận file ảnh */}
                    <input
                      className="hidden"
                      id="avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                        // Reset value để cho phép chọn lại cùng file
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {/* Hướng dẫn + nút actions */}
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-sm font-medium text-on-surface mb-1">Profile Photo</h4>
                  <p className="text-xs text-on-surface-variant/70 mb-4">
                    Recommended: 400x400px. PNG or JPG. Max 5MB.
                  </p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                    {/* Upload New → trigger hidden input */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("avatar-upload").click()}
                      disabled={uploadingAvatar}
                    >
                      Upload New
                    </Button>

                    {/* Remove → xoá avatar */}
                    {hasAvatar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-status-danger hover:text-status-danger"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {/* Thông báo "pending changes" — URL đã upload lên Cloudinary nhưng chưa lưu vào DB */}
                  {avatarPreview !== undefined && !saving && (
                    <p className="text-xs text-primary mt-2">
                      * Avatar change pending — press Save to apply.
                    </p>
                  )}
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* Form Fields: Display Name, Username, Bio   */}
              {/* ════════════════════════════════════════════ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Display Name — editable */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant ml-1">
                    Display Name
                  </label>
                  <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 focus-within:border-primary focus-within:shadow-[0_0_0_2px_rgba(139,92,246,0.2)] transition-all">
                    <User size={20} className="text-on-surface-variant shrink-0" />
                    <input
                      className="bg-transparent border-none outline-none w-full text-base text-on-surface placeholder-outline/50"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>
                </div>

                {/* Username — read-only (không thể đổi từ profile) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant ml-1">
                    Username
                  </label>
                  <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 opacity-60 cursor-not-allowed">
                    <AtSign size={20} className="text-on-surface-variant shrink-0" />
                    <input
                      className="bg-transparent border-none outline-none w-full text-base text-on-surface"
                      type="text"
                      value={user.username}
                      disabled
                    />
                  </div>
                </div>

                {/* Bio — Rich Text Editor (TipTap) */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-on-surface-variant ml-1">
                    Bio
                  </label>
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl focus-within:border-primary focus-within:shadow-[0_0_0_2px_rgba(139,92,246,0.2)] transition-all overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-0.5 px-3 pt-2 pb-1.5 border-b border-outline-variant/20 flex-wrap">
                      {/* ── H2, H3 ── */}
                      <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("heading", { level: 2 }) ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <span className="text-[11px] font-extrabold leading-none">H2</span>
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("heading", { level: 3 }) ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <span className="text-[11px] font-bold leading-none">H3</span>
                      </button>
                      <span className="w-px h-5 bg-outline-variant/30 mx-1" />

                      {/* ── Bold, Italic, Underline, Strike ── */}
                      <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("bold") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <Bold size={16} />
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("italic") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <Italic size={16} />
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("underline") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <UnderlineIcon size={16} />
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("strike") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <Strikethrough size={16} />
                      </button>
                      <span className="w-px h-5 bg-outline-variant/30 mx-1" />

                      {/* ── List, Ordered List ── */}
                      <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("bulletList") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <List size={16} />
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("orderedList") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <ListOrdered size={16} />
                      </button>
                      <span className="w-px h-5 bg-outline-variant/30 mx-1" />

                      {/* ── Blockquote, Code, Link ── */}
                      <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("blockquote") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <Quote size={16} />
                      </button>
                      <button type="button" onClick={() => editor?.chain().focus().toggleCode().run()} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("code") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <Code size={16} />
                      </button>
                      <button type="button" onClick={() => { if (editor?.isActive("link")) { editor.chain().focus().unsetLink().run(); } else { const url = window.prompt("Enter URL:"); if (url) editor?.chain().focus().setLink({ href: url }).run(); }}} className={`p-1.5 rounded-lg transition-colors ${editor?.isActive("link") ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                        <LinkIcon size={16} />
                      </button>
                      <span className="w-px h-5 bg-outline-variant/30 mx-1" />

                      {/* ── Text Color (dropdown) ── */}
                      <div className="relative">
                        <button type="button" onClick={() => { setHighlightOpen(false); setColorOpen(!colorOpen); }} className={`p-1.5 rounded-lg transition-colors ${colorOpen ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                          <Palette size={16} />
                        </button>
                        {colorOpen && (
                          <div className="absolute top-full left-0 mt-1 z-20 bg-surface-container-high border border-outline-variant/30 rounded-xl p-2 shadow-xl flex gap-1.5">
                            {COLORS.map((c) => (
                              <button key={c.value} type="button" onClick={() => { editor?.chain().focus().setColor(c.value).run(); setColorOpen(false); }} className="w-6 h-6 rounded-full border border-outline-variant/40 hover:scale-110 transition-transform" style={{ backgroundColor: c.value }} title={c.label} />
                            ))}
                            <button type="button" onClick={() => { editor?.chain().focus().unsetColor().run(); setColorOpen(false); }} className="w-6 h-6 rounded-full border border-outline-variant/40 flex items-center justify-center text-[10px] text-on-surface-variant hover:scale-110 transition-transform" title="Remove color">
                              <Eraser size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ── Highlight (dropdown) ── */}
                      <div className="relative">
                        <button type="button" onClick={() => { setColorOpen(false); setHighlightOpen(!highlightOpen); }} className={`p-1.5 rounded-lg transition-colors ${highlightOpen ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}>
                          <Highlighter size={16} />
                        </button>
                        {highlightOpen && (
                          <div className="absolute top-full left-0 mt-1 z-20 bg-surface-container-high border border-outline-variant/30 rounded-xl p-2 shadow-xl flex gap-1.5">
                            {HIGHLIGHT_COLORS.map((c) => (
                              <button key={c.value} type="button" onClick={() => { editor?.chain().focus().toggleHighlight({ color: c.value }).run(); setHighlightOpen(false); }} className="w-6 h-6 rounded-full border border-outline-variant/40 hover:scale-110 transition-transform" style={{ backgroundColor: c.value }} title={c.label} />
                            ))}
                            <button type="button" onClick={() => { editor?.chain().focus().unsetHighlight().run(); setHighlightOpen(false); }} className="w-6 h-6 rounded-full border border-outline-variant/40 flex items-center justify-center text-[10px] text-on-surface-variant hover:scale-110 transition-transform" title="Remove highlight">
                              <Eraser size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="w-px h-5 bg-outline-variant/30 mx-1" />

                      {/* ── Clear Formatting ── */}
                      <button type="button" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" title="Clear formatting">
                        <Eraser size={16} />
                      </button>
                    </div>
                    {/* Editor Body */}
                    <div className="px-3 py-2">
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Card: Account Details ── */}
          <section className="glass-panel p-8 rounded-xl">
            <h3 className="text-2xl font-semibold text-primary mb-6">Account Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-on-surface-variant shrink-0" />
                  <span className="text-sm text-on-surface">Email</span>
                </div>
                <span className="text-sm text-on-surface-variant">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-on-surface-variant shrink-0" />
                  <span className="text-sm text-on-surface">Role</span>
                </div>
                <span className="text-sm text-on-surface-variant capitalize">{user.role.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-on-surface-variant shrink-0" />
                  <span className="text-sm text-on-surface">Member Since</span>
                </div>
                <span className="text-sm text-on-surface-variant">January 2026</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-on-surface-variant shrink-0" />
                  <span className="text-sm text-on-surface">Password</span>
                </div>
                <Button variant="ghost" size="sm">Change Password</Button>
              </div>
            </div>
          </section>
        </div>

        {/* ═══ Right Column ═══ */}
        <div className="space-y-panel-gap">
          {/* ── Card: Studio Status ── */}
          <section className="bg-primary-container/10 border border-primary/20 p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={80} className="text-primary" />
            </div>
            <div className="relative z-10">
              <h4 className="text-sm font-bold text-primary mb-1">Studio Status</h4>
              <p className="text-base text-on-surface mb-4 leading-relaxed">
                You are currently in{" "}
                <strong className="text-primary">Creative Mode</strong>.
                Profile changes will sync across all active projects.
              </p>
              <div className="flex items-center gap-2 text-primary">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider">Syncing Enabled</span>
              </div>
            </div>
          </section>

          {/* ── Desktop Save Actions ── */}
          <div className="hidden lg:flex flex-col gap-3">
            <Button onClick={handleSave} disabled={saving} className="w-full py-6 text-base">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button variant="ghost" onClick={handleReset} disabled={saving} className="w-full">
              Discard Changes
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Mobile Save Actions ─── */}
      <div className="flex flex-col gap-3 lg:hidden">
        <Button onClick={handleSave} disabled={saving} className="w-full py-4 text-base">
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </span>
          ) : (
            "Save All Changes"
          )}
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={saving} className="w-full py-4">
          Discard Changes
        </Button>
      </div>
    </div>
    </>
  );
}
