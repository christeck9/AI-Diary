package com.christeck.animavoice

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.os.Bundle
import java.io.File
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.UUID

class AnimaVoiceModule : Module(), TextToSpeech.OnInitListener {
  private var tts: TextToSpeech? = null
  private var isTtsInitialized = false
  
  // Track active TTS promises and their corresponding temp files
  private val activePromises = ConcurrentHashMap<String, Pair<Promise, File>>()
  
  override fun onInit(status: Int) {
    if (status == TextToSpeech.SUCCESS) {
      isTtsInitialized = true

      tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(id: String?) {}
        
        override fun onDone(id: String?) {
          id?.let { utteranceId ->
            val pair = activePromises.remove(utteranceId)
            pair?.let { (promise, tempFile) ->
              try {
                if (tempFile.exists()) {
                  val bytes = tempFile.readBytes()
                  // Skip WAV header (usually 44 bytes)
                  val pcmBytes = if (bytes.size > 44) bytes.sliceArray(44 until bytes.size) else bytes
                  promise.resolve(pcmBytes)
                  tempFile.delete()
                } else {
                  promise.reject("FILE_NOT_FOUND", "Synthesized file not found", null)
                }
              } catch (e: Exception) {
                promise.reject("READ_ERROR", "Error reading synthesized file", e)
              }
            }
          }
        }
        
        override fun onError(id: String?) {
          id?.let { utteranceId ->
            val pair = activePromises.remove(utteranceId)
            pair?.let { (promise, tempFile) ->
              promise.reject("TTS_ERROR", "Error synthesizing speech", null)
              if (tempFile.exists()) {
                tempFile.delete()
              }
            }
          }
        }
      })
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AnimaVoice")
    
    OnCreate {
      try {
        tts = TextToSpeech(appContext.reactContext, this@AnimaVoiceModule)
        System.loadLibrary("anima_voice")
        val reactContext = appContext.reactContext
        val catalystInstance = reactContext?.javaClass?.getMethod("getCatalystInstance")?.invoke(reactContext)
        val jsContextHolder = catalystInstance?.javaClass?.getMethod("getJavaScriptContextHolder")?.invoke(catalystInstance)
        val runtimePtr = jsContextHolder?.javaClass?.getMethod("get")?.invoke(jsContextHolder) as? Long ?: 0L
        if (runtimePtr != 0L) {
          nativeInstallJSI(runtimePtr)
        }
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }

    AsyncFunction("synthesizeNativeToPCM") { text: String, lang: String, promise: Promise ->
      if (!isTtsInitialized || tts == null) {
        promise.reject("TTS_NOT_READY", "TextToSpeech engine not initialized", null)
        return@AsyncFunction
      }

      val locale = Locale.forLanguageTag(lang.replace("_", "-"))
      tts?.language = locale

      val cacheDir = appContext.reactContext?.cacheDir
      val tempFile = File(cacheDir, "anima_native_tts_${System.currentTimeMillis()}_${UUID.randomUUID()}.wav")
      val utteranceId = "anima_${UUID.randomUUID()}"

      activePromises[utteranceId] = Pair(promise, tempFile)

      val params = Bundle()
      val result = tts?.synthesizeToFile(text, params, tempFile, utteranceId)
      if (result != TextToSpeech.SUCCESS) {
        activePromises.remove(utteranceId)
        promise.reject("TTS_FAILED", "Failed to queue synthesizeToFile", null)
      }
    }
  }

  private external fun nativeInstallJSI(jsiPtr: Long)
}
