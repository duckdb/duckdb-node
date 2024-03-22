
namespace duckdb {

struct ICUForward {

	void (*func)(ClientContext &, TableFunctionInput &, DataChunk &);
	unique_ptr<FunctionData> (*bind_func)(ClientContext &context, TableFunctionBindInput &input,
	                                      vector<LogicalType> &return_types, vector<string> &names);
	unique_ptr<GlobalTableFunctionState> (*init_func)(ClientContext &context, TableFunctionInitInput &input);

	func myFunc = nullptr;
	bind_func myBind1 = nullptr;
	bind_func myBind2 = nullptr;
	init_func myInit = nullptr;

	static void ICUTableRangeFunction(ClientContext &context, TableFunctionInput &data_p, DataChunk &output) {
		if (!TryAutoLoad(context, "icu")) {
			throw ExtensionExcetion("NOOOO");
		}
		(*myFunc)(context, data_p, output);
	}

	template <bool GENERATE_SERIES>
	static unique_ptr<FunctionData> Bind(ClientContext &context, TableFunctionBindInput &input,
	                                     vector<LogicalType> &return_types, vector<string> &names) {
		if (!TryAutoLoad(context, "icu")) {
			throw ExtensionExcetion("NOOOO");
		}
		if (GENERATE_SERIES)
			return (*myBind1)(context, input, return_types, names);
		else
			return (*myBind2)(context, input, return_types, names);
	}

	static unique_ptr<GlobalTableFunctionState> Init(ClientContext &context, TableFunctionInitInput &input) {
		if (!TryAutoLoad(context, "icu")) {
			throw ExtensionExcetion("NOOOO");
		}
		return (*myInit)(context, input);
	}

	static void AddICUTableRangeFunction(ClientContext &context) {
		auto &catalog = Catalog::GetSystemCatalog(context);

		TableFunctionSet range("range");
		range.AddFunction(TableFunction({LogicalType::TIMESTAMP_TZ, LogicalType::TIMESTAMP_TZ, LogicalType::INTERVAL},
		                                ICUTableRangeFunction, Bind<false>, Init));
		CreateTableFunctionInfo range_func_info(range);
		catalog.AddFunction(context, range_func_info);

		// generate_series: similar to range, but inclusive instead of exclusive bounds on the RHS
		TableFunctionSet generate_series("generate_series");
		generate_series.AddFunction(
		    TableFunction({LogicalType::TIMESTAMP_TZ, LogicalType::TIMESTAMP_TZ, LogicalType::INTERVAL},
		                  ICUTableRangeFunction, Bind<true>, Init));
		CreateTableFunctionInfo generate_series_func_info(generate_series);
		catalog.AddFunction(context, generate_series_func_info);
	}
}
