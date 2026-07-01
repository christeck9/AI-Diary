#pragma once

#include <vector>
#include <mutex>
#include <atomic>

// This is a stub for the Silero VAD ONNX model runner.
// In a full implementation, we would include <onnxruntime_cxx_api.h>
// and load "silero_vad.onnx".

class VadProcessor {
public:
    VadProcessor();
    ~VadProcessor();

    // Initializes the ONNX Runtime session and loads the Silero model.
    bool initialize(const std::string& modelPath);

    // Feeds audio from the microphone (32ms chunks) and returns probability of speech (0.0 to 1.0).
    float processAudioChunk(const std::vector<float>& audioChunk);

    // Resets the VAD recurrent states.
    void resetStates();

private:
    bool mInitialized = false;
    // ONNX Runtime environment and session variables would go here.
};
