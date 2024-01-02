# this is just for editor support

cmake_minimum_required(VERSION 3.1...3.27)

project(
        duckdb_node
        VERSION 1.0
        LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 11)

include_directories(node_modules/node-addon-api/ src/duckdb/src/include /Users/hannes/Library/Caches/node-gyp/21.3.0/include/node)
add_library(duckdb_node src/duckdb_node.cpp)