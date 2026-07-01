cmake_minimum_required(VERSION 3.18.1)

project("anima_voice")

# Find React Native JSI
find_package(ReactAndroid REQUIRED)

# Import Oboe from prefab
find_package(oboe REQUIRED CONFIG)

add_library(
    anima_voice
    SHARED
    cpp-adapter.cpp
    AudioPlayer.cpp
)

target_include_directories(anima_voice PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

target_link_libraries(
    anima_voice
    oboe::oboe
    ReactAndroid::jsi
    ReactAndroid::react_nativemodule_core
    log
)
