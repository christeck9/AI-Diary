@echo off
"C:\\Users\\Chris\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\cmake.exe" ^
  "-HC:\\AI-Diary\\modules\\anima-voice\\android\\src\\main\\cpp" ^
  "-DCMAKE_SYSTEM_NAME=Android" ^
  "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON" ^
  "-DCMAKE_SYSTEM_VERSION=26" ^
  "-DANDROID_PLATFORM=android-26" ^
  "-DANDROID_ABI=armeabi-v7a" ^
  "-DCMAKE_ANDROID_ARCH_ABI=armeabi-v7a" ^
  "-DANDROID_NDK=C:\\Users\\Chris\\AppData\\Local\\Android\\Sdk\\ndk\\26.1.10909125" ^
  "-DCMAKE_ANDROID_NDK=C:\\Users\\Chris\\AppData\\Local\\Android\\Sdk\\ndk\\26.1.10909125" ^
  "-DCMAKE_TOOLCHAIN_FILE=C:\\Users\\Chris\\AppData\\Local\\Android\\Sdk\\ndk\\26.1.10909125\\build\\cmake\\android.toolchain.cmake" ^
  "-DCMAKE_MAKE_PROGRAM=C:\\Users\\Chris\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\ninja.exe" ^
  "-DCMAKE_CXX_FLAGS=-std=c++20 -fexceptions -frtti" ^
  "-DCMAKE_LIBRARY_OUTPUT_DIRECTORY=C:\\AI-Diary\\modules\\anima-voice\\android\\build\\intermediates\\cxx\\Debug\\3cs6h4ar\\obj\\armeabi-v7a" ^
  "-DCMAKE_RUNTIME_OUTPUT_DIRECTORY=C:\\AI-Diary\\modules\\anima-voice\\android\\build\\intermediates\\cxx\\Debug\\3cs6h4ar\\obj\\armeabi-v7a" ^
  "-DCMAKE_BUILD_TYPE=Debug" ^
  "-DCMAKE_FIND_ROOT_PATH=C:\\AI-Diary\\modules\\anima-voice\\android\\.cxx\\Debug\\3cs6h4ar\\prefab\\armeabi-v7a\\prefab" ^
  "-BC:\\AI-Diary\\modules\\anima-voice\\android\\.cxx\\Debug\\3cs6h4ar\\armeabi-v7a" ^
  -GNinja ^
  "-DANDROID_STL=c++_shared"
