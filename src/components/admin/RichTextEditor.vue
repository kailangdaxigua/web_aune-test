<script setup>
/**
 * Rich Text Editor Component using Tiptap
 * Aune Audio CMS
 */
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始输入内容...'
  },
  minHeight: {
    type: String,
    default: '200px'
  }
})

const emit = defineEmits(['update:modelValue'])

// Initialize editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4]
      }
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-gold-500 underline hover:text-gold-400'
      }
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full rounded-lg'
      }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    Underline
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-invert prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

// Watch for external changes
watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, false)
  }
})

// Cleanup
onBeforeUnmount(() => {
  editor.value?.destroy()
})

/**
 * Set link
 */
function setLink() {
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('输入链接地址:', previousUrl)
  
  if (url === null) return
  
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

/**
 * Add image
 */
function addImage() {
  const url = window.prompt('输入图片地址:')
  
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run()
  }
}
</script>

<template>
  <div class="rich-text-editor border border-aune-600/50 rounded-lg overflow-hidden">
    <!-- Toolbar -->
    <div v-if="editor" class="flex flex-wrap items-center gap-1 p-2 bg-aune-800/50 border-b border-aune-600/50">
      <!-- Text Style -->
      <div class="flex items-center gap-1 pr-2 border-r border-aune-600/50">
        <button
          type="button"
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'bg-aune-600': editor.isActive('bold') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="粗体"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'bg-aune-600': editor.isActive('italic') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="斜体"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleUnderline().run()"
          :class="{ 'bg-aune-600': editor.isActive('underline') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="下划线"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8v6a5 5 0 0010 0V8M5 20h14" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleStrike().run()"
          :class="{ 'bg-aune-600': editor.isActive('strike') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="删除线"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5c-1.5 0-3 .5-3 2s1.5 2 3 2 3 .5 3 2-1.5 2-3 2" />
          </svg>
        </button>
      </div>
      
      <!-- Headings -->
      <div class="flex items-center gap-1 pr-2 border-r border-aune-600/50">
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="{ 'bg-aune-600': editor.isActive('heading', { level: 2 }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors text-white text-xs font-bold"
          title="标题2"
        >
          H2
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :class="{ 'bg-aune-600': editor.isActive('heading', { level: 3 }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors text-white text-xs font-bold"
          title="标题3"
        >
          H3
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
          :class="{ 'bg-aune-600': editor.isActive('heading', { level: 4 }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors text-white text-xs font-bold"
          title="标题4"
        >
          H4
        </button>
      </div>
      
      <!-- Lists -->
      <div class="flex items-center gap-1 pr-2 border-r border-aune-600/50">
        <button
          type="button"
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'bg-aune-600': editor.isActive('bulletList') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="无序列表"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'bg-aune-600': editor.isActive('orderedList') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="有序列表"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h10m-10 4h10M4 6v.01M4 12v.01M4 18v.01" />
          </svg>
        </button>
      </div>
      
      <!-- Alignment -->
      <div class="flex items-center gap-1 pr-2 border-r border-aune-600/50">
        <button
          type="button"
          @click="editor.chain().focus().setTextAlign('left').run()"
          :class="{ 'bg-aune-600': editor.isActive({ textAlign: 'left' }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="左对齐"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h16" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().setTextAlign('center').run()"
          :class="{ 'bg-aune-600': editor.isActive({ textAlign: 'center' }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="居中"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M4 18h16" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().setTextAlign('right').run()"
          :class="{ 'bg-aune-600': editor.isActive({ textAlign: 'right' }) }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="右对齐"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M10 12h10M4 18h16" />
          </svg>
        </button>
      </div>
      
      <!-- Insert -->
      <div class="flex items-center gap-1 pr-2 border-r border-aune-600/50">
        <button
          type="button"
          @click="setLink"
          :class="{ 'bg-aune-600': editor.isActive('link') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="插入链接"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="addImage"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="插入图片"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'bg-aune-600': editor.isActive('blockquote') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="引用"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ 'bg-aune-600': editor.isActive('codeBlock') }"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors"
          title="代码块"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>
      
      <!-- Undo/Redo -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        
        <button
          type="button"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="p-2 rounded hover:bg-aune-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Editor Content -->
    <EditorContent 
      :editor="editor" 
      class="p-4 bg-aune-800/30"
      :style="{ minHeight: minHeight }"
    />
  </div>
</template>

<style>
.rich-text-editor .ProseMirror {
  outline: none;
  min-height: inherit;
}

.rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #737384;
  pointer-events: none;
  height: 0;
}

/* Prose styles for dark theme */
.rich-text-editor .prose {
  color: #d9d9de;
}

.rich-text-editor .prose h1,
.rich-text-editor .prose h2,
.rich-text-editor .prose h3,
.rich-text-editor .prose h4 {
  color: #fff;
}

.rich-text-editor .prose a {
  color: #d4a056;
}

.rich-text-editor .prose blockquote {
  border-left-color: #d4a056;
  color: #b8b8c1;
}

.rich-text-editor .prose code {
  background: #41414a;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.rich-text-editor .prose pre {
  background: #1a1a1f;
  padding: 1em;
  border-radius: 8px;
}

.rich-text-editor .prose pre code {
  background: transparent;
  padding: 0;
}

.rich-text-editor .prose ul,
.rich-text-editor .prose ol {
  padding-left: 1.5em;
}

.rich-text-editor .prose li {
  margin: 0.5em 0;
}

.rich-text-editor .prose hr {
  border-color: #4c4c57;
}
</style>

