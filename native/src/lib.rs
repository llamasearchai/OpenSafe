use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use serde::Serialize;
use once_cell::sync::Lazy;
use std::sync::Mutex;

mod safety;
mod interpretability;

use safety::SafetyAnalyzer;
use interpretability::InterpretabilityAnalyzer;

static SAFETY_ANALYZER: Lazy<Mutex<SafetyAnalyzer>> = Lazy::new(|| {
    Mutex::new(SafetyAnalyzer::new())
});

static INTERPRETABILITY_ANALYZER: Lazy<Mutex<InterpretabilityAnalyzer>> = Lazy::new(|| {
    Mutex::new(InterpretabilityAnalyzer::new())
});

#[no_mangle]
pub extern "C" fn analyze_safety(text: *const c_char, context: *const c_char) -> *mut c_char {
    let text_str = unsafe {
        if text.is_null() {
            return std::ptr::null_mut();
        }
        CStr::from_ptr(text).to_string_lossy()
    };
    
    let context_str = unsafe {
        if context.is_null() {
            None
        } else {
            Some(CStr::from_ptr(context).to_string_lossy())
        }
    };

    let analyzer = match SAFETY_ANALYZER.lock() {
        Ok(analyzer) => analyzer,
        Err(_) => return std::ptr::null_mut(),
    };
    
    let result = analyzer.analyze(&text_str, context_str.as_deref());
    
    match serde_json::to_string(&result) {
        Ok(json) => match CString::new(json) {
            Ok(cstring) => cstring.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn analyze_interpretability(text: *const c_char) -> *mut c_char {
    let text_str = unsafe {
        if text.is_null() {
            return std::ptr::null_mut();
        }
        CStr::from_ptr(text).to_string_lossy()
    };

    let analyzer = match INTERPRETABILITY_ANALYZER.lock() {
        Ok(analyzer) => analyzer,
        Err(_) => return std::ptr::null_mut(),
    };
    
    let result = analyzer.analyze(&text_str);
    
    match serde_json::to_string(&result) {
        Ok(json) => match CString::new(json) {
            Ok(cstring) => cstring.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn free_string(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    unsafe {
        let _ = CString::from_raw(s);
    }
} 