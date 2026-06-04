package com.christeck.aidiary

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.io.File
import java.io.FileOutputStream

class PdfToImageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PdfToImageModule"
    }

    @ReactMethod
    fun convertPdfToImages(uriString: String, maxPages: Int, promise: Promise) {
        var parcelFileDescriptor: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null
        val imagePaths: WritableArray = Arguments.createArray()

        try {
            val uriObj = Uri.parse(uriString)
            parcelFileDescriptor = if (uriString.startsWith("content://")) {
                reactApplicationContext.contentResolver.openFileDescriptor(uriObj, "r")
            } else {
                val cleanPath = if (uriString.startsWith("file://")) uriString.substring(7) else uriString
                val file = File(cleanPath)
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            }

            if (parcelFileDescriptor == null) {
                promise.reject("ERR_PDF_OPEN", "Failed to open PDF File Descriptor")
                return
            }

            renderer = PdfRenderer(parcelFileDescriptor)
            val pageCount = renderer.pageCount
            val pagesToProcess = Math.min(pageCount, Math.max(1, maxPages))

            val cacheDir = reactApplicationContext.cacheDir
            
            for (i in 0 until pagesToProcess) {
                val page = renderer.openPage(i)
                
                // Target width matching optimized max image dimension (768px) for optimal CPU/GPU projection
                val targetWidth = 768
                val originalWidth = page.width
                val originalHeight = page.height
                val scale = targetWidth.toFloat() / originalWidth.toFloat()
                val targetHeight = (originalHeight * scale).toInt()

                val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                canvas.drawColor(Color.WHITE) // PDF backgrounds are transparent; force white to prevent black background issues
                
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                
                val outputFile = File(cacheDir, "pdf_page_${System.currentTimeMillis()}_$i.jpg")
                FileOutputStream(outputFile).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 65, out) // Optimized compression (65% quality)
                }
                
                bitmap.recycle()
                page.close()

                imagePaths.pushString("file://${outputFile.absolutePath}")
            }

            promise.resolve(imagePaths)

        } catch (e: Exception) {
            promise.reject("ERR_PDF_CONVERSION", e.message, e)
        } finally {
            try {
                renderer?.close()
            } catch (e: Exception) {}
            try {
                parcelFileDescriptor?.close()
            } catch (e: Exception) {}
        }
    }
}
