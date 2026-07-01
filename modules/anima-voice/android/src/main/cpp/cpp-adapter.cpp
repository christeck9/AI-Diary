#include <jni.h>
#include <jsi/jsi.h>
#include "AudioPlayer.h"
#include <memory>

using namespace facebook::jsi;

static std::unique_ptr<AudioPlayer> player;

extern "C" JNIEXPORT void JNICALL
Java_com_christeck_animavoice_AnimaVoiceModule_nativeInstallJSI(JNIEnv *env, jobject thiz, jlong jsiPtr) {
    Runtime *runtime = reinterpret_cast<Runtime *>(jsiPtr);
    if (!runtime) return;

    if (!player) {
        player = std::make_unique<AudioPlayer>();
        player->start();
    }

    // global.animaFeedAudioChunk(arrayBuffer)
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
}
