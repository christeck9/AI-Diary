#include <android/hardware_buffer.h>
#include <android/log.h>
#include <jni.h>
#include <mutex>

#define LOG_TAG "VisionBridge_Sovereign"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

/**
 * Sovereign Protocol v4.0 - Vision Bridge
 * Implementation of Zero-Copy image transfer using AHardwareBuffer.
 * 
 * This bridge allows the camera system to pass a hardware buffer directly to the 
 * vision processing unit without copying memory, utilizing AHARDWAREBUFFER_USAGE_CPU_READ_OFTEN.
 */

class VisionBridge {
private:
    AHardwareBuffer* mBuffer = nullptr;
    void* mData = nullptr;
    std::mutex mMutex;

public:
    VisionBridge() = default;
    ~VisionBridge() {
        cleanup();
    }

    void setBuffer(AHardwareBuffer* buffer) {
        std::lock_guard<std::mutex> lock(mMutex);
        cleanup();

        mBuffer = buffer;
        if (mBuffer) {
            // Lock the buffer for CPU reading. 
            // The buffer must have been created with AHARDWAREBUFFER_USAGE_CPU_READ_OFTEN.
            int result = AHardwareBuffer_lock(mBuffer, AHARDWAREBUFFER_USAGE_CPU_READ_OFTEN, nullptr, nullptr, &mData);
            if (result != 0) {
                LOGE("Failed to lock AHardwareBuffer: %d", result);
                mBuffer = nullptr;
                mData = nullptr;
            } else {
                LOGI("Vision Bridge: Zero-Copy buffer locked successfully.");
            }
        }
    }

    void cleanup() {
        if (mData) {
            AHardwareBuffer_unlock(mBuffer, nullptr);
            mData = nullptr;
        }
        if (mBuffer) {
            AHardwareBuffer_release(mBuffer);
            mBuffer = nullptr;
        }
    }

    void* getBufferPointer() {
        std::lock_guard<std::mutex> lock(mMutex);
        return mData;
    }

    AHardwareBuffer* getHardwareBuffer() {
        std::lock_guard<std::mutex> lock(mMutex);
        return mBuffer;
    }
};

// Singleton instance for the bridge
static VisionBridge g_visionBridge;

extern "C" {

// JNI method to update the buffer from the Java/Kotlin camera side
JNIEXPORT void JNICALL
Java_com_aisanctuary_app_VisionBridge_nativeSetBuffer(JNIEnv* env, jobject thiz, jobject hardwareBuffer) {
    if (hardwareBuffer == nullptr) {
        g_visionBridge.cleanup();
        return;
    }

    // In Android NDK, AHardwareBuffer is represented as a jobject.
    // We use AHardwareBuffer_fromHardwareBuffer to get the native pointer.
    AHardwareBuffer* buffer = AHardwareBuffer_fromHardwareBuffer(env, hardwareBuffer);
    if (buffer) {
        g_visionBridge.setBuffer(buffer);
    } else {
        LOGE("Failed to acquire AHardwareBuffer from jobject");
    }
}

// JNI method to get the raw pointer for the vision processing engine
JNIEXPORT jlong JNICALL
Java_com_aisanctuary_app_VisionBridge_nativeGetBufferPointer(JNIEnv* env, jobject thiz) {
    return reinterpret_cast<jlong>(g_visionBridge.getBufferPointer());
}

// JNI method to release the buffer
JNIEXPORT void JNICALL
Java_com_aisanctuary_app_VisionBridge_nativeReleaseBuffer(JNIEnv* env, jobject thiz) {
    g_visionBridge.cleanup();
}

}