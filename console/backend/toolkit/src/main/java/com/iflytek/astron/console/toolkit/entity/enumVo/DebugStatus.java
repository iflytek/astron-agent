package com.iflytek.astron.console.toolkit.entity.enumVo;

/**
 * RPA debug task status
 */
public enum DebugStatus {
    // Created locally
    CREATED,
    // Execution ID obtained
    SUBMITTED,
    // RPA PENDING (running)
    RUNNING,
    // RPA COMPLETED
    SUCCEEDED,
    // RPA FAILED or local failure
    FAILED,
    // Reserved for future cancellation support
    CANCELED,
    // Retry after query failure
    RETRYING,
    // Timeout
    TIMEOUT
}
