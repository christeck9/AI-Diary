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
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.android.gms.tasks.Tasks

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

    @ReactMethod
    fun extractTextFromPdfPage(uriString: String, pageIndex: Int, promise: Promise) {
        var parcelFileDescriptor: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null
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
            if (pageIndex < 0 || pageIndex >= renderer.pageCount) {
                promise.reject("ERR_INVALID_PAGE", "Page index out of bounds: $pageIndex (total pages: ${renderer.pageCount})")
                return
            }

            val page = renderer.openPage(pageIndex)
            
            // Render at slightly higher resolution (1024px) for better OCR recognition accuracy
            val targetWidth = 1024
            val originalWidth = page.width
            val originalHeight = page.height
            val scale = targetWidth.toFloat() / originalWidth.toFloat()
            val targetHeight = (originalHeight * scale).toInt()

            val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            page.close()

            // Process image with ML Kit Text Recognition
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            val image = InputImage.fromBitmap(bitmap, 0)
            val resultText = Tasks.await(recognizer.process(image))
            
            bitmap.recycle()
            promise.resolve(resultText.text)

        } catch (e: Exception) {
            promise.reject("ERR_OCR_FAILED", e.message, e)
        } finally {
            try {
                renderer?.close()
            } catch (e: Exception) {}
            try {
                parcelFileDescriptor?.close()
            } catch (e: Exception) {}
        }
    }

    @ReactMethod
    fun extractTextFromImage(uriString: String, promise: Promise) {
        try {
            val uriObj = Uri.parse(uriString)
            val bitmap = if (uriString.startsWith("content://")) {
                reactApplicationContext.contentResolver.openInputStream(uriObj).use { inputStream ->
                    android.graphics.BitmapFactory.decodeStream(inputStream)
                }
            } else {
                val cleanPath = if (uriString.startsWith("file://")) uriString.substring(7) else uriString
                val file = File(cleanPath)
                android.graphics.BitmapFactory.decodeFile(file.absolutePath)
            }

            if (bitmap == null) {
                promise.reject("ERR_IMAGE_LOAD", "Failed to load or decode image bitmap")
                return
            }

            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            val image = InputImage.fromBitmap(bitmap, 0)
            val resultText = Tasks.await(recognizer.process(image))
            
            bitmap.recycle()
            promise.resolve(resultText.text)
        } catch (e: Exception) {
            promise.reject("ERR_OCR_FAILED", e.message, e)
        }
    }
}
