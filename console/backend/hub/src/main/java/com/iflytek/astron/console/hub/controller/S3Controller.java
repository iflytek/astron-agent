package com.iflytek.astron.console.hub.controller;

import cn.hutool.core.util.RandomUtil;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/s3")
@RequiredArgsConstructor
@Validated
public class S3Controller {

    private final S3ClientUtil s3ClientUtil;

    @GetMapping("/presign")
    public ApiResult<PresignResp> presignPut(@RequestParam("objectKey") String objectKey, @RequestParam(value = "contentType", required = false) String contentType) {
        // contentType is only used by frontend to set request headers, not involved in signature
        String uid = RequestContextUtil.getUID();
        String bucket = s3ClientUtil.getDefaultBucket();
        String fileName = uid + "_" + RandomUtil.randomString(6) + new java.io.File(objectKey).getName();
        int expiry = s3ClientUtil.getPresignExpirySeconds();
        String url = s3ClientUtil.generatePresignedPutUrl(bucket, fileName, expiry);
        return ApiResult.success(new PresignResp(url, bucket, fileName));
    }

    @Data
    @AllArgsConstructor
    public static class PresignResp {
        private String url;
        private String bucket;
        private String objectKey;
    }
}
