# HOIST: the owner's audio plugin (from the Chaos_Grain repository, 2026-11-15) and HoistLayers, the offline renderer that turns a
# folder of dry stems into the game's seamless loops. Only HOIST is kept here; nothing else from Chaos_Grain.
#   cmake -S tools/hoist -B tools/hoist/build -DCMAKE_BUILD_TYPE=Release
#   cmake --build tools/hoist/build --target HoistLayers -j
#   tools/hoist/build/HoistLayers_artefacts/Release/HoistLayers <stemdir> <outdir> <set>    (sets: see Tools/HoistLayers.cpp)
# Linux needs: libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxext-dev libxcomposite-dev libfreetype-dev libasound2-dev
#              libgl1-mesa-dev. JUCE is downloaded at configure time (or -DFETCHCONTENT_SOURCE_DIR_JUCE=/path/to/JUCE).
cmake_minimum_required(VERSION 3.22)
project(Hoist VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13" CACHE STRING "")
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

include(FetchContent)
FetchContent_Declare(JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
    GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)

# the plugin (VST3 / AU), as in Chaos_Grain
juce_add_plugin(Hoist
    COMPANY_NAME "ChaosGrain"
    PRODUCT_NAME "Hoist"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    PLUGIN_MANUFACTURER_CODE Chgr
    PLUGIN_CODE Hst1
    FORMATS VST3 AU
    VST3_CATEGORIES Fx Modulation Reverb
    AU_MAIN_TYPE kAudioUnitType_Effect)
target_sources(Hoist PRIVATE
    Source/Hoist/HoistDSP.cpp
    Source/Hoist/HoistProcessor.cpp
    Source/Hoist/HoistEditor.cpp)
target_compile_definitions(Hoist PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)
target_link_libraries(Hoist
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)

# the game's renderer: dry stems through HOIST, cut to seamless loops of the band's length
juce_add_console_app(HoistLayers)
target_sources(HoistLayers PRIVATE Tools/HoistLayers.cpp)
target_include_directories(HoistLayers PRIVATE $<TARGET_PROPERTY:Hoist,INCLUDE_DIRECTORIES>)
target_compile_definitions(HoistLayers PRIVATE $<TARGET_PROPERTY:Hoist,COMPILE_DEFINITIONS>)
target_link_libraries(HoistLayers PRIVATE Hoist)
