# CMakeLists.txt for 16 KB page alignment support

cmake_minimum_required(VERSION 3.22.1)

project("profieldmanager")

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add 16 KB page alignment linker flags for Google Play compatibility
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,-z,max-page-size=16384")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-z,max-page-size=16384")

# Create a minimal native library (placeholder for future native code)
add_library(
    native-lib
    SHARED
    native-lib.cpp
)

# Link against Android libraries
find_library(
    log-lib
    log
)

target_link_libraries(
    native-lib
    ${log-lib}
)