import ExpoModulesCore

public class AnimaVoiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AnimaVoice")
    
    AsyncFunction("synthesizeNativeToPCM") { (text: String, lang: String, promise: Promise) in
      promise.reject("NOT_IMPLEMENTED", "synthesizeNativeToPCM is not implemented on iOS")
    }
  }
}
