<script setup>
/**
 * CustomSelect Component
 * 高端品牌风格的自定义下拉选择组件
 * 支持过渡动画、圆角和品牌色
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    required: true,
    // [{ value: '', label: '', icon?: '' }]
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg
    validator: v => ['sm', 'md', 'lg'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const selectRef = ref(null)

// 当前选中项
const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

// 显示文本
const displayText = computed(() => {
  return selectedOption.value?.label || props.placeholder
})

// 尺寸类
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2.5 px-4 text-base',
    lg: 'py-3 px-5 text-lg'
  }
  return sizes[props.size]
})

// 切换下拉
function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

// 选择选项
function selectOption(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

// 点击外部关闭
function handleClickOutside(event) {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

// 键盘导航
function handleKeydown(event) {
  if (!isOpen.value) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      isOpen.value = true
    }
    return
  }
  
  const currentIndex = props.options.findIndex(opt => opt.value === props.modelValue)
  
  switch (event.key) {
    case 'Escape':
      isOpen.value = false
      break
    case 'ArrowDown':
      event.preventDefault()
      if (currentIndex < props.options.length - 1) {
        selectOption(props.options[currentIndex + 1])
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (currentIndex > 0) {
        selectOption(props.options[currentIndex - 1])
      }
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      isOpen.value = false
      break
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div 
    ref="selectRef"
    class="custom-select relative"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
  >
    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggle"
      @keydown="handleKeydown"
      :disabled="disabled"
      :class="[
        'w-full flex items-center justify-between gap-2 rounded-xl transition-all duration-200',
        'bg-aune-800/60 backdrop-blur-sm border text-left',
        isOpen 
          ? 'border-gold-500/60 ring-2 ring-gold-500/20' 
          : 'border-aune-600/40 hover:border-aune-500/60',
        sizeClasses
      ]"
    >
      <!-- Selected Value -->
      <span 
        :class="[
          'flex items-center gap-2 truncate',
          selectedOption ? 'text-white' : 'text-aune-400'
        ]"
      >
        <!-- Icon if available -->
        <span 
          v-if="selectedOption?.icon" 
          class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
          v-html="selectedOption.icon"
        ></span>
        {{ displayText }}
      </span>
      
      <!-- Arrow Icon -->
      <svg 
        :class="[
          'w-5 h-5 text-aune-400 transition-transform duration-200 flex-shrink-0',
          isOpen ? 'rotate-180' : ''
        ]"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-2"
    >
      <div 
        v-if="isOpen"
        class="absolute z-50 w-full mt-2 py-2 bg-aune-800/95 backdrop-blur-xl border border-aune-600/50 rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
      >
        <div class="max-h-64 overflow-y-auto custom-scrollbar">
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            @click="selectOption(option)"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150',
              option.value === modelValue 
                ? 'bg-gold-500/20 text-gold-400' 
                : 'text-aune-200 hover:bg-aune-700/50 hover:text-white'
            ]"
          >
            <!-- Option Icon -->
            <span 
              v-if="option.icon" 
              class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
              v-html="option.icon"
            ></span>
            
            <!-- Option Label -->
            <span class="flex-1 truncate">{{ option.label }}</span>
            
            <!-- Check Mark -->
            <svg 
              v-if="option.value === modelValue"
              class="w-5 h-5 text-gold-500 flex-shrink-0"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(212, 160, 86, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 160, 86, 0.5);
}
</style>

