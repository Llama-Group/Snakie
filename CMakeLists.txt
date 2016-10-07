
cmake_minimum_required (VERSION 2.8)

project (Snakie)

#
# Checking environment
#

include(CheckCXXCompilerFlag)
CHECK_CXX_COMPILER_FLAG("-std=c++0x" COMPILER_SUPPORTS_CXX0X)
CHECK_CXX_COMPILER_FLAG("-std=c++11" COMPILER_SUPPORTS_CXX11)
CHECK_CXX_COMPILER_FLAG("-std=c++1z" COMPILER_SUPPORTS_CXX1Z)
if(COMPILER_SUPPORTS_CXX1Z)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++1z")
    set(COVERAGE_FLAGS "-std=c++1z -g -O0 -fprofile-arcs -ftest-coverage")
elseif(COMPILER_SUPPORTS_CXX11)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
    set(COVERAGE_FLAGS "-std=c++11 -g -O0 -fprofile-arcs -ftest-coverage")
elseif(COMPILER_SUPPORTS_CXX0X)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++0x")
    set(COVERAGE_FLAGS "-std=c++0x -g -O0 -fprofile-arcs -ftest-coverage")
else()
    message(STATUS "The compiler ${CMAKE_CXX_COMPILER} has no C++11 support. Please use a different C++ compiler.")
endif()

#
# Setting variables
#

set(PROJECT_ROOT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")

set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${PROJECT_ROOT_DIRECTORY}/../lib_snakie")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_ROOT_DIRECTORY}/../../bin_snakie")
set(CMAKE_SOURCE_DIR "${PROJECT_ROOT_DIRECTORY}")
set(CMAKE_INCLUDE_DIR "${PROJECT_ROOT_DIRECTORY}")

include_directories(${CMAKE_INCLUDE_DIR}/)
include_directories(${PROJECT_ROOT_DIRECTORY}/../../Project-Hamster/include/)

file(GLOB_RECURSE SOURCE_FILES ${CMAKE_SOURCE_DIR}/*.cpp)
file(GLOB_RECURSE HEADER_FILES ${CMAKE_INCLUDE_DIR}/*.h)

source_group("Headers" FILES ${HEADER_FILES})

#
# Build targets
#
add_executable(snakie ${SOURCE_FILES})
target_link_libraries(snakie ${PROJECT_ROOT_DIRECTORY}/../../build_hamster/libhamster.a)

