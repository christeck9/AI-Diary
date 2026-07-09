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

import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactApplicationContext

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
      // ── Init Android TTS engine (independent of JSI) ──
      try {
        tts = TextToSpeech(appContext.reactContext, this@AnimaVoiceModule)
      } catch (e: Exception) {
        android.util.Log.e("AnimaVoice", "Failed to initialize TextToSpeech engine", e)
      }

      // ── Install JSI bridge on the JS thread ──
      // Uses a two-strategy approach to support both architectures:
      //   Strategy 1 (New Arch / Bridgeless, RN 0.74+): ReactContext.javaScriptContextHolder directly
      //   Strategy 2 (Old Arch / Bridge): getCatalystInstance reflection chain
      try {
        System.loadLibrary("anima_voice")
        val reactContext = appContext.reactContext as? ReactContext ?: return@OnCreate

        // Get the JS Queue Thread in a compiling-safe manner
        val jsQueueThread = try {
          val config = reactContext.javaClass.getMethod("getReactQueueConfiguration").invoke(reactContext)
          config?.javaClass?.getMethod("getJSQueueThread").invoke(config)
        } catch (e: Exception) {
          null
        }

        val runOnJS = { runnable: Runnable ->
          if (jsQueueThread != null) {
            try {
              jsQueueThread.javaClass.getMethod("runOnQueue", Runnable::class.java).invoke(jsQueueThread, runnable)
            } catch (e: Exception) {
              reactContext.runOnJSQueueThread(runnable)
            }
          } else {
            reactContext.runOnJSQueueThread(runnable)
          }
        }

        runOnJS(Runnable {
          var runtimePtr: Long = 0L

          // Strategy 1: New Architecture (Bridgeless / Fabric)
          try {
            @Suppress("UNCHECKED_CAST")
            val holder = reactContext.javaClass.getMethod("getJavaScriptContextHolder").invoke(reactContext)
            runtimePtr = holder?.javaClass?.getMethod("get")?.invoke(holder) as? Long ?: 0L
          } catch (e: Exception) {
            android.util.Log.w("AnimaVoice", "New-arch JSI access failed, trying legacy bridge: ${e.message}")
          }

          // Strategy 2: Old Architecture (Bridge via CatalystInstance)
          if (runtimePtr == 0L) {
            try {
              val catalystInstance = reactContext.javaClass.getMethod("getCatalystInstance").invoke(reactContext)
              val jsHolder = catalystInstance?.javaClass?.getMethod("getJavaScriptContextHolder")?.invoke(catalystInstance)
              runtimePtr = jsHolder?.javaClass?.getMethod("get")?.invoke(jsHolder) as? Long ?: 0L
            } catch (e: Exception) {
              android.util.Log.w("AnimaVoice", "Legacy-arch JSI access also failed: ${e.message}")
            }
          }

          if (runtimePtr != 0L) {
            nativeInstallJSI(runtimePtr)
            android.util.Log.i("AnimaVoice", "✅ JSI audio bridge installed (ptr=$runtimePtr)")
          } else {
            android.util.Log.w("AnimaVoice", "⚠️ JSI runtime pointer is 0. Native Oboe audio unavailable, expo-speech fallback will be used.")
          }
        })
      } catch (e: Exception) {
        android.util.Log.e("AnimaVoice", "Failed to load native library or schedule JSI install", e)
      }
    }

    AsyncFunction("uninstallJSI") {
      nativeUninstallJSI()
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
  private external fun nativeUninstallJSI()
}
