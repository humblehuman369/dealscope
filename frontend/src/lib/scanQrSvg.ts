import { cache } from 'react'
import QRCode from 'qrcode'
import { SCAN_QR_SIZE_PX } from '@/lib/scanQr'

function stripXmlDeclaration(svg: string): string {
  return svg.replace(/^\s*<\?xml[^?]*\?>\s*/i, '')
}

export const generateScanQrSvg = cache(async (url: string): Promise<string> => {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: SCAN_QR_SIZE_PX,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
  return stripXmlDeclaration(svg)
})
