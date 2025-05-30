"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustBridge = void 0;
const ffi_napi_1 = __importDefault(require("ffi-napi"));
const ref_napi_1 = __importDefault(require("ref-napi")); // Use ref-napi for type definitions
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// Define pointer types for C strings
const StringPtr = ref_napi_1.default.types.CString; // For strings passed to Rust
const ReturnedStringPtr = ref_napi_1.default.refType(StringPtr); // For strings returned by Rust (pointer to CString)
class RustBridge {
    lib;
    constructor() {
        try {
            this.lib = ffi_napi_1.default.Library(config_1.config.rustLibPath, {
                // Function signature: rust_function_name: [return_type, [arg1_type, arg2_type, ...]]
                'analyze_safety': [ReturnedStringPtr, [StringPtr, StringPtr]], // Takes two CStrings, returns a pointer to a CString
                'analyze_interpretability': [ReturnedStringPtr, [StringPtr]], // Takes one CString, returns a pointer to a CString
                'free_string': ['void', [ReturnedStringPtr]] // Takes a pointer to CString (that was returned by Rust)
            });
            logger_1.logger.info(`Rust library loaded successfully from: ${config_1.config.rustLibPath}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to load Rust library', { path: config_1.config.rustLibPath, error });
            // Fallback or mock implementation if library fails to load in dev/test
            if (config_1.config.env !== 'production') {
                logger_1.logger.warn("Rust library load failed. Using mock implementation for dev/test.");
                this.lib = this.getMockLib();
            }
            else {
                throw new Error(`Rust library initialization failed: ${error.message}`);
            }
        }
    }
    getMockLib() {
        return {
            analyze_safety: (textPtr, contextPtr) => {
                const text = ref_napi_1.default.readCString(textPtr, 0);
                const context = contextPtr.isNull() ? undefined : ref_napi_1.default.readCString(contextPtr, 0);
                logger_1.logger.debug(`Mock analyze_safety called with text: ${text?.substring(0, 30)}, context: ${context?.substring(0, 30)}`);
                const mockResult = {
                    safe: !text?.toLowerCase().includes("unsafe"),
                    score: text?.toLowerCase().includes("unsafe") ? 0.2 : 0.9,
                    violations: text?.toLowerCase().includes("unsafe") ? [{ type: 'harmful_content', severity: 'high', description: 'Mock unsafe content', evidence: [], confidence: 0.95 }] : [],
                    metadata: { analysisTime: 10, modelVersion: 'mock_rust_v0.1', timestamp: new Date().toISOString() }
                };
                const resultStr = JSON.stringify(mockResult);
                return ref_napi_1.default.allocCString(resultStr);
            },
            analyze_interpretability: (textPtr) => {
                const text = ref_napi_1.default.readCString(textPtr, 0);
                logger_1.logger.debug(`Mock analyze_interpretability called with text: ${text?.substring(0, 30)}`);
                const mockResult = {
                    tokens: text?.split(" ") || [],
                    featureImportance: { 'mock_token': 0.8 },
                    analysis_notes: ["Mock interpretability result from JS fallback."]
                };
                const resultStr = JSON.stringify(mockResult);
                return ref_napi_1.default.allocCString(resultStr);
            },
            free_string: (ptr) => {
                // Mock free does nothing as memory is JS managed for mock strings
                logger_1.logger.debug("Mock free_string called.");
            }
        };
    }
    async analyzeSafety(text, context) {
        logger_1.logger.debug(`Calling Rust analyze_safety for text (len: ${text.length})`);
        return this.invokeRustMethod('analyze_safety', text, context);
    }
    async analyzeInterpretability(text) {
        logger_1.logger.debug(`Calling Rust analyze_interpretability for text (len: ${text.length})`);
        return this.invokeRustMethod('analyze_interpretability', text);
    }
}
exports.RustBridge = RustBridge;
//# sourceMappingURL=rust_bridge.js.map