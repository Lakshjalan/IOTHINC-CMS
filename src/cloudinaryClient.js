/**
 * Helper utility to generate Cloudinary optimized image URLs.
 */
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export function getCloudinaryUrl(publicId, options = {}) {
  if (!publicId) return ''
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId

  const transformations = []
  if (options.width) transformations.push(`w_${options.width}`)
  if (options.height) transformations.push(`h_${options.height}`)
  if (options.crop) transformations.push(`c_${options.crop}`)
  transformations.push('f_auto', 'q_auto')

  const transformString = transformations.join(',')
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${publicId}`
}
