#pragma once

#include <oboe/Oboe.h>
#include <vector>
#include <mutex>
#include <atomic>

template <typename T>
class LockFreeRingBuffer {
private:
    std::vector<T> buffer;
    std::atomic<size_t> head;
    std::atomic<size_t> tail;
    size_t capacity;

public:
    LockFreeRingBuffer(size_t size) : capacity(size + 1), buffer(size + 1), head(0), tail(0) {}

    bool write(const T* data, size_t count) {
        size_t current_tail = tail.load(std::memory_order_relaxed);
        size_t current_head = head.load(std::memory_order_acquire);
        
        size_t available = (current_head - current_tail - 1 + capacity) % capacity;
        if (available < count) return false;

        for (size_t i = 0; i < count; ++i) {
            buffer[(current_tail + i) % capacity] = data[i];
        }

        tail.store((current_tail + count) % capacity, std::memory_order_release);
        return true;
    }

    size_t read(T* data, size_t count) {
        size_t current_head = head.load(std::memory_order_relaxed);
        size_t current_tail = tail.load(std::memory_order_acquire);
        
        size_t available = (current_tail - current_head + capacity) % capacity;
        size_t to_read = std::min(count, available);

        for (size_t i = 0; i < to_read; ++i) {
            data[i] = buffer[(current_head + i) % capacity];
        }

        head.store((current_head + to_read) % capacity, std::memory_order_release);
        return to_read;
    }

    void clear() {
        head.store(0, std::memory_order_relaxed);
        tail.store(0, std::memory_order_release);
    }
};

class AudioPlayer : public oboe::AudioStreamDataCallback {
public:
    AudioPlayer();
    ~AudioPlayer();

    bool start();
    void stop();
    void feedAudio(const float* data, int numFrames);
    void interrupt();

    oboe::DataCallbackResult onAudioReady(oboe::AudioStream *oboeStream, void *audioData, int32_t numFrames) override;

private:
    std::shared_ptr<oboe::AudioStream> mStream;
    
    // Lock-Free Ring Buffer to prevent audio thread blocking
    // 5,000,000 frames is ~200 seconds of audio at 24kHz
    LockFreeRingBuffer<float> mRingBuffer{5000000}; 
};
