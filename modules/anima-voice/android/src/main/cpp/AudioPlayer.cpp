#include "AudioPlayer.h"
#include <android/log.h>

#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "AnimaVoice", __VA_ARGS__)

AudioPlayer::AudioPlayer() {}

AudioPlayer::~AudioPlayer() {
    stop();
}

bool AudioPlayer::start() {
    oboe::AudioStreamBuilder builder;
    builder.setDirection(oboe::Direction::Output)
           ->setPerformanceMode(oboe::PerformanceMode::LowLatency)
           ->setSharingMode(oboe::SharingMode::Exclusive)
           ->setFormat(oboe::AudioFormat::Float)
           ->setChannelCount(1) // Mono
           ->setSampleRate(24000) // Inform Oboe that our DATA is 24kHz
           ->setSampleRateConversionQuality(oboe::SampleRateConversionQuality::Medium) // Let Oboe handle resampling to device native hardware rate (Fast Path)
           ->setDataCallback(this);

    oboe::Result result = builder.openStream(mStream);
    if (result != oboe::Result::OK) {
        LOGE("Failed to open stream: %s", oboe::convertToText(result));
        return false;
    }

    result = mStream->requestStart();
    if (result != oboe::Result::OK) {
        LOGE("Failed to start stream: %s", oboe::convertToText(result));
        return false;
    }

    return true;
}

void AudioPlayer::stop() {
    if (mStream) {
        mStream->requestStop();
        mStream->close();
        mStream.reset();
    }
}

void AudioPlayer::feedAudio(const float* data, int numFrames) {
    if (!mRingBuffer.write(data, numFrames)) {
        LOGE("Ring buffer full! Dropping %d frames", numFrames);
    }
}

void AudioPlayer::interrupt() {
    mRingBuffer.clear();
    if (mStream) {
        mStream->requestFlush();
    }
}

oboe::DataCallbackResult AudioPlayer::onAudioReady(oboe::AudioStream *oboeStream, void *audioData, int32_t numFrames) {
    float *outputData = static_cast<float *>(audioData);
    
    // IMPORTANT: Lock-Free atomic read! No mutex!
    size_t framesRead = mRingBuffer.read(outputData, numFrames);
    
    // Fill the rest with silence to avoid garbage audio playback
    if (framesRead < (size_t)numFrames) {
        std::fill(outputData + framesRead, outputData + numFrames, 0.0f);
    }
    
    return oboe::DataCallbackResult::Continue;
}
