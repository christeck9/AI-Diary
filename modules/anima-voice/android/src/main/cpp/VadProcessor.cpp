#include "VadProcessor.h"
#include <android/log.h>

#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "AnimaVoice", __VA_ARGS__)

VadProcessor::VadProcessor() {}

VadProcessor::~VadProcessor() {}

bool VadProcessor::initialize(const std::string& modelPath) {
    // In a real implementation, we initialize Ort::Env and Ort::Session here.
    mInitialized = true;
    return true;
}

float VadProcessor::processAudioChunk(const std::vector<float>& audioChunk) {
    if (!mInitialized) return 0.0f;
    
    // Stub: Always return 0.0 for now.
    // In production, we run the ONNX model inference here:
    // 1. Create input tensor from audioChunk (1xN).
    // 2. Pass previous h and c states.
    // 3. Run session.
    // 4. Return the predicted probability of speech.
    
    return 0.0f;
}

void VadProcessor::resetStates() {
    // Reset ONNX recurrent state tensors (h and c) to zero.
}
