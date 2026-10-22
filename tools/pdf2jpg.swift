// Convierte cada página de un PDF en un JPG (para los mapas por territorio).
// Uso: swift tools/pdf2jpg.swift archivo.pdf carpeta_salida [ancho_px=2400] [calidad=0.8]
import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
  print("Uso: swift pdf2jpg.swift archivo.pdf carpeta_salida [ancho] [calidad]"); exit(1)
}
let salida = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: salida, withIntermediateDirectories: true)
let ancho = args.count > 3 ? Double(args[3]) ?? 2400 : 2400
let calidad = args.count > 4 ? Double(args[4]) ?? 0.8 : 0.8
print("Páginas:", doc.pageCount)
for i in 0..<doc.pageCount {
  guard let page = doc.page(at: i) else { continue }
  let caja = page.bounds(for: .mediaBox)
  let escala = ancho / Double(max(caja.width, caja.height))
  let w = Int(Double(caja.width) * escala), h = Int(Double(caja.height) * escala)
  guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4,
                                   hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
        let ctx = NSGraphicsContext(bitmapImageRep: rep) else { continue }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = ctx
  let cg = ctx.cgContext
  cg.setFillColor(NSColor.white.cgColor)
  cg.fill(CGRect(x: 0, y: 0, width: w, height: h))
  cg.scaleBy(x: CGFloat(escala), y: CGFloat(escala))
  page.draw(with: .mediaBox, to: cg)
  NSGraphicsContext.restoreGraphicsState()
  let nombre = salida.appendingPathComponent(String(format: "pagina-%02d.jpg", i + 1))
  if let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: calidad]) {
    try? jpg.write(to: nombre)
    print(nombre.lastPathComponent, w, "x", h, jpg.count / 1024, "KB")
  }
}
