"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAction = exports.SafetyMode = exports.UserRole = exports.ViolationType = void 0;
var ViolationType;
(function (ViolationType) {
    ViolationType["HARMFUL_CONTENT"] = "harmful_content";
    ViolationType["BIAS"] = "bias";
    ViolationType["PRIVACY"] = "privacy";
    ViolationType["PII_DETECTED"] = "pii_detected";
    ViolationType["MISINFORMATION"] = "misinformation";
    ViolationType["MANIPULATION"] = "manipulation";
    ViolationType["ILLEGAL_CONTENT"] = "illegal_content";
    ViolationType["PROFANITY"] = "profanity";
    ViolationType["SELF_HARM"] = "self_harm";
    ViolationType["HATE_SPEECH"] = "hate_speech";
    ViolationType["POLICY_VIOLATION"] = "policy_violation";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["RESEARCHER"] = "researcher";
    UserRole["ADMIN"] = "admin";
    UserRole["SERVICE"] = "service";
})(UserRole || (exports.UserRole = UserRole = {}));
var SafetyMode;
(function (SafetyMode) {
    SafetyMode["Strict"] = "strict";
    SafetyMode["Balanced"] = "balanced";
    SafetyMode["Permissive"] = "permissive";
})(SafetyMode || (exports.SafetyMode = SafetyMode = {}));
var PolicyAction;
(function (PolicyAction) {
    PolicyAction["BLOCK"] = "block";
    PolicyAction["FLAG"] = "flag";
    PolicyAction["REDACT"] = "redact";
    PolicyAction["REVISE"] = "revise";
    PolicyAction["ESCALATE"] = "escalate";
    PolicyAction["LOG_ONLY"] = "log_only";
})(PolicyAction || (exports.PolicyAction = PolicyAction = {}));
//# sourceMappingURL=types.js.map