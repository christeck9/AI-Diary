#include <jni.h>
#include <jsi/jsi.h>
#include "AudioPlayer.h"
#include <memory>

using namespace facebook::jsi;

static std::unique_ptr<AudioPlayer> player;
static bool g_isJSIReady = false; // Global flag for JS to check

extern "C" JNIEXPORT jboolean JNICALL
Java_com_christeck_animavoice_AnimaVoiceModule_nativeInstallJSI(JNIEnv *env, jobject thiz, jlong jsiPtr) {
    Runtime *runtime = reinterpret_cast<Runtime *>(jsiPtr);
    if (!runtime) return false;

    bool playerReady = false;

    if (!player) {
        player = std::make_unique<AudioPlayer>();
        if (!player->start()) {
            __android_log_print(ANDROID_LOG_ERROR, "AnimaVoice", "❌ AudioPlayer start() FAILED - check logcat for Oboe error");
            player.reset();
            return false; // Signal failure to Kotlin
        }
        playerReady = true;
    }

    // Install JSI APIs only if player is ready
    auto feedAudioChunk = Function::createFromHostFunction(
        *runtime,
        PropNameID::forAscii(*runtime, "animaFeedAudioChunk"),
        1,
        [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            if (count > 0 && args[0].isObject()) {
                Object obj = args[0].getObject(rt);
                if (obj.isArrayBuffer(rt)) {
                    ArrayBuffer buffer = obj.getArrayBuffer(rt);
                    float* data = reinterpret_cast<float*>(buffer.data(rt));
                    int numFrames = buffer.size(rt) / sizeof(float);
                    
                    if (player) {
                        player->feedAudio(data, numFrames);
                    }
                }
            }
            return Value::undefined();
        }
    );
    runtime->global().setProperty(*runtime, "animaFeedAudioChunk", std::move(feedAudioChunk));

    // global.animaFeedAudioChunkInt16(arrayBuffer)
    auto feedAudioChunkInt16 = Function::createFromHostFunction(
        *runtime,
        PropNameID::forAscii(*runtime, "animaFeedAudioChunkInt16"),
        1,
        [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            if (count > 0 && args[0].isObject()) {
                Object obj = args[0].getObject(rt);
                if (obj.isArrayBuffer(rt)) {
                    ArrayBuffer buffer = obj.getArrayBuffer(rt);
                    int16_t* data = reinterpret_cast<int16_t*>(buffer.data(rt));
                    int numSamples = buffer.size(rt) / sizeof(int16_t);
                    
                    std::vector<float> floatData(numSamples);
                    for (int i = 0; i < numSamples; i++) {
                        floatData[i] = data[i] / 32768.0f;
                    }

                    if (player) {
                        player->feedAudio(floatData.data(), numSamples);
                    }
                }
            }
            return Value::undefined();
        }
    );
    runtime->global().setProperty(*runtime, "animaFeedAudioChunkInt16", std::move(feedAudioChunkInt16));

    // global.animaInterruptAudio()
    auto interruptAudio = Function::createFromHostFunction(
        *runtime,
        PropNameID::forAscii(*runtime, "animaInterruptAudio"),
        0,
        [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            if (player) {
                player->interrupt();
            }
            return Value::undefined();
        }
    );
    runtime->global().setProperty(*runtime, "animaInterruptAudio", std::move(interruptAudio));

    // Expose global ready flag
    g_isJSIReady = true;
    auto readyValue = Boolean::createFromLiteral(*runtime, true);
    runtime->global().setProperty(*runtime, "animaJSIReady", std::move(readyValue));

    // Signal to JS that JSI audio is ready
    __android_log_print(ANDROID_LOG_INFO, "AnimaVoice", "✅ JSI audio bridge ready");
    return true;
}

// 🛡️ Cleanup JSI: Saneamiento nativo (KiloAuditC-JSI)
extern "C" JNIEXPORT void JNICALL
Java_com_christeck_animavoice_AnimaVoiceModule_nativeUninstallJSI(JNIEnv *env, jobject thiz) {
    if (player) {
        player->stop();
        player.reset();
    }
}
