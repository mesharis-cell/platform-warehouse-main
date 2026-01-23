/**
 * Check for Transformed Assets
 * Helper for scan flow to detect reskinned/transformed assets
 */

export interface AssetTransformationInfo {
  isTransformed: boolean
  oldAsset?: {
    id: string
    name: string
    qrCode: string
  }
  newAsset?: {
    id: string
    name: string
    qrCode: string
  }
}

/**
 * Check if scanned asset is transformed
 * Returns transformation info if asset has been reskinned
 */
export async function checkTransformedAsset(
  assetId: string
): Promise<AssetTransformationInfo> {
  try {
    const response = await fetch(`/api/assets/${assetId}`)
    const asset = await response.json()

    // Check if this asset has been transformed (replaced by new asset)
    if (asset.status === 'TRANSFORMED' && asset.transformedTo) {
      // Fetch the new asset
      const newAssetResponse = await fetch(`/api/assets/${asset.transformedTo}`)
      const newAsset = await newAssetResponse.json()

      return {
        isTransformed: true,
        oldAsset: {
          id: asset.id,
          name: asset.name,
          qrCode: asset.qrCode,
        },
        newAsset: {
          id: newAsset.id,
          name: newAsset.name,
          qrCode: newAsset.qrCode,
        },
      }
    }

    return { isTransformed: false }
  } catch (error) {
    console.error('Error checking transformed asset:', error)
    return { isTransformed: false }
  }
}

/**
 * Example usage in scan flow:
 * 
 * const assetId = extractAssetIdFromQR(qrCode)
 * const transformInfo = await checkTransformedAsset(assetId)
 * 
 * if (transformInfo.isTransformed) {
 *   showTransformedAssetWarning(transformInfo)
 *   return // Don't proceed with scan
 * }
 * 
 * // Continue with normal scan flow
 */
