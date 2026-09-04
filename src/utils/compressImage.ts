export function compressImage(file: File, maxDimension = 1920, quality = 0.8): Promise<File> {
	return new Promise((resolve) => {
		if (!file.type.startsWith('image/')) {
			resolve(file)
			return
		}

		const img = new Image()
		const url = URL.createObjectURL(file)
		img.onload = () => {
			URL.revokeObjectURL(url)

			let { width, height } = img
			if (width <= maxDimension && height <= maxDimension && file.type === 'image/jpeg' && file.size < 500 * 1024) {
				resolve(file)
				return
			}

			if (width > maxDimension) {
				height = Math.round(height * (maxDimension / width))
				width = maxDimension
			}
			if (height > maxDimension) {
				width = Math.round(width * (maxDimension / height))
				height = maxDimension
			}

			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext('2d')
			if (!ctx) { resolve(file); return }
			ctx.drawImage(img, 0, 0, width, height)

			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
					} else {
						resolve(file)
					}
				},
				'image/jpeg',
				quality,
			)
		}
		img.onerror = () => {
			URL.revokeObjectURL(url)
			resolve(file)
		}
		img.src = url
	})
}