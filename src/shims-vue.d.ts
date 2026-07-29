/// <reference types="vite/client" />
/// <reference types="geojson" />

declare module 'lodash-es'

declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<object, object, any>
	export default component
}
