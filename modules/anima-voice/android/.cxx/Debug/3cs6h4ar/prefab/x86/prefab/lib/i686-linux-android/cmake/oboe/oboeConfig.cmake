if(NOT TARGET oboe::oboe)
add_library(oboe::oboe SHARED IMPORTED)
set_target_properties(oboe::oboe PROPERTIES
    IMPORTED_LOCATION "C:/Users/Chris/.gradle/caches/transforms-4/824f0ddbf688790dc4580d25e6051bb4/transformed/oboe-1.8.0/prefab/modules/oboe/libs/android.x86/liboboe.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Chris/.gradle/caches/transforms-4/824f0ddbf688790dc4580d25e6051bb4/transformed/oboe-1.8.0/prefab/modules/oboe/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

