//===----------------------------------------------------------------------===//
//                         DuckDB
//
// duckdb/common/arrow/arrow_types_extension.hpp
//
//
//===----------------------------------------------------------------------===//

#pragma once

#include "duckdb/common/common.hpp"
#include "duckdb/common/arrow/arrow.hpp"

namespace duckdb {

class ClientContext;

//! The OptimizerExtensionInfo holds static information relevant to the optimizer extension
struct ArrowTypesExtensionInfo {
	virtual ~ArrowTypesExtensionInfo() {
	}
};

:typedef void (*arrow_types_recognized_function_t)(OptimizerExtensionInput &input, unique_ptr<LogicalOperator> &plan);
typedef void (*arrow_types_format_function_t)(OptimizerExtensionInput &input, unique_ptr<LogicalOperator> &plan);
typedef void (*arrow_types_write_function_t)(OptimizerExtensionInput &input, unique_ptr<LogicalOperator> &plan);
typedef void (*arrow_types_read_function_t)(OptimizerExtensionInput &input, unique_ptr<LogicalOperator> &plan);

class ArrowTypesExtension {
public:
	//! The parse function of the parser extension.
	//! Takes a query string as input and returns ParserExtensionParseData (on success) or an error
	arrow_types_recognized_function_t is_valid_function;
	arrow_types_format_function_t format_function;
	arrow_types_read_function_t read_function;
	arrow_types_write_function_t write_function;

	//! Additional parser info passed to the functions
	shared_ptr<ArrowTypesExtensionInfo> info;
};

} // namespace duckdb
