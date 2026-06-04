# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.runtime.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Add any project specific keep options here:

# Prevent R8 from stripping JNI bindings for local AI models
-keep class com.rnwhisper.** { *; }
-keep class com.rnllama.** { *; }
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keep class com.sherpaonnx.** { *; }
-keep class com.christeck.aidiary.** { *; }
-keep class com.margelo.nitro.** { *; }

# pdfbox-android missing classes exception for R8 release build
-dontwarn com.gemalto.jp2.**
-dontwarn com.tom_roush.pdfbox.**
-keep class com.tom_roush.pdfbox.** { *; }
-keep class org.apache.fontbox.** { *; }

# Prevent R8 from stripping expo-secure-store native module (prevents silent null returns in release)
-keep class expo.modules.securestore.** { *; }
