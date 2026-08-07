package com.iflytek.astron.console.hub.dto.publish.cbm;

import lombok.Data;

@Data
public class CbmResponse<T> {

    private int code;

    private String sid;

    private String message;

    private T data;

}
