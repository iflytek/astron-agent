package com.iflytek.astron.console.hub.util.wechat;

@SuppressWarnings("serial")
public class AesException extends Exception {

    public final static int OK = 0;
    public final static int ValidateSignatureError = -40001;
    public final static int ParseXmlError = -40002;
    public final static int ComputeSignatureError = -40003;
    public final static int IllegalAesKey = -40004;
    public final static int ValidateAppidError = -40005;
    public final static int EncryptAESError = -40006;
    public final static int DecryptAESError = -40007;
    public final static int IllegalBuffer = -40008;

    private int code;

    private static String getMessage(int code) {
        switch (code) {
            case ValidateSignatureError:
                return "Signature validation error";
            case ParseXmlError:
                return "XML parsing failed";
            case ComputeSignatureError:
                return "SHA encryption signature generation failed";
            case IllegalAesKey:
                return "Illegal AES key";
            case ValidateAppidError:
                return "AppId validation failed";
            case EncryptAESError:
                return "AES encryption failed";
            case DecryptAESError:
                return "AES decryption failed";
            case IllegalBuffer:
                return "Illegal buffer after decryption";
            default:
                return null;
        }
    }

    public int getCode() {
        return code;
    }

    AesException(int code) {
        super(getMessage(code));
        this.code = code;
    }
}
