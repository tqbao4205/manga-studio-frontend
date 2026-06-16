import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered,
} from 'lucide-react'

const ToolbarButton = ({ onClick, active, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded-lg transition-colors ${
      active
        ? 'bg-primary/20 text-primary'
        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
    }`}
  >
    {children}
  </button>
)

export function RichEditor({ value = '', onChange, placeholder = 'Write something...', minHeight = '120px', className = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'outline-none text-sm text-on-surface leading-relaxed px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className={`rich-editor bg-surface-container-lowest border border-outline-variant/50 focus-within:border-primary focus-within:shadow-[0_0_0_1px_rgba(139,92,246,0.3)] transition-all rounded-lg overflow-hidden ${className}`}>
      <style>{`
        .rich-editor .ProseMirror ul { list-style-type: disc; padding-left: 1.75rem; }
        .rich-editor .ProseMirror ol { list-style-type: decimal; padding-left: 1.75rem; }
        .rich-editor .ProseMirror li { margin-bottom: 0.25rem; }
        .rich-editor .ProseMirror li p { margin: 0; }
      `}</style>
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1.5 border-b border-outline-variant/20 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-outline-variant/30 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
