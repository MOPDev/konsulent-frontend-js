/// <reference types="vite/client" />

declare module 'lodash-es'

declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
}
